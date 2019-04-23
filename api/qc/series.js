#!/usr/bin/node
'use strict';

const _ = require('underscore'); 
var async = require('async');

var config = require('../../config');
const db = require('../models');
// const events = require('../events');
var fs = require('fs');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var tar = require('tar');



//connect to db and start processing batch indefinitely
db.init(function(err) {
    if(err) throw err;
});

function qc_series(series,images,template,cb) {

    //console.log("qc_series: "+series._id + " -- series description " +series.series_desc);

    var all_qced = true;
    //var errored_InstanceNumber = [];
    var template_mismatch = 0;  // number of fields with template_mismatch error
    var not_set = 0;  // number of fields with not_set error
    var image_tag_mismatch = 0;  // number of tags found in image but not in templates
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

        template_id: template._id, //template set used to do qc for this series (sampled from one images's qc.template_id)
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
                    //errored_InstanceNumber.push(image.InstanceNumber);
                    qc.errored_images++;
                    template_mismatch +=  image.qc.error_stats.template_mismatch;
                    not_set += image.qc.error_stats.not_set;
                    image_tag_mismatch += image.qc.error_stats.image_tag_mismatch;
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
        //console.log("cannot qc the series because not all images have been qc-ed");
        // This should not happen, unless a series has too many images and cannot be retrieved all at once. 
        return 
    } else {
        qc.series_fields_errored = template_mismatch + not_set + image_tag_mismatch;
        //qc.template_id = images[0].qc.template_id;
        
        //check for template header count 
        db.TemplateHeader.where({template_id: qc.template_id}).count(function(err, tc) {            
            if (err) console.log(err);

            qc.template_image_count = tc;
            diff = qc.template_image_count - qc.series_image_count; 
            
            if(qc.errored_images > 0) {
                qc.errors.push({
                    type: "image_errors", 
                    msg: "Series contains "+qc.errored_images+" images with qc errors", 
                    c: qc.errored_images,
                    per: qc.errored_images / qc.template_image_count,
                }); 
                
                if(template_mismatch > 0) {
                    qc.errors.push({
                        type: "template_mismatch", 
                        msg: "Series contains "+template_mismatch+" fields with 'template_mismatch' error", 
                        c: template_mismatch,
                        per: template_mismatch / qc.template_field_count,
                    });  
                }
     
                if(not_set > 0) {
                    qc.errors.push({
                        type: "not_set", 
                        msg: "Series contains "+not_set+" fields with 'not_set' error", 
                        c: not_set,
                        per: not_set / qc.template_field_count,
                    }); 
                }

                if(image_tag_mismatch > 0) {
                    qc.errors.push({
                        type: "image_tag_mismatch", 
                        msg: "Series contains "+image_tag_mismatch+" fields with 'image_tag_mismatch' error", 
                        c: image_tag_mismatch,
                        per: image_tag_mismatch / qc.series_field_count,
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
                    
            if(diff !== 0) {
                qc.errors.push({
                    type: "image_count_mismatch", 
                    msg: diff > 0 ? "Series is missing "+diff+ " image headers":"Series has "+Math.abs(diff)+ " excess image headers",
                    c: images.length, 
                    tc: qc.template_image_count
                });
            }
    
            series.qc1_state = (qc.errors.length > 0 ? "fail" : "autopass");
            series.qc = qc;
            // events.series(series);
            db.Series.update({_id: series._id}, {qc: qc, qc1_state: series.qc1_state}, function(err) {
                if (err) {
                    console.log(err);
                    return cb(err);
                }
                cb()
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



function unQc_series(series_id,new_event,cb) {

    // console.log("deprecating series "+series_id)

    // first record previous qc state
    db.Series.findOne({_id:series_id},function(err,series){

        var detail= {
            date_qced: null,
            template_id: null,
            qc1_state: null,
        }

        if(typeof series.qc === 'object' && series.qc !== null) {
            detail.date_qced = series.qc.date;
            detail.template_id = series.qc.template_id;
        }
        if (series.qc1_state) detail.qc1_state = series.qc1_state;

        new_event.detail = detail;
        
        // Now Un-qc the series
        db.Series.update({
            _id: series._id,
        }, {$unset:{qc:1},qc1_state:"re-qcing", $push: { events: new_event }}, 
        function(err) {   
            if(err) return cb(err);
            // deprecate all images in that series so that they can be overwritten
            db.Image.deleteMany({
                series_id: series._id,
            }, function(err) {
                if(err) return cb(err);
                return cb();
            })
        })
    })
}


function overwritte_template(template_id,new_event,cb) {

    //console.log("overwritting template "+template_id)
        
    // Now Un-qc the series
    db.Template.update({
        _id: template_id,
    }, { $push: { events: new_event }}, 
    function(err) {   
        if(err) return cb(err);
        // deprecate all images in that series
        db.TemplateHeader.deleteMany({
            template_id: template_id,
        }, function(err) {
            if(err) return cb(err);
            return cb();
        })
    })
}



// move template headers from dicom-raw to dicom-deleted
function deprecate_series(h,type,cb){

    //console.log("Moving headers from dicom-raw into dicom-deleted");
    var path = h.qc_iibisid+"/"+h.qc_subject+"/"+h.StudyInstanceUID+"/"+h.qc_series_desc;              
    var new_dirname = config.cleaner.deleted_headers+"/"+path+"/";

    if (!file_exists(new_dirname)){
        console.log("creating directory to migrate headers -- "+new_dirname);
        mkdirp(new_dirname, function(err){
            if (err) {
                console.log("error in creating new_directory "+ path+ " : "+err);
                return cb(err);
            } else {
                delete_and_move(path,type,function(err){
                    if (err) return cb(err);
                    else return cb();
                })
            }
        });
    } else {
        delete_and_move(path,type,function(err){
            if (err) return cb(err);
            else return cb();
        })
    }
}


var file_exists = function(path2file){
    try {
        if (fs.existsSync(path2file)) {
            //console.log(path2file+ " exists" );
            return true;
        }
      } catch(err) {
        //console.log(path2file+ " does not exist: "+ err.code);
        return false;
      }
}


function delete_and_move(path,type,cb) {

    var now = new Date();
    var timestamp = now.getFullYear() + "-"+ now.getMonth() + "-" + now.getDate()+ "-"+ now.getHours() + "-" + now.getMinutes();
    var file2rename = config.cleaner.raw_headers+"/"+path+".tar";

    if (file_exists(file2rename)){
        console.log("renaming file -- "+file2rename +" ==> " +config.cleaner.deleted_headers+"/"+path+"/"+type+"_"+timestamp+".tar");

        fs.rename(file2rename,config.cleaner.deleted_headers+"/"+path+"/"+type+"_"+timestamp+".tar", function(err) {
            if (err) return cb(err);
            console.log("deleting files in directory -- "+config.cleaner.raw_headers+"/"+path)
            //rimraf(config.cleaner.raw_headers+"/"+path+"/*", function (err) { 
                //if (err) return cb(err);
                tar.c({file: file2rename},['/dev/null']
                    ).then(cb);
            //});
        });
    } else {
        //console.log(file2rename+ " does not exist but it shoud.... ");
        return cb();
    }
}

exports.file_exists = file_exists;
exports.qc_series = qc_series;
exports.unQc_series = unQc_series;
exports.deprecate_series = deprecate_series;
exports.overwritte_template = overwritte_template;
