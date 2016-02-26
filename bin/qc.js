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
var qc_template = require('../api/qc/template');

//connect to db and start processing batch indefinitely
db.init(function(err) {
    run(function(err) {
        if(err) throw err;
    });
});

function run(cb) {
    logger.info("querying un-qc-ed images");
    //find images that needs QC in a batch
    db.Image.find({qc: {$exists: false}}).limit(config.qc.batch_size).exec(function(err, images) {
        if(err) return cb(err);
        async.forEach(images, qc, function(err) {
            if(err) return cb(err);
            logger.info("batch complete. sleeping before next batch");
            setTimeout(run, 1000*5);
        });
    });
}

//iii) Compare headers on the images with the chosen template (on fields configured to be checked against) and store discrepancies. 
function qc(image, next) {
    logger.info("QC-ing image_id:"+image.id);
    find_template_headers(image, function(err, templateheaders) {
        if(err) return next(err);
        var qc = {
            template_id: null,
            date: new Date(),
            errors: [],
            warnings: [],
            notemp: false, //set to true if no template was found
        };

        if(templateheaders) {
            qc.template_id = templateheaders.template_id;
            qc_template.match(image, templateheaders, qc);
        } else {
            //templte missing for the entire series, or just for this instance number
            //either way.. just mark it as notemp
            qc.notemp = true;
        }

        //store qc results and next
        image.qc = qc;
        //console.log(JSON.stringify(image.qc, null, 4));
        image.save(function(err) {
            if(err) return next(err);
            //invalidate series qc
            db.Series.update({_id: image.series_id}, {$unset: {qc: 1}}, {multi: true}, next);
        });
    });
}

function pick_template(series, exam_id, cb) {
    db.Template.find({
        exam_id: exam_id,
    }).exec(function(err, templates) {
        if(err) return cb(err);
        if(templates.length == 0) {                    
            logger.error("no templates found for exam_id:"+exam_id);
            return cb();
        }

        //find series with longest prefix
        var longest = null;
        templates.forEach(function(template) {
            if(~series.series_desc.indexOf(template.series_desc)) {
                if(longest == null || longest.series_desc.length < template.series_desc.length) {
                    longest = template; //better match
                }
            }
        });
        cb(null, longest);
    });
}

//TODO cache the result if same series is requested?
function get_template(series, cb) {
    //find template_id specified for the series (if it's set, query for that template)
    if(series.template_exam_id) {
        pick_template(series, series.template_exam_id, cb);
    } else {
        //find the latest exam
        db.Exam
            .findOne({research_id: series.research_id, istemplate: true})
            .sort('-date')
            .exec(function(err, exam) {
            if(err) return cb(err);
            if(!exam) {
                //console.log(JSON.stringify(series, null, 4));
                return cb(null, null);
            }
            pick_template(series, exam._id, cb);
        });
    }
}

function find_template_headers(image, cb) {
    //find series first
    db.Series.findById(image.series_id, 'template_exam_id series_desc research_id', function(err, series) {
        if(err) return cb(err);
        if(!series) return cb("couldn't find such series: "+image.series_id);
        //then find template
        get_template(series, function(err, template) {
            if(err) return cb(err);
            if(!template) {
                logger.info("couldn't find any template set for research_id:"+series.research_id+" for image_id:"+image._id);
                return cb(null, null);
            }
            db.TemplateHeader.findOne({
                template_id: template._id, 
                "headers.AcquisitionNumber": image.headers.AcquisitionNumber,
                "headers.InstanceNumber": image.headers.InstanceNumber,
            }, cb);
        });
    });
}

