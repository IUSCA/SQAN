'use strict';

//contrib
const mongoose = require('mongoose');
const winston = require('winston');

//mine
const config = require('../config');
const logger = new winston.Logger(config.logger.winston);
//const events = require('./events');

//var sequelize = new Sequelize('database', 'username', 'password', config.sequelize);
exports.init = function(cb) {
    if(config.debug) mongoose.set('debug', true);
    mongoose.connect(config.mongodb, {
        useMongoClient: true
    }, function(err) {
        if(err) return cb(err);
        console.log("connected to mongo");
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
    // keys
    //
    IIBISID: {type: String, index: true}, //like.. 2016-00001
    Modality: {type: String, index: true},  //like.. PT
    StationName: {type: String, index: true}, //like.. CT71271
    radio_tracer: {type: String, index: true}, //like DOTA NOC (from RadiopharmaceuticalInformationSequence.Radiopharmaceutical - only used for CT)
    //
    ///////////////////////////////////////////////////////////////////////////
});
researchSchema.index({IIBISID: 1, Modality: 1, StationName: 1, radio_tracer: 1});
exports.Research = mongoose.model('Research', researchSchema);

var examSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    //
    // keys
    //
    research_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    subject: {type: String, index: true}, //not set if it's template
    date: {type: Date, index: true}, //date when this template is received (probabbly use StudyTimestamp of the template?)
    //
    //
    ///////////////////////////////////////////////////////////////////////////
    
    ///////////////////////////////////////////////////////////////////////////
    //
    //foreign key to assist lookup
    //
    IIBISID: {type: String, index: true},//make it easier to do access control

    istemplate: Boolean,

    comments: [ mongoose.Schema({
        user_id: String, //req.user.sub
        comment: String,
        date: {type: Date, default: Date.now},
    }) ],
});
examSchema.index({research_id: 1, subject: 1, date: 1});
exports.Exam = mongoose.model('Exam', examSchema);

//counter part for "series"
var templateSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    //
    // keys
    //
    research_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    exam_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    series_desc: {type: String, index: true}, //original SeriesDescription minut anything after ^
    SeriesNumber: {type: Number, index: true},
    //
    ///////////////////////////////////////////////////////////////////////////
    
    ///////////////////////////////////////////////////////////////////////////
    //
    //foreign key to assist lookup
    //
    IIBISID: {type: String, index: true},//make it easier to do access control
    Modality: {type: String, index: true},  //like.. PT
    
    count: Number, //number of images in a given series
    date: Date, //date when this template is received (probabbly use StudyTimestamp of the template?) //TODO - maybe needed since we have exam collection now?
});
templateSchema.index({research_id: 1, exam_id: 1, series_desc: 1, SeriesNumber: 1});
exports.Template = mongoose.model('Template', templateSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var templateHeaderSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    //
    // keys
    //
    template_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    AcquisitionNumber: {type: Number, index: true},
    InstanceNumber: {type: Number, index: true},
    EchoNumbers: {type: Number, index: true},
    //
    ///////////////////////////////////////////////////////////////////////////

    IIBISID: {type: String, index: true},//make it easier to do access control
    
    headers: mongoose.Schema.Types.Mixed, 
});
templateHeaderSchema.index({template_id: 1, AcquisitionNumber: 1, InstanceNumber: 1});
exports.TemplateHeader = mongoose.model('TemplateHeader', templateHeaderSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var handlerSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    //
    // keys
    //
    handler_id: {type: mongoose.Schema.Types.ObjectId, index: true},
    scope: {type: String, index: true},
    modality: {type: String, index: true},
    series: {type: String, index: true},
    //
    ///////////////////////////////////////////////////////////////////////////

    handlers: mongoose.Schema.Types.Mixed,
    notes: mongoose.Schema.Types.Mixed,
    lastEdit: {type: Date, default: Date.now}
});
handlerSchema.index({handler_id: 1, scope: 1, modality: 1, series: 1});
exports.Handler = mongoose.model('Handler', handlerSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var seriesSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    //
    // keys
    //
    research_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    exam_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    series_desc: {type: String, index: true}, //original SeriesDescription minut anything after ^
    SeriesNumber: {type: Number, index: true}, //some study has repeated series
    //
    ///////////////////////////////////////////////////////////////////////////
    
    ///////////////////////////////////////////////////////////////////////////
    //
    //foreign key/value to assist lookup
    //
    Modality: {type: String, index: true}, //like.. PT
    StudyTimestamp: {type: Date, index: true},
    IIBISID: {type: String, index: true}, //for easy access control

    //TODO - redundant with exam_id?
    subject: String,
    StudyInstanceUID: String, //StudyInstanceUID alone can not uniquely identify a "study" as I understand it. 

    ///////////////////////////////////////////////////////////////////////////

    //if set, that means there is another series with higher SeriesNumber that deprecate this series
    //QC view only shows series where this field is not set
    deprecated_by: mongoose.Schema.Types.ObjectId, 

    //qc.series.isExcluded(h.Modality, h.qc_series_desc)
    isexcluded: Boolean,

    //template to use for QC (if not set, the latest set will be used)
    template_exam_id: {type: mongoose.Schema.Types.ObjectId, index: true},

    //study first received
    create_date: {type: Date, default: Date.now},

    //study level qc result 
    qc: mongoose.Schema.Types.Mixed, //has to be Mixed so that mongoose will let me set to null
    qc1_state: String, //(null), fail, autopass, accept, reject
    qc2_state: String, //(null), accept, condaccept, reject

    events: [ mongoose.Schema({
        service_id: String, //if event was performeed by a system, this is set
        user_id: String, //if event was performed by a user, this is set to req.user.sub
        title: String,
        detail: String,
        date: {type: Date, default: Date.now},
    }) ],

    comments: [ mongoose.Schema({
        user_id: String, //req.user.sub
        comment: String,
        date: {type: Date, default: Date.now},
    }) ],
}, {strict: false});
//these hooks are too unreliable / non-useful (I will do the event posting from controller..)
//seriesSchema.post('save', events.series);
//seriesSchema.post('findOneAndUpdate', events.series);
//seriesSchema.post('update', events.series); //'update' doesn't pass object
//seriesSchema.post('findOneAndRemove', events.series);
//seriesSchema.post('remove', events.series);

seriesSchema.index({research_id: 1, exam_id: 1, series_desc: 1, SeriesNumber: 1});
exports.Series = mongoose.model('Series', seriesSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////
///
var acquisitionSchema = mongoose.Schema({

    ///////////////////////////////////////////////////////////////////////////
    //
    // keys
    //
    //study that this aq belongs to
    series_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    AcquisitionNumber: {type: Number, index: true},
    //
    ///////////////////////////////////////////////////////////////////////////
    
    ///////////////////////////////////////////////////////////////////////////
    //
    //foreign key to assist lookup
    //
    research_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    exam_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    series_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
});
acquisitionSchema.index({research_id: 1, exam_id: 1, series_id: 1});
exports.Acquisition = mongoose.model('Acquisition', acquisitionSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var imageSchema = mongoose.Schema({
    
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //key
    //SOPInstanceUID: String,
    acquisition_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    InstanceNumber: {type: Number, index: true},
    EchoNumbers: {type: Number, index: true},
    //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    //foreigh keys to make it easier to find related information
    research_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    exam_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    series_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    IIBISID: {type: String, index: true},  //for easy access control

    //the actual headers for this instance (cleaned)
    headers: mongoose.Schema.Types.Mixed, 

    //qc result (null if not qc-ed)
    qc: mongoose.Schema.Types.Mixed,
});
imageSchema.index({acquisition_id: 1, InstanceNumber: 1});
exports.Image = mongoose.model('Image', imageSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var dataflowSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    //
    // keys
    //
    isManual: {type: Boolean, index: true},
    requestedAt: {type: Date, default: Date.now, index: true},
    sentAt: {type: Date},
    imagesSent: {type: Number},
    arrivalAt: {type: Date},
    imagesReceived: {type: Number},
    ingestionAt: {type: Date},
    qc1At: {type: Date},
    qc1State: Boolean
});
dataflowSchema.index({requestedAt: 1, isManual: 1});
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

var aclSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //key
    //SOPInstanceUID: String,
    key: {type: String, index: true},
    //
    //////////////////////////////////////////////////////////////////////////////////////////////
    value: mongoose.Schema.Types.Mixed, 
});

//return true if user can do action on iibisid
aclSchema.statics.can = function(user, action, iibisid, cb) {
    /*
    this.findOne({key: 'iibisid'}, function(err, acl) {
        var _acl = acl.value[iibisid];
        if(!_acl || !_acl[action]) return cb(false);  //not set
        var inter = _acl.groups.filter(function(gid) {
            return ~user.gids.indexOf(gid);
        });
        cb(~acl[action].users.indexOf(user.sub) || inter.length > 0);
    });
    */
    this.getCan(user, action, function(err, iibisids) {
        cb(~iibisids.indexOf(iibisid));
    });
}

//get all iibisids that user has access to
aclSchema.statics.getCan = function(user, action, cb) {
    this.findOne({key: 'iibisid'}, function(err, acl) {
        if(err) return cb(err);
        var iibisids = [];
        if(acl) for(var iibisid in acl.value) {
            var _acl = acl.value[iibisid][action];
            if(_acl) {
                //if(acl.value[iibisid][action].groups) {
                var inter = _acl.groups.filter(function(gid) {
                    return ~user.gids.indexOf(gid);
                });
                if(~_acl.users.indexOf(user.sub) || inter.length > 0) {
                    iibisids.push(iibisid);
                }
            }
        } 
        cb(null, iibisids);
    });
}


///////
exports.Acl = mongoose.model('Acl', aclSchema);


