'use strict';

//contrib
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
const winston = require('winston');
const crypto = require('crypto');

//mine
const config = require('../config');
const logger = new winston.Logger(config.logger.winston);


exports.init = function(cb) {
    if(config.debug) mongoose.set('debug', true);
    mongoose.connect(config.mongodb.url, config.mongodb.params, function(err) {
        if(err) return cb(err);
        cb();
    });
}

exports.disconnect = function(cb) {
    mongoose.disconnect(cb);
}

///////////////////////////////////////////////////////////////////////////////////////////////////

var researchSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    //
    IIBISID: {type: String, index: true}, //like.. 2016-00001
    Modality: {type: String, index: true},  //like.. PT
    StationName: {type: String}, //like.. CT71271
    radio_tracer: {type: String}
    ///////////////////////////////////////////////////////////////////////////
});
researchSchema.index({IIBISID: 1, Modality: 1});
exports.Research = mongoose.model('Research', researchSchema);

var examSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    research_id: {type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Research'},
    subject: {type: String}, //not set if it's template

    StudyInstanceUID: {type: String, index: true},
    override_template_id: {type: mongoose.Schema.Types.ObjectId},  // _id of template exam if override is set
    isdeleted: {type: Boolean,default: false},
    istemplate: {type: Boolean},
    template_name: {type: String, default: ''},
    converted_to_template: {type: Boolean, default: false}, // set this to TRUE if exam is added as a template
    parent_exam_id:{type: mongoose.Schema.Types.ObjectId}, // only set if an exam is converted into a template through the portal; this is the id of the original exam
    StudyTimestamp: Date,
    //series: mongoose.Schema.Types.Mixed,
    qc: mongoose.Schema.Types.Mixed,

    comments: [ mongoose.Schema({
        title: String,
        user_id: String, //req.user.sub
        comment: String,
        date: {type: Date, default: Date.now},
    }) ],
});
examSchema.index({research_id: 1, StudyInstanceUID:1});
exports.Exam = mongoose.model('Exam', examSchema);


var deletedexamSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    research_id: {type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Research'},
    subject: {type: String}, //not set if it's template

    StudyInstanceUID: {type: String, index: true},

    istemplate: {type: Boolean},
    StudyTimestamp: Date,

    DeletionTimestamp: {type: Date, default: Date.now},
    //series: mongoose.Schema.Types.Mixed,
    qc: mongoose.Schema.Types.Mixed,

    comments: [ mongoose.Schema({
        title: String,
        user_id: String, //req.user.sub
        comment: String,
        date: {type: Date, default: Date.now},
    }) ],
});
deletedexamSchema.index({research_id: 1, StudyInstanceUID:1});
exports.Deletedexam = mongoose.model('Deletedexam', deletedexamSchema);



//counter part for "series"
var templateSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////

    //research_id: {type: mongoose.Schema.Types.ObjectId, index: true},
    exam_id: {type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Exam'},
    series_desc: {type: String}, //original SeriesDescription minut anything after ^
    SeriesNumber: {type: Number},
    primary_image: {type: mongoose.Schema.Types.ObjectId, index: true},
    deprecated_by: {type: mongoose.Schema.Types.ObjectId},
    count: Number, //number of images in a given series
    events: [ mongoose.Schema({
        service_id: String, //if event was performeed by a system, this is set
        user_id: String, //if event was performed by a user, this is set to req.user.sub
        title: String,
        detail: mongoose.Schema.Types.Mixed,
        date: {type: Date, default: Date.now},
    }) ],
    //date: Date, //date when this template is received (probabbly use StudyTimestamp of the template?) //TODO - maybe needed since we have exam collection now?
}, {timestamps: {createdAt: 'createdAt', updatedAt: 'updatedAt'}});
templateSchema.index({exam_id: 1, primary_image:1});
exports.Template = mongoose.model('Template', templateSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var templateHeaderSchema = mongoose.Schema({

    template_id: {type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Template'},
    InstanceNumber: {type: Number},
    EchoNumbers: {type: Number},
    SOPInstanceUID : {type: String, index: true},

    headers: mongoose.Schema.Types.Mixed,
    primary_image: {type: mongoose.Schema.Types.ObjectId, index: true,  ref: 'TemplateHeader'}
});
templateHeaderSchema.index({template_id: 1, SOPInstanceUID: 1, primary_image: 1});
exports.TemplateHeader = mongoose.model('TemplateHeader', templateHeaderSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var handlerSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////

    handler_id: {type: mongoose.Schema.Types.ObjectId, index: true},
    scope: {type: String, index: true},
    modality: {type: String, index: true},
    series: {type: String, index: true},

    handlers: mongoose.Schema.Types.Mixed,
    notes: mongoose.Schema.Types.Mixed,
    lastEdit: {type: Date, default: Date.now}
});
handlerSchema.index({handler_id: 1, scope: 1, modality: 1, series: 1});
exports.Handler = mongoose.model('Handler', handlerSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var seriesSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////

    exam_id: {type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Exam'},
    series_desc: {type: String, index: true}, //original SeriesDescription minut anything after ^
    SeriesNumber: {type: Number}, //some study has repeated series
    deprecated_by: {type: mongoose.Schema.Types.ObjectId},
    override_template_id: {type: mongoose.Schema.Types.ObjectId, index: true},  // template_id to use for qc

    isexcluded: Boolean,
    primary_image: {type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Image'},

    qc: mongoose.Schema.Types.Mixed, //has to be Mixed so that mongoose will let me set to null
    qc1_state: String, //(null), fail, autopass, accept, reject
    qc2_state: String, //(null), accept, condaccept, reject

    events: [ mongoose.Schema({
        service_id: String, //if event was performeed by a system, this is set
        user_id: String, //if event was performed by a user, this is set to req.user.sub
        title: String,
        detail: mongoose.Schema.Types.Mixed,
        date: {type: Date, default: Date.now},
    }) ],

    comments: [ mongoose.Schema({
        user_id: String, //req.user.sub
        comment: String,
        date: {type: Date, default: Date.now},
    }) ],
}, {timestamps: {createdAt: 'createdAt', updatedAt: 'updatedAt'}, strict: false});

seriesSchema.index({exam_id: 1, primary_image:1, series_desc: 1});
exports.Series = mongoose.model('Series', seriesSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var imageSchema = mongoose.Schema({

    ///////////////////////////////////////////////////////////////////////////////////////////////

    series_id: {type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Series'},
    SOPInstanceUID : {type: String, index: true},

    InstanceNumber: {type: Number},
    EchoNumbers: {type: Number},

    //the actual headers for this instance (cleaned)
    headers: mongoose.Schema.Types.Mixed,

    qc: mongoose.Schema.Types.Mixed,
    primary_image:  {type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Image'}
});
imageSchema.index({series_id: 1, SOPInstanceUID: 1, primary_image:1});
exports.Image = mongoose.model('Image', imageSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var dataflowSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    //
    // keys
    //
    date: Date,
    iibis: String,
    modality: String,
    station_name: String,
    radio_tracer: String,
    subject: String,
    series: [
        {
            series_number: Number,
            series_name: String,
            image_count: Number
        }
    ]

});
dataflowSchema.index({iibis: 1, date: 1});
exports.Dataflow = mongoose.model('Dataflow', dataflowSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var iibisSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    //
    // keys
    //

    area_of_study: String,
    co_pi: String,
    coordinator_email: String,
    department: String,
    email_address: String,
    end_date: {type: Date},
    full_title: String,
    iibis_project_id: String,
    location: String,
    modality_or_laboratory: String,
    mri_scan_time: String,
    pi_first_name: String,
    pi_last_name: String,
    project_coordinator_or_contact: String,
    project_status: String,
    research_type: String,
    short_title: String,
    start_date: {type: Date},
    study_type: String,
    tracer: String
});

iibisSchema.index({iibis_project_id: 1});
exports.IIBIS = mongoose.model('IIBIS', iibisSchema, 'iibis');

///////////////////////////////////////////////////////////////////////////////////////////////////


var userSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////
    username: { type: String, index: {unique: true}},
    createDate: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: Date.now },
    roles: [String],
    primary_role: String,
    fullname: String,
    email: String,
    active: {type: Boolean, default: true},
    prefs: mongoose.Schema.Types.Mixed,
    hash: String,
    salt: String,
});

userSchema.methods.setPassword = function(password) {
    this.salt = crypto.randomBytes(16).toString('hex');
    this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

userSchema.methods.validatePassword = function(password) {
    const hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
    return this.hash === hash;
};

exports.User  = mongoose.model('User', userSchema);


///////////////////////////////////////////////////////////////////////////////////////////////////


var groupSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////
    name: { type: String, index: {unique: true}},
    desc: String,
    members: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    active: {type: Boolean, default: true},

}, {timestamps: {createdAt: 'createdAt', updatedAt: 'updatedAt'}, strict: false});


groupSchema.statics.getUserGroups = function(user, cb) {
    this.find({members: user.id}, function(err, groups) {
        if(err) return cb(err, null);
        var gids = [];
        groups.forEach(function(group) {
            gids.push(group.id);
        });
        logger.error(`User ${user.username} has group memberships in ${gids}`);
        cb(null, gids);
    })
};

exports.Group  = mongoose.model('Group', groupSchema);


///////////////////////////////////////////////////////////////////////////////////////////////////


var aclSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //key
    //SOPInstanceUID: String,
    // key: {type: String, index: true},
    IIBISID: {type: String, index: true},
    qc: {
        users: [String],
        groups: [String]
    },
    view: {
        users: [String],
        groups: [String]
    }
    //
    //////////////////////////////////////////////////////////////////////////////////////////////
    // value: mongoose.Schema.Types.Mixed,
});

//return true if user can do action on iibisid
aclSchema.statics.can = function(user, action, iibisid, cb) {

    logger.error(`Checking to see if user ${user.profile.username} can do ${action} on ${iibisid}`);

    this.findOne({IIBISID: iibisid}, function(err, acl) {
        if(err) return cb(err);
        var _acl = acl[action];
        if(_acl) {
            for (let gid of user.gids) {
                if (~_acl.groups.indexOf(gid)) {
                    logger.error(`Group match ${gid} for action ${action}!`);
                    cb(true);
                    return;
                }
            }
            if(~_acl.users.indexOf(user.sub)) {
                logger.error(`Sub match for action ${action}!`);
                cb(true);
                return;
            }
            cb(false);
            return;
        }
    });
    // this.getCan(user, action, function(err, iibisids) {
    //     cb(~iibisids.indexOf(iibisid));
    // });
};

//get all iibisids that user has access to
aclSchema.statics.getCan = function(user, action, cb) {
    var iibisids = [];
    this.find({}, function(err, acls){
        if(err) return cb(err);
        if(acls) for(let acl of acls) {
            var _acl = acl[action];
            if(_acl) {
                // console.log(_acl.groups);
                var inter = _acl.groups.filter(function(gid) {
                    return ~user.gids.indexOf(gid);
                });
                if(~_acl.users.indexOf(user.sub) || inter.length > 0) {
                    iibisids.push(acl.IIBISID);
                }
            }
        }
        cb(null, iibisids);
    });
};

//get all iibisids that user has access to
// aclSchema.statics.getCan = function(user, action, cb) {
//     this.findOne({key: 'iibisid'}, function(err, acl) {
//         if(err) return cb(err);
//         var iibisids = [];
//         if(acl) for(var iibisid in acl.value) {
//             var _acl = acl.value[iibisid][action];
//             if(_acl) {
//                 //if(acl.value[iibisid][action].groups) {
//                 var inter = _acl.groups.filter(function(gid) {
//                     return ~user.gids.indexOf(gid);
//                 });
//                 if(~_acl.users.indexOf(user.sub) || inter.length > 0) {
//                     iibisids.push(iibisid);
//                 }
//             }
//         }
//         cb(null, iibisids);
//     });
// }


///////
exports.Acl = mongoose.model('Acl', aclSchema);



///////////////////////////////////////////////////////////////////////////////////////////////////


var ingestSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    createDate: { type: Date, default: Date.now },
    path: String,
    studyname: String,
    subject: String,
    status: String,
    files_ingested: Number
});

exports.Ingest  = mongoose.model('Ingest', ingestSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////


var qckeywordSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////
    key: String,
    skip: {type: Boolean,default:false},
    custom: {type: Boolean,default:false},
    modality: String,
},{timestamps: {createdAt: 'createdAt', updatedAt: 'updatedAt'}, strict: false});


exports.QCkeyword  = mongoose.model('QCkeyword', qckeywordSchema);
