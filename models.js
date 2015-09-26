
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

/*
//function for each instances
studySchema.methods.speak = function() {
    //demo purpose..
    console.log(this.headers.StudyDate);
}
*/
exports.Research = mongoose.model('Research', researchSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////
var seriesSchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    //
    // keys
    //
    research_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    SeriesDescription: String,
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
    //
    ///////////////////////////////////////////////////////////////////////////
    
    count: Number, //number of images in a given series
    
    //sample headers (right now, it just stores the *last* set of template sent for a given study/series
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

var studySchema = mongoose.Schema({
    ///////////////////////////////////////////////////////////////////////////
    //
    // keys
    //
    series_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    subject: String,
    StudyInstanceUID: String,
    //
    ///////////////////////////////////////////////////////////////////////////

    StudyTimestamp: Date,
});

/*
//function for each instances
templateSchema.methods.speak = function() {
    //demo purpose only
    console.log(this.headers.StudyDate);
}
*/
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
    
    //series that this aq belongs to
    //series_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    //AcquisitionTimestamp: Date, 
});
exports.Acquisition = mongoose.model('Acquisition', acquisitionSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////
var imageSchema = mongoose.Schema({
    
    //no key

    //foreigh keys to make it easier to find image
    research_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    study_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    series_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 
    acquisition_id: {type: mongoose.Schema.Types.ObjectId, index: true}, 

    //the actual headers for this instance (cleaned)
    headers: mongoose.Schema.Types.Mixed, 
});
exports.Image = mongoose.model('Image', imageSchema);

///////////////////////////////////////////////////////////////////////////////////////////////////

//to store the test results for each series
var resultSchema = mongoose.Schema({
    research_id: mongoose.Schema.Types.ObjectId,
    series_id: mongoose.Schema.Types.ObjectId,
    study_id: mongoose.Schema.Types.ObjectId,

    //TODO this is pretty much TBD..
    results: [ {
        result_date: Date, //date when the result was created
        template_id: mongoose.Schema.Types.ObjectId, //template applied to produce the result

        //the actual result organized under acquisition
        acquisitions: {
            //AcquisitionNumber: Number,
            acquisition_id: mongoose.Schema.Types.ObjectId,
            instances: [ {
                image_id: mongoose.Schema.Types.ObjectId,
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
