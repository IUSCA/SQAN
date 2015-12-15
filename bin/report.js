'use strict';

//contrib
var winston = require('winston');

//mine
var config = require('../api/config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../api/models');
var qc = require('../api/qc');

logger.info("connecting to db");
db.init(function(err) {
    if(err) throw(err);

    logger.info("querying recent studies");
    var query = db.Study.find().lean();
    query.sort({StudyTimestamp: -1, SeriesNumber: 1});
    query.limit(50);//limitter..
    query.exec(function(err, studies) {
        if(err) throw(err);
        load_related_info(studies, function(err, detail) {
            if(err) throw(err);
            console.log(JSON.stringify(detail, null, 4));
        });
    });
});

function load_related_info(studies, cb) {

    //if it excluded?
    studies.forEach(function(study) {
        study._excluded =  qc.series.isExcluded(study.Modality, study.series_desc)
    });

    cb(null, {
        studies: studies,
    });
}

