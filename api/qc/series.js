#!/usr/bin/node
'use strict';

const _ = require('underscore'); 

//const config = require('../../config');
const db = require('../models');
const events = require('../events');

//connect to db and start processing batch indefinitely
db.init(function(err) {
    if(err) throw err;
});

function qc_series(series,images) {

    console.log("QC-ing series: "+series._id + " -- series description " +series.series_desc);

    var all_qced = true;
    var errored_InstanceNumber = [];
    var template_mismatch = 0;  // number of fields with template_mismatch error
    var not_set = 0;  // number of fields with not_set error
    var diff = 0;
    var warnings = 0;

    var qc = {
        series_image_count: images.length,  //number of images in this series
        clean: 0, //number of images with no problems
        errored_images: 0,  // number of images with errors
        series_field_count: 0, // number of fields across all images
        series_fields_errored: 0,  // number of fields that errored across entire series
        template_field_count: 0,
        template_image_count: undefined,

        template_id: null, //template set used to do qc for this series (sampled from one images's qc.template_id)
        date: new Date(), //series-qc time

        //series-qc errros / warnings / notemp count
        errors: [], 
        warnings: [],
        notemps: 0, 
    }

    images.forEach(function(image) {
        if(image.qc) {
            if(image.qc.notemp) {
                qc.notemps++;
            } else {
                qc.series_field_count += image.qc.error_stats.image_field_count;
                qc.template_field_count += image.qc.error_stats.template_field_count;
                // image has errors
                if(image.qc.errors.length > 0) {
                    errored_InstanceNumber.push(image.InstanceNumber);
                    qc.errored_images++;
                    template_mismatch +=  image.qc.error_stats.template_mismatch;
                    not_set += image.qc.error_stats.not_set;
    
                }
                // image has warnings
                if(image.qc.warnings.length > 0) {
                    warnings++;
                } 
                //image is clean
                if(image.qc.errors.length == 0 && image.qc.warnings.length == 0) {
                    qc.clean++;
                }
            }
        } else {
            all_qced = false;
        }
    });

    //if there is an image that's not yet qc-ed, series cannot be qc-ed.
    if(!all_qced) {
        console.log("cannot qc the series because not all images have been qc-ed");
        // This should not happen, unless a series has too many images and cannot be retrieved all at once. 
        return 
    } else {
        qc.series_fields_errored = template_mismatch + not_set;
        qc.template_id = images[0].qc.template_id;
        //check for template header count 
        db.TemplateHeader.where({template_id: qc.template_id}).count(function(err, tc) {
            
            if (err) console.log(err);
            qc.template_image_count = tc;
            diff = qc.template_image_count - images.length; 
            
            console.log("template count is "+ qc.template_image_count + " diff is "+ Math.abs(diff));

            if(qc.errored_images > 0) {
                qc.errors.push({
                    type: "image_errors", 
                    msg: "Series contains "+qc.errored_images+" images with qc errors", 
                    c: qc.errored_images,
                    errored_images: errored_InstanceNumber,
                    per: qc.errored_images / qc.template_image_count,
                }); 
                
                if(template_mismatch > 0) {
                    qc.errors.push({
                        type: "field_template_mismatch", 
                        msg: "Series contains "+template_mismatch+" fields with 'template_mismatch' error", 
                        c: template_mismatch,
                        per: template_mismatch / qc.template_field_count,
                    });  
                }
     
                if(not_set > 0) {
                    qc.errors.push({
                        type: "field_not_set", 
                        msg: "Series contains "+not_set+" fields with 'not_set' error", 
                        c: not_set,
                        per: not_set / qc.template_field_count,
                    }); 
                }
              
            }
    
            if(warnings > 0) {
                qc.warnings.push({
                    type: "image_warning", 
                    msg: "Series contains "+warnings+" images with QC warnings", 
                    c: warnings,
                    per: warnings / qc.template_image_count,
                });        
            }
                    
            if(diff != 0) {
                qc.errors.push({
                    type: "image_count_mismatch", 
                    msg: diff > 0 ? "Series is missing "+diff+ " image headers":"Series has "+Math.abs(diff)+ " excess image headers",
                    c: images.length, 
                    tc: qc.template_image_count
                });
            }
    
            series.qc1_state = (qc.errors.length > 0 ? "fail" : "autopass");
            series.qc = qc;
            events.series(series);
            db.Series.update({_id: series._id}, {qc: qc}, function(err) {
                if (err) {
                    console.log(err);
                }
            });  
        })   
    }        
}



//ECMA6 Polyfill for endsWith
if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, position) {
      var subjectString = this.toString();
      if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
        position = subjectString.length;
      }
      position -= searchString.length;
      var lastIndex = subjectString.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
  };
}

exports.isExcluded = function(modality, series_desc) {
    switch(modality) {
    case "MR":
        if(series_desc == "MoCoSeries") return true;
        if(series_desc == "<MPR Collection>") return true;
        if(series_desc == "Perfusion_Weighted") return true;
        if(series_desc.endsWith("_ADC")) return true;
        if(series_desc.endsWith("_TRACEW")) return true;
        if(series_desc.endsWith("_FA")) return true;
        if(series_desc.endsWith("_SBRef")) return true;
        break;

    case "CT":
    case "PT":
    default:
    }
    return false;
}

exports.qc_series = qc_series;
