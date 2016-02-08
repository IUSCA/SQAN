
//contrib
var mongoose = require('mongoose');
var winston = require('winston');

//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);

//var sequelize = new Sequelize('database', 'username', 'password', config.sequelize);
exports.init = function(cb) {
    mongoose.connect(config.mongodb, {}, function(err) {
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
    IIBISID: String, //like.. 2016-00001
    Modality: String,  //like.. PT
    StationName: String,  //like.. CT71271
    radio_tracer: String, //like DOTA NOC (from RadiopharmaceuticalInformationSequence.Radiopharmaceutical - only used for CT)
    //
    ///////////////////////////////////////////////////////////////////////////

});
exports.Research = mongoose.model('Research', researchSchema);

/*
///////////////////////////////////////////////////////////////////////////////////////////////////
var seriesSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    //
    // keys
    //
    research_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    series_desc: String, //original SeriesDescription minut anything after ^
    //
    ///////////////////////////////////////////////////////////////////////////

    //SeriesTimestamp: Date, //from qc_SeriesTimestamp
});
exports.Series = mongoose.model('Series', seriesSchema);
*/
///////////////////////////////////////////////////////////////////////////////////////////////////

var templateSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    //
    // keys
    //
    research_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    //study_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    series_desc: String, //original SeriesDescription minut anything after ^
    //series_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    date: Date, //date when this template is received (probabbly use StudyTimestamp of the template?)
    SeriesNumber: Number,
    
    //
    ///////////////////////////////////////////////////////////////////////////
    
    ///////////////////////////////////////////////////////////////////////////
    //
    //foreign key to assist lookup
    //
    Modality: String,  //like.. PT
    
    count: Number, //number of images in a given series
});
exports.Template = mongoose.model('Template', templateSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var templateHeaderSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    //
    // keys
    //
    template_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    AcquisitionNumber: Number,
    InstanceNumber: Number,
    //
    ///////////////////////////////////////////////////////////////////////////
    
    headers: mongoose.Schema.Types.Mixed, 
    IIBISID: String, //make it easier to do access control
    
});
exports.TemplateHeader = mongoose.model('TemplateHeader', templateHeaderSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var studySchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    //
    // keys
    //
    research_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    series_desc: String, //original SeriesDescription minut anything after ^
    subject: String,
    StudyInstanceUID: String, //StudyInstanceUID alone can not uniquely identify a "study" as I understand it. 
    SeriesNumber: Number, //some study has repeated series
    //
    ///////////////////////////////////////////////////////////////////////////
    
    ///////////////////////////////////////////////////////////////////////////
    //
    //foreign key/value to assist lookup
    //
    Modality: String,  //like.. PT
    StudyTimestamp: Date,
    IIBISID: String,  //for easy access control

    ///////////////////////////////////////////////////////////////////////////

    //template to use for QC (if not, latest version will be used) specified by a user - to override the auto selection
    template_id: {type: mongoose.Schema.Types.ObjectId, index: true},

    //study first received
    create_date: {type: Date, default: Date.now},

    //study level qc result 
    qc: mongoose.Schema.Types.Mixed, //has to be Mixed so that mongoose will let me set to null
    /*
    qc: { //mongoose.Schema.Types.Mixed,
        notemps: Number,
        warnings: [ mongoose.Schema.Types.Mixed ],
        errors: [ mongoose.Schema.Types.Mixed ],
        date: Date,
        template_id: mongoose.Schema.Types.ObjectId,
        clean: Number,
        image_count: Number,
    },
    */

    qc1_state: String, //(null), autopass, accept, reject
    qc2_state: String, //(null), accept, condaccept, reject
    //pipeline status (see sundar's data qc & pipeline)

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
});

exports.Study = mongoose.model('Study', studySchema);

///////////////////////////////////////////////////////////////////////////////////////////////////
///
var acquisitionSchema = mongoose.Schema({

    ///////////////////////////////////////////////////////////////////////////
    //
    // keys
    //
    //study that this aq belongs to
    study_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    AcquisitionNumber: Number,
    //
    ///////////////////////////////////////////////////////////////////////////
    
    ///////////////////////////////////////////////////////////////////////////
    //
    //foreign key to assist lookup
    //
    research_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    study_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
});
exports.Acquisition = mongoose.model('Acquisition', acquisitionSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var imageSchema = mongoose.Schema({
    
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //key
    //SOPInstanceUID: String,
    acquisition_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    InstanceNumber: Number,
    //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    //foreigh keys to make it easier to find related information
    research_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    study_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    IIBISID: String,  //for easy access control

    //the actual headers for this instance (cleaned)
    headers: mongoose.Schema.Types.Mixed, 

    //qc result (null if not qc-ed)
    qc: mongoose.Schema.Types.Mixed,
});
exports.Image = mongoose.model('Image', imageSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var aclSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //key
    //SOPInstanceUID: String,
    key: String,
    //
    //////////////////////////////////////////////////////////////////////////////////////////////
    value: mongoose.Schema.Types.Mixed, 
});
aclSchema.statics.canAccessIIBISID = function(user, iibisid, cb) {
    this.findOne({key: 'iibisid'}, function(err, acl) {
        var _acl = acl.value[iibisid];
        if(!_acl) return cb(false); //not set
        return cb(~_acl.users.indexOf(user.sub));
    });
};
exports.Acl = mongoose.model('Acl', aclSchema);


