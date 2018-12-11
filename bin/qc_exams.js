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

    db.Exam.find({"istemplate":false,"series.status":{$ne: null}, qc: {$exists: false}}).limit(config.qc.exam_batch_size).exec(function(err, exams) { 
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

    // find the corresponding template-exam
    find_exam_template(exam.research_id,function(err,texam) {
        if (err) return next(err);
        if (!texam) return next(null);
        console.log(texam.series);
        
        var eseries = [];
        exam.series.forEach(function(s){
            if (eseries.indexOf(s.series_desc) == -1) 
                eseries.push(s.series_desc);
        })

        texam.series.forEach(function(ts,index){
            if (eseries.indexOf(ts.series_desc) == -1){ // exam is missing a template series
                var missing_series = {
                    series_desc:ts.series_desc,
                    status: 'missing',
                    template_exam: texam._id
                }
                exam.series.push(missing_series);
            }  
            if (index == texam.series.length - 1) {
                console.log('***************saving series!!')
                db.Exam.findOneAndUpdate({
                    _id:exam._id,
                },{
                    series: exam.series,
                    qc: true,
                }, {'new': true},function(err,new_exam) {
                    if(err) return next(err);
                    if(!new_exam) console.log("something broke!")
                    console.log(new_exam);
                    return next();
                })
            }          
        })
    })

}

function find_exam_template(research_id,cb) {
    
    db.Exam.find({"research_id": research_id, "istemplate":true})
    .sort({"StudyTimestamp":-1})  //.sort('-date')
    .exec(function(err,texams) {
        if (err) return cb(err);
        console.log(texams.length + " template exams retrieved for research_id "+ research_id);
        if (!texams || texams.length == 0) {
            logger.info("couldn't find template for research_id:"+ research_id);
            return cb(null,null);
        } else {
            return cb(null,texams[0])        
        }
    })
}
