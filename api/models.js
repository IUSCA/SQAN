'use strict';

//contrib
const mongoose = require('mongoose');
const winston = require('winston');

//mine
const config = require('../config');
const logger = new winston.Logger(config.logger.winston);
//const events = require('./events');

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
    //StudyInstanceUID: {type: String, index: true},
    istemplate: {type: Boolean},
    StudyTimestamp: Date,
    //series: mongoose.Schema.Types.Mixed, 
    qc: mongoose.Schema.Types.Mixed,

    comments: [ mongoose.Schema({
        user_id: String, //req.user.sub
        comment: String,
        date: {type: Date, default: Date.now},
    }) ],
});
examSchema.index({research_id: 1});
exports.Exam = mongoose.model('Exam', examSchema);

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
});
templateSchema.index({exam_id: 1, primary_image:1});
exports.Template = mongoose.model('Template', templateSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var templateHeaderSchema = mongoose.Schema({

    template_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    InstanceNumber: {type: Number},
    //EchoNumbers: {type: Number},
    SOPInstanceUID : {type: String, index: true},
    
    headers: mongoose.Schema.Types.Mixed, 
    primary_image: {type: mongoose.Schema.Types.ObjectId, index: true}
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
    series_desc: {type: String}, //original SeriesDescription minut anything after ^
    SeriesNumber: {type: Number}, //some study has repeated series
    deprecated_by: {type: mongoose.Schema.Types.ObjectId},

    isexcluded: Boolean,
    primary_image: {type: mongoose.Schema.Types.ObjectId, index: true},

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
}, {strict: false});

seriesSchema.index({exam_id: 1, primary_image:1});
exports.Series = mongoose.model('Series', seriesSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var imageSchema = mongoose.Schema({
    
    ///////////////////////////////////////////////////////////////////////////////////////////////

    series_id: {type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Series'},
    SOPInstanceUID : {type: String, index: true},

    InstanceNumber: {type: Number},
    //EchoNumbers: {type: Number},

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


