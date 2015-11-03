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

            image_count: images.length,  //number of images in this study

            template_id: null, //template set used to do qc for this study

            date: new Date(), //study-qc time

            //study-qc errros / warnings
            errors: [], 
            warnings: [],

            //number of images with no temp
            notemps: 0,
        }
        
        //count total number of errors / warnings from images
        var all_qced = true;
        images.forEach(function(image) {
            if(image.qc) {
                
                //TODO all images for study should be compared against the same template_id (with templateheader for each imageinstance)
                //but, if some images are already qc-ed, then another images could be qc-ed against different template_id
                //should I raise warning if such images are around?

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
                if(image.qc.notemp) qc.notemps++;
            } else {
                all_qced = false;
            }
        });

    
        //if there is an image that's not yet all qc-ed, I can't qc the study
        if(!all_qced) return next();

        if(qc.template_id) {
            //check for template header count 
            db.TemplateHeader.where({template_id: qc.template_id}).count(function(err, template_count) {
                if(template_count != images.length) {
                    qc.errors.push({type: "template_count_mismatch", msg: "Template image count doesn't match", c: images.length, tc: template_count});
                }
                console.dir(qc);
                study.qc = qc;
                study.save(next);
            });
        } else {
            //none of the images has template id..
            study.qc = qc;
            study.save(next);
        }
    });
}
