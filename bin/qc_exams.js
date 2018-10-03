#!/usr/bin/node
'use strict';

//node
var fs = require('fs');

//contrib
var winston = require('winston');
var async = require('async');
var _ = require('underscore'); 

//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../api/models');

//connect to db and start processing batch indefinitely
db.init(function(err) {
    run(function(err) {
        if(err) throw err;
    });
});

function run(cb) {
    logger.info("querying un-qc-ed exams -- "+ new Date());
    // get exams that are not qc-ed
    db.Exams.find({qc: {$exists: false}, istemplate : false}).limit(config.qc.exam_batch_size).exec(function(err, exams) { 
        if(err) return cb(err);

        logger.info("exams retrieved: "+ exams.length);

        async.forEach(exams,qc_exam,function(err) {
            if (err) return cb(err);

            logger.info("Batch complete. Sleeping before next batch");

            setTimeout(function() {
                run(cb);
            }, 1000*3);
        })
    });
}

// compare the series_description array in each exam with the array in the corresponding template exam. 
function qc_exam(exam,next) {

    // find template

    // find exam document for the corresponding template

}