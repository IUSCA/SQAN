
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
    //template headers to check against
    headers: mongoose.Schema.Types.Mixed, 
});
//function for each instances
templateSchema.methods.speak = function() {
    console.log(this.headers.StudyDate);
}
exports.Template = mongoose.model('Template', templateSchema);;

///////////////////////////////////////////////////////////////////////////////////////////////////

var studySchema = mongoose.Schema({

    IIBISID: String,

    Modality: String, 

    RadioTracer: String, //only used for PT / CT

    StudyInstanceUID: String,

    /*
    //just to make things a bit more UI friendly
    StudyID: String,
    StudyDescription: String,
    */

    //template applied for this study 
    template_id: mongoose.Schema.Types.ObjectId,

    //list of patients for this study
    PatientIDs: [String],

    //list of series for this study
    SeriesInstanceUID: [String]
    
});
//function for each instances
studySchema.methods.speak = function() {
    //sample..
    console.log(this.headers.StudyDate);
}
exports.Study = mongoose.model('Study', studySchema);

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
