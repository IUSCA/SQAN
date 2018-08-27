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
            setTimeout(function() {
                run(cb);
            }, 1000*3);
        });
    });
}

//iii) Compare headers on the images with the chosen template (on fields configured to be checked against) and store discrepancies. 
function qc(image, next) {
    logger.info("QC-ing image_id:"+image.id+ '-- primary: '+image.primary_image);
    reconstruct_header(image, function (err,image){        
        if (err) return next(err);
        console.log('cb -- reconstruct_header -- reconstructed image')
        
        find_template_headers(image, function(err, templateheaders) {
            //console.log(`cb -- find_template_headers -- reconstructed template: ${templateheaders}`)
            console.log(`template instance number is ${templateheaders.InstanceNumber}
            image instance number is ${image.InstanceNumber}`);
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
                //console.log(err);
                if(err) return next(err);
                //invalidate series qc
                db.Series.update({_id: image.series_id}, {$unset: {qc: 1}}, {multi: true}, next);
            });
         });
    });        
    next() 
}

function reconstruct_header(header,cb) {
    console.log('reconstruct_header')
    if (header.primary_image !== null) { //image is not primary image
        console.log('reconstruct_header -- image is not primary image')
        if (header.template_id) {// header is a templateheader
            console.log('reconstruct_header -- header is a template')
            db.TemplateHeader.findById(header.primary_image,function(err,primary_image){
                if (err) return cb(err)
                rec(primary_image,header,function() {
                    cb(null,header)
                });
            });
        } else if (header.series_id) { // header is a image header
            console.log('reconstruct_header -- header is an image')
            db.Image.findById(header.primary_image,function(err,primary_image){
                if (err) return cb(err)
                rec(primary_image,header,function(){
                    cb(null,header);
                })
            });
        } else {
            console.log('header is not image nor template!'); 
            cb(err,null)
        }
    } else {
        console.log('reconstruct_header -- image is a primary -- no reconstruction')
        cb(null,header);
    }
}


function rec(_primary_image, _header,cb) {
    for (var k in _primary_image.headers) {     
        var v = _primary_image.headers[k]; 
        if (!_header.headers[k]) {                      
            _header.headers[k] = v;
        }       
    };
    cb(null,_header);
}


function find_template_headers(image, cb) {
    //find series first
    db.Series.findById(image.series_id, 'template_exam_id series_desc exam_id', function(err, series) {
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
                InstanceNumber: image.InstanceNumber,
                EchoNumbers: image.EchoNumbers !== undefined ? image.EchoNumbers : null,
            }, function(err,templateheader){
                if (err) cb(err)
                console.log(`find_template_headers -- template header found:  ${templateheader._id}`);
                reconstruct_header(templateheader, function(err,templateheader) {
                    if(err) cb(err);
                    cb(null,templateheader);
                })
            });
        });
    });
}

//TODO cache the result if same series is requested?
function get_template(series, cb) {
    //find the latest exam
    db.Exam
        .findById(series.exam_id, 'research_id')
        .sort('-date')
        .exec(function(err, exam) {
        if(err) return cb(err);
        if(!exam) return cb(null, null);
        if(exam.length > 1) exam = exam[0]; // if more than one exam is found, it will be returned in an array
        pick_template(series, exam.research_id, cb);
    });
}


function pick_template(series, research_id, cb) {
    db.Template.find({
        research_id: research_id,
        series_desc:series.series_desc,
        //SeriesNumber:series.SeriesNumber,
    }).sort({"date":-1,"SeriesNumber":-1}).limit(1)
    .exec(function(err, template) {
        if(err) return cb(err);
        if(template.length == 0) {                    
            logger.error("no templates found for series: " + series.series_desc + "and exam_id: "+ series.exam_id);
            return cb();            
        }
        //console.log('inside pick_template function and this is the template: ')
        //find series with longest prefix (or bigger SeriesNumber if there is duplicate template under the series_desc)
        // var longest = null;
        // templates.forEach(function(template) {
        //     var tdesc = template.series_desc;
            
        //     //remove trailing numbers from tdesk
        //     //so that template:abc123 will match series:abc456
        //     //(warning - until I store 'missing series' as part of exam qc status (there is no such thing right now)
        //     //UI dynamically generates list of missing series. This truncation needs to happen in ui as well
        //     //(see ui/js/controllers.js@organize)
        //     tdesc = tdesc.replace(/\d+$/, '');
        //     //TODO: this is ugly
        //     if(longest == null) {
        //         var ldesc = tdesc;
        //     } else {
        //         var ldesc = longest.series_desc.replace(/\d+$/, '');
        //     }

        //     if(~series.series_desc.indexOf(tdesc)) {
        //         if(longest == null || 
        //             ldesc.length < tdesc.length ||
        //             (ldesc.length == tdesc.length && longest.SeriesNumber < template.SeriesNumber)) {
        //             longest = template; //better match
        //         }
        //     }
        // });
        //console.log(template[0])
        //console.log('and this is the template_id: '+ template[0]._id)
        cb(null, template[0]);
    });
}





