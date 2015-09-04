
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

var templateSchema = mongoose.Schema({
    //just to allow efficient search by SOPInstanceUID of the template
    SOPInstanceUID: {type: String, index: true}, 

    //study that this template belongs to
    study_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    
    //the actual template headers
    headers: mongoose.Schema.Types.Mixed, 
});

/*
//function for each instances
templateSchema.methods.speak = function() {
    //demo purpose only
    console.log(this.headers.StudyDate);
}
*/
exports.Template = mongoose.model('Template', templateSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var seriesSchema = mongoose.Schema({

    SeriesInstanceUID: {type: String, index: true},

    //study that this instance belongs to
    study_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 

    //just some metadata
    SeriesNumber: Number,
    SeriesTimestamp: Date, //from qc_SeriesTimestamp
    SeriesDescription: String,
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

var acquisitionSchema = mongoose.Schema({

    //study that this aq belongs to
    study_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    //series that this aq belongs to
    series_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 

    AcquisitionNumber: Number,
    AcquisitionTimestamp: Date, 
});

/*
//function for each instances
templateSchema.methods.speak = function() {
    //demo purpose only
    console.log(this.headers.StudyDate);
}
*/
exports.Acquisition = mongoose.model('Acquisition', acquisitionSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var instanceSchema = mongoose.Schema({
    //just to allow efficient search by SOPInstanceUID 
    SOPInstanceUID: {type: String, index: true}, 

    //study that this instance belongs to
    study_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    //series that this instnace belongs to
    series_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    //acuisition that this instance belongs to
    acquisition_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 

    //the actual headers for this instance (cleaned)
    headers: mongoose.Schema.Types.Mixed, 
});

/*
//function for each instances
templateSchema.methods.speak = function() {
    //demo purpose only
    console.log(this.headers.StudyDate);
}
*/
exports.Instance = mongoose.model('Instance', instanceSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

var studySchema = mongoose.Schema({

    StudyInstanceUID: {type: String, index: true}, //ID stored in DICOM header

    StudyTimestamp: Date,
    StudyDescription: String,
    StudyID: String,

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // let's store some key fields (TODO - should these be indexed?)

    //Research Project - 
    IIBISID: String, //like.. 2016-00001

    //"what people say "Modality" is actually defined by combination of Modality+StationMame fields
    Modality: String,  //like.. PT
    StationName: String,  //like.. CT71271

    //Radio Tracer - only used for PT / CT
    Radiopharmaceutical: String, //like DOTA NOC
    
    //list of series for this study
    //SeriesInstanceUID: [String],
   
    //list of templates available for this study (the last should be applied to all new series - unless overridden)
    //template_ids: [ mongoose.Schema.Types.ObjectId] ,
});

//function for each instances
studySchema.methods.speak = function() {
    //demo purpose..
    console.log(this.headers.StudyDate);
}
exports.Study = mongoose.model('Study', studySchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

//to store the test results for each series
var resultSchema = mongoose.Schema({
    //study that this series belongs
    study_id: mongoose.Schema.Types.ObjectId,

    //series UID that this result belongs to
    series_id: mongoose.Schema.Types.ObjectId,

    //TODO this is pretty much TBD..
    results: [ {
        result_date: Date, //date when the result was created
        //template applied for the test result
        template_id: mongoose.Schema.Types.ObjectId,

        //the actual result organized under acquisition
        acquisitions: {
            AcquisitionNumber: Number,
            instances: [ {
                instance_id: mongoose.Schema.Types.ObjectId,
                errs: [ mongoose.Schema.Types.Mixed ], //can't use "errors" for mongo field name
                warns: [ mongoose.Schema.Types.Mixed ],
            } ]
        }
    } ]
});
exports.Result = mongoose.model('Result', resultSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////
/* images are stored in elasticsearch
 * use es api to query headers https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-get.html
var imageSchema = mongoose.Schema({
    headers: Schema.Types.Mixed,

    //template used to validate this image (not set if we don't know which template to apply)
    template: Schema.Types.ObjectId,

    //date of analysis (not set if it's not analyzed yet)
    analyzed_date: Date,
});

//function for each instances
imageSchema.methods.speak = function() {
    console.log(this.headers.StudyDate);
}
exports.image = mongoose.model('Image', imageSchema);;
*/

///////////////////////////////////////////////////////////////////////////////////////////////////
