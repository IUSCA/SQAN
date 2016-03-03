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
    logger.info("querying un-qc-ed studies");
    //find images that needs QC in a batch
    db.Series.find({qc: {$exists: false}}).limit(400).exec(function(err, studies) {
        if(err) return cb(err);
        async.each(studies, qc_series, function(err) {
            if(err) return cb(err);
            logger.info("batch complete. sleeping before the next try");
            setTimeout(run, 1000*5);
        });
    });
}

//iii) Compare headers on the images with the chosen template (on fields configured to be checked against) and store discrepancies. 
function qc_series(series, next) {
    logger.info("QC-ing series:"+series.id);

    //find all images for this series
    db.Image
    .find({series_id: series.id}) //TODO pick largest SeriesNumber and add it to this query..
    .select('qc headers.AcquisitionNumber headers.InstanceNumber')
    .exec(function(err, images) {
        var qc = {
            image_count: images.length,  //number of images in this series
            clean: 0, //number of images with no problems
            template_id: null, //template set used to do qc for this series (sampled from one images's qc.template_id)
            date: new Date(), //series-qc time

            //series-qc errros / warnings / notemp count
            errors: [], 
            warnings: [],
            notemps: 0, 
        }
        
        //count number of images with error / warnings
        var all_qced = true;
        var errors = 0;
        var warnings = 0;
        images.forEach(function(image) {
            if(image.qc) {
                
                //TODO all images for series should be compared against the same template_id (with templateheader for each imageinstance)
                //but, if some images are already qc-ed, then another images could be qc-ed against different template_id
                //should I raise warning if such images are around?

                if(!qc.template_id) qc.template_id = image.qc.template_id;

                if(image.qc.errors.length > 0) {
                    /*
                    qc.errors.push({
                        type: "qc_error", 
                        msg: "Image Instance:"+image.headers.InstanceNumber+" contains QC errors", 
                        instid: image.headers.InstanceNumber, 
                        aqid: image.headers.AcquisitionNumber, 
                        c: image.qc.errors.length
                    });
                    */
                    errors++;
                }
                if(image.qc.warnings.length > 0) {
                    /*
                    qc.warnings.push({
                        type: "qc_warning", 
                        msg: "Image Instance:"+image.headers.InstanceNumber+" contains QC warnings", 
                        instid: image.headers.InstanceNumber, 
                        aqid: image.headers.AcquisitionNumber, 
                        c: image.qc.warnings.length
                    });
                    */
                    warnings++;
                }

                if(image.qc.notemp) qc.notemps++;

                //no problem
                if(!image.qc.notemp && image.qc.errors.length == 0 && image.qc.warnings.length == 0) {
                    qc.clean++;
                }
            } else {
                all_qced = false;
            }
        });
    
        //if there is an image that's not yet all qc-ed, I can't qc the series
        if(!all_qced) return next();

        if(errors > 0) {
            qc.errors.push({
                type: "qc_error", 
                msg: "Study contains "+errors+" images with QC errors", 
                c: errors,
                per: errors / images.length,
            });        
        }
        if(warnings > 0) {
            qc.warnings.push({
                type: "qc_warning", 
                msg: "Study contains "+warnings+" images with QC warnings", 
                c: warnings,
                per: warnings / images.length,
            });        
        }
        /*
        if(qc.notemps > 0) {
            qc.warnings.push({
                type: "qc_notemp", 
                msg: "Study contains "+qc.notemps+" images with with no matching template"
            });        
        }
        */

        //now do series level QC (TODO - there aren't much to do right now)
        if(qc.template_id) {
            //check for template header count 
            db.TemplateHeader.where({template_id: qc.template_id}).count(function(err, template_count) {
                if(template_count != images.length) {
                    qc.errors.push({type: "template_count_mismatch", msg: "Template image count doesn't match", c: images.length, tc: template_count});
                }
                series.qc1_state = (qc.errors.length > 0 ? "fail" : "autopass");
                series.qc = qc;
                series.save(next);
            });
        } else {
            //none of the images has template id..
            series.qc1_state = "fail"; //TODO - or should I leave it null?
            series.qc = qc;
            series.save(next);
        }
    });
}
