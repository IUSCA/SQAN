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


function qc_series(series) {
    //console.log("*********************")
    console.log("QC-ing series: "+series._id + "series description " +series.series_desc);

    //find all images for this series
    db.Image
    .find({series_id: series._id}) //TODO pick largest SeriesNumber and add it to this query..
    .select('qc InstanceNumber')
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
        if(!all_qced) {
            console.log("cannot qc the series because not all images have been qc-ed");
            return 
        }
        
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
                events.series(series);
                db.Series.update({_id: series._id}, {qc: qc}, function(err) {
                    if (err) {
                        console.log(err);
                    }
                });
                //series.save(next);
            });
        } else {
            //none of the images has template id..
            series.qc1_state = "fail"; //TODO - or should I leave it null?
            series.qc = qc;
            events.series(series);
            db.Series.update({_id: series._id}, {qc: qc}, function(err) {
                if (err) {
                    console.log(err);
                }
            });
            //series.save(next);
        }
    });
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
