
//contrib
//var Sequelize = require('sequelize');
var mongoose = require('mongoose');

//mine
var config = require('./config/config');

//var sequelize = new Sequelize('database', 'username', 'password', config.sequelize);
exports.init = function(cb) {
    mongoose.connect(config.mongodb, {}, function(err) {
        if(err) return cb(err);
        console.log("connected to mongo");
        cb();
    });
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
    Radiopharmaceutical: String, //like DOTA NOC (aka. Radio Tracer - only used for PT / CT)
    //
    ///////////////////////////////////////////////////////////////////////////

    //StudyTimestamp: Date,
    //StudyDescription: String, //PHI now
    //StudyID: String,

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // let's store some key fields (TODO - should these be indexed?)


    //"what people say "Modality" is actually defined by combination of Modality+StationMame fields
   
    //list of series for this study
    //SeriesInstanceUID: [String],
   
    //list of templates available for this study (the last should be applied to all new series - unless overridden)
    //template_ids: [ mongoose.Schema.Types.ObjectId] ,
});

exports.Research = mongoose.model('Research', researchSchema);

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

/*
//function for each instances
templateSchema.methods.speak = function() {
    //demo purpose only
    console.log(this.headers.StudyDate);
}
*/
exports.Series = mongoose.model('Series', seriesSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var templateSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    //
    // keys
    //
    //study_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    series_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    date: Date, //date when this template is received (probabbly use StudyTimestamp of the template?)
    //AcquisitionNumber: Number,
    //InstanceNumber: Number,
    //
    ///////////////////////////////////////////////////////////////////////////
    
    ///////////////////////////////////////////////////////////////////////////
    //
    //foreign key to assist lookup
    //
    research_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    
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
});
exports.TemplateHeader = mongoose.model('TemplateHeader', templateHeaderSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var studySchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    //
    // keys
    //
    series_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    subject: String,
    StudyInstanceUID: String, //StudyInstanceUID alone can not uniquely identify a "study" as I understand it. 
    //
    ///////////////////////////////////////////////////////////////////////////
    
    ///////////////////////////////////////////////////////////////////////////
    //
    //foreign key to assist lookup
    //
    research_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 

    ///////////////////////////////////////////////////////////////////////////

    StudyTimestamp: Date,

    //template to use for QC (if not, latest version will be used) specified by a user - to override the auto selection
    template_id: {type: mongoose.Schema.Types.ObjectId, index: true},

    //study-wide qc result 
    //qc: mongoose.Schema.Types.Mixed,
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
 
    //series that this aq belongs to
    //series_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    //AcquisitionTimestamp: Date, 
});
exports.Acquisition = mongoose.model('Acquisition', acquisitionSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var imageSchema = mongoose.Schema({
    
    //key
    SOPInstanceUID: String,

    //foreigh keys to make it easier to find related information
    research_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    series_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    study_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    acquisition_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 

    //the actual headers for this instance (cleaned)
    headers: mongoose.Schema.Types.Mixed, 

    //qc result (null if not qc-ed)
    qc: mongoose.Schema.Types.Mixed,
    /*
    {
        template_id: mongoose.Schema.Types.ObjectId,  //template used for the qc
        date: Date, //date when the QC was last performed
        errors: [ mongoose.Schema.Types.Mixed ], //list of qc dicrepancies, etc..
        warnings: [ mongoose.Schema.Types.Mixed ], //list of qc dicrepancies, etc..
        notes: [ mongoose.Schema.Types.Mixed ], //list of qc dicrepancies, etc..
    }*/
});
exports.Image = mongoose.model('Image', imageSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var counterSchema = mongoose.Schema({
    date: Date, 
    research_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    series_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    study_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    count: Number, //number of images in a given study 
});
exports.Counter = mongoose.model('Count', counterSchema);


