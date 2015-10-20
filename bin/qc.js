#!/usr/bin/node
'use strict';

/*
During the meeting tomorrow, I'd like to discuss the workflow / algorithm on how to do the QC. For example, following is my current rough idea.
    i) Find images with no QC applied.
    ii) For each images with no QC applied, identify the template (by looking up the series_id and find the latest template for that series_id --- or --- template that's specifically specified for that study)
    iii) Compare headers on the images with the chosen template (on fields configured to be checked against) and store discrepancies. 
    iv) Store information about images checked, and any discrepancies to a "report" table.
    v) Send the aggregated report to RADY team (weekly?)
*/

//node
var fs = require('fs');

//contrib
var winston = require('winston');
var async = require('async');
var _ = require('underscore'); 

//mine
var config = require('../api/config/config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../api/models');
var qc_instance = require('../api/qc/instance');
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
    db.Image.find({qc: {$exists: false}}).limit(2000).exec(function(err, images) {
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
    logger.info("QC-ing "+image.id);
    find_template(image, function(err, template) {
        if(err) return next(err);
        var qc = {
            template_id: null,
            date: new Date(),
            errors: [],
            warnings: [],
        };
        if(template) { 
            qc.template_id = template.id;
            var ret = qc_template.match(image, template);
            qc.errors = ret.errors;
            qc.warnings = ret.warnings;
        } else {
            qc.errors.push({type: 'template_missing', msg: "couldn't find a template for image:"+image.id});
        }

        //debug
        if(qc.errors.length > 0 || qc.warnings.length > 0) {
            console.log(image.id);
            console.log(JSON.stringify(qc, null, 4));
        }

        //logger.info("storing qc results");
        //logger.debug(qc);
        
        //store qc results and next
        image.qc = qc;
        image.save(next);
    });
}

//ii) For each images with no QC applied, identify the template (by looking up the series_id and find the latest template for that series_id --- or --- template that's specifically specified for that study)
function find_template(image, cb) {
    //find template_id specified for the study (if it's set, query for that template)
    //TODO - not unit tested
    db.Study.findById(image.study_id, 'template_id', function(err, study) {
        if(err) return cb(err);
        if(study.template_id) {
            //load template specified for this study
            db.Tempalte.find({id: study.template_id}, function(err, template) {
                if(err) return cb(err);
                cb(null, template);
            }); 
        } else {
            //template not specified. Just find the latest template for that series
            db.Template.find({series_id: image.series_id}).sort({date: -1}).exec(function(err, templates) {
                if(err) return cb(err);
                cb(null, templates[0]);
            });
        }
    });
}

/*
stream.on('data', function(image) {
    logger.debug(image.SOPInstanceUID);
});
stream.on('error', function(err) {
    throw err;
});
stream.on('close', function() {
    logger.info("findAll complete");
});
*/

