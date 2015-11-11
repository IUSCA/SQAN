
//contrib
//var Sequelize = require('sequelize');
var mongoose = require('mongoose');

//mine
var config = require('./config');

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
    raidio_tracer: String, //like DOTA NOC (from RadiopharmaceuticalInformationSequence.Radiopharmaceutical - only used for CT)
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

    ///////////////////////////////////////////////////////////////////////////

    //template to use for QC (if not, latest version will be used) specified by a user - to override the auto selection
    template_id: {type: mongoose.Schema.Types.ObjectId, index: true},

    //study level qc result 
    qc: mongoose.Schema.Types.Mixed,
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
    
    //key
    SOPInstanceUID: String,

    //foreigh keys to make it easier to find related information
    research_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    //series_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    study_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    acquisition_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 

    //the actual headers for this instance (cleaned)
    headers: mongoose.Schema.Types.Mixed, 

    //qc result (null if not qc-ed)
    qc: mongoose.Schema.Types.Mixed,
});
exports.Image = mongoose.model('Image', imageSchema);


