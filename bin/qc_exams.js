#!/usr/bin/node
'use strict';

//contrib
var winston = require('winston');
var async = require('async');
var _ = require('underscore'); 

//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../api/models');
var qc_funcs = require('../api/qc');

//connect to db and start processing batch indefinitely
db.init(function(err) {
    run(function(err) {
        if(err) throw err;
    });
});

function run(cb) {
    logger.info("querying exams -- "+ new Date());
    // get primary images that are not qc-ed=
    db.Exam.find({"istemplate":false, "qc": {$exists: false},"series.status":{$ne: null}}).limit(config.qc.exam_batch_size).exec(function(err, exams) { 
        if(err) return cb(err);

        logger.info("Un-qc-ed Exams retrieved: "+ exams.length);

        async.forEach(exams,qc_exam,function(err) {
            if (err) return cb(err);

            logger.info("Batch complete. Sleeping before next batch");

            setTimeout(function() {
                run(cb);
            }, 1000*3);
        })
    });
}

//iii) Compare exam series with template series
function qc_exam(exam,next) {

    exam.series.forEach(function(series){
        db.Series.find
    })
}