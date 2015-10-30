#!/usr/bin/node
'use strict';

//node
var fs = require('fs');
//var assert = require('assert');

//contrib
var winston = require('winston');
var async = require('async');
var _ = require('underscore'); 

//mine
var config = require('../api/config/config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../api/models');

//connect to db and start processing batch indefinitely
db.init(function(err) {
    run(function(err) {
        if(err) throw err;
    });
});

function run(cb) {
    logger.info("querying un-qc-ed studies");
    //find images that needs QC in a batch
    db.Study.find({qc: {$exists: false}}).limit(30).exec(function(err, studies) {
        if(err) return cb(err);
        async.each(studies, qc_study, function(err) {
            if(err) return cb(err);
            logger.info("batch complete. sleeping before next batch");
            setTimeout(run, 1000*5);
        });
    });
}

//iii) Compare headers on the images with the chosen template (on fields configured to be checked against) and store discrepancies. 
function qc_study(study, next) {
    logger.info("QC-ing study:"+study.id);

    //find images for this study
    db.Image
    .find({study_id: study.id})
    .select('qc headers.AcquisitionNumber headers.InstanceNumber')
    .exec(function(err, images) {
        var qc = {
            //images: {}, //stores acquisition/instance and issue counts

            image_count: images.length, 

            template_id: null,
            date: new Date(),
            errors: [],
            warnings: [],

            /*
            total: {
                qced: 0,
                errors: 0,
                warnings: 0,
                notes: 0,
            },

            //study specify issues goes here (TODO)
            errors: [],
            warnings: [],
            notes: [],
            */
        }
        
        //count total number of errors / warnings from images
        var qced = true;
        images.forEach(function(image) {
            /*
            if(qc.images[image.headers.AcquisitionNumber] == undefined) {
                qc.images[image.headers.AcquisitionNumber] = {};
            }
            var img = {
                id: image.id,
            };
            if(image.qc) {

                template_id = image.template_id;

                img.errors = image.qc.errors.length;
                img.warnings = image.qc.warnings.length;
                //img.notes = image.qc.notes.length;
            }
            qc.images[image.headers.AcquisitionNumber][image.headers.InstanceNumber] = img;
            */
            if(image.qc) {
                
                //TODO all images under the study should be compared against the same template. should I check that fact?
                if(!qc.template_id) qc.template_id = image.qc.template_id;

                if(image.qc.errors.length > 0) {
                    qc.errors.push({
                        type: "qc_error", 
                        msg: "Image Instance:"+image.headers.InstanceNumber+" contains QC errors", 
                        instid: image.headers.InstanceNumber, 
                        aqid: image.headers.AcquisitionNumber, 
                        c: image.qc.errors.length
                    });
                }
                if(image.qc.warnings.length > 0) {
                    qc.warnings.push({
                        type: "qc_warning", 
                        msg: "Image Instance:"+image.headers.InstanceNumber+" contains QC warnings", 
                        instid: image.headers.InstanceNumber, 
                        aqid: image.headers.AcquisitionNumber, 
                        c: image.qc.warnings.length
                    });
                }
            } else {
                qced = false;
            }
        });

        //check against template (if all images are qc-ed)
        if(qced) {
            if(qc.template_id) {
                db.TemplateHeader.where({template_id: qc.template_id}).count(function(err, template_count) {
                    if(template_count != images.length) {
                        qc.errors.push({type: "template_count_mismatch", msg: "Template image count doesn't match", c: images.length, tc: template_count});
                    }
                    console.dir(qc);
                    study.qc = qc;
                    study.save(next);
                });
            } else {
                qc.warnings.push({type: "template_missing", msg: "none of the image has matching template"});
                study.qc = qc;
                study.save(next);
            }
        } else {
            //if there is an image that's not yet qc-ed, I can't qc the study
            next();
        }
    });
}
