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
var qc_aggregate = require('./qc_series_aggregate');

//connect to db and start processing batch indefinitely
db.init(function(err) {
    run(function(err) {
        if(err) throw err;
    });
});

function run(cb) {
    logger.info("querying un-qc-ed series -- "+ new Date());
    // get primary images that are not qc-ed=
    db.Image.find({qc: {$exists: false},primary_image:null}).limit(1).exec(function(err, primimages) { //config.qc.batch_size
        if(err) return cb(err);

        console.log(`primary images retrieved: ${primimages.length}`);

        async.forEach(primimages,qc_images,function(err) {
            if (err) return cb(err);

            logger.info("Batch complete. Sleeping before next batch -- "+new Date());
            setTimeout(function() {
                run(cb);
            }, 1000*3);
        })
    });
}

//iii) Compare headers on the images with the chosen template (on fields configured to be checked against) and store discrepancies. 
function qc_images(primimage,next) {
    check_tarball_mtime(primimage.headers, function(err,mtime) {
        if (err) return next(err);        
        console.log("file last modified " +mtime + "seconds ago")
        if (mtime > config.qc.tarball_age) {  // file has not been modified in the last 3 minutes
            console.log("QC-ing batch with primary_image_id:"+primimage.id + " and InstanceNumber " + primimage.InstanceNumber);
            // find template for this series
            find_template(primimage, function(err,template) {
                if (err) return next(err);
                if (!template) return next(null,null); 
                console.log(`template found: ${template._id}`);
        
                find_template_primary(template,function(err,primtemplate) {
                    if (err) return cb(err);
                    if (!primtemplate) return next(null,null); // this case should not happen -> if template collection exists, then there should be at least one image for this template
                    
                    // Now find all image headers for this series 
                    db.Image.find({$or: [ {primary_image: primimage._id},{_id:primimage._id}]},function(err,images) {
                        if (err) return next(err);
                        console.log(`number of images for this series : ${images.length}`); 
                        
                        qc_the_series(images,primimage,primtemplate,function(err) {
                            if (err) return next(err);
                            console.log(" All images have been qc-ed, now aggregating qc for the series");
                            db.Series.findById(primimage.series_id, function(err,series) {
                                if (err) return next(err);
                                console.log(series);
                                qc_aggregate.qc_series(series)
                                //if (err) console.log("error aggregating qc at the series level " + err);
                                console.log("Series has been qc-ed")
                                return next();
                            })
                        })
                    }); 
                })
            })
        } else { // tarball was recently modified; do not qc this series
            return next();
        }
    })
}

function check_tarball_mtime(primimage,cb) {
    // check for the last modified date on the coresponding tar file
    var path2tar = config.cleaner.raw_headers+"/"+primimage.qc_iibisid+"/"+primimage.qc_subject+"/"+primimage.StudyInstanceUID+"/"+primimage.qc_series_desc+".tar";          
    fs.stat(path2tar,function(err,stats){
        if (err) cb(err); 
        var mtime = (parseInt((new Date).getTime()) - parseInt(new Date(stats.mtime).getTime()))/1000;
        cb(null,mtime);
    });
}

function qc_the_series(images,primimage,primtemplate,cb) {
    // qc each image with the corresponding header
    var counter = 0;
    var ni = images.length;

    images.forEach(function(image) {
        qc_one_image(image,primimage,primtemplate,function(err) {
            if(err) return cb(err); 
            counter++;
            if(counter === ni) {
                return cb()
            }                                  
        })                
    });
}

function qc_one_image(image,primimage,primtemplate,next) {
    var qc = {
        template_id: primtemplate.template_id,
        date: new Date(),
        errors: [],
        warnings: [],
        notemp: false, //set to true if no template was found
    };

    async.series([
        function(next) {
            reconstruct_header(image,primimage,function() {
                console.log("reconstructed image has "+ Object.keys(image.headers).length+ " fields");
                console.log("primary image has "+ Object.keys(primimage.headers).length+ " fields");
                next();
            });

        },

        function(next) {
            if (image.InstanceNumber != primtemplate.InstanceNumber) {  // check if primary template is the header for the current image
                get_template_image(primtemplate,image.InstanceNumber, function(err,templateheader) {
                    if (err) return next(err);
                    
                    if (templateheader) {
                        console.log("reconstructed template has "+ Object.keys(templateheader.headers).length+ " fields");
                        console.log("primary template has "+ Object.keys(primtemplate.headers).length+ " fields");
                        console.log("matching template header "+ templateheader.InstanceNumber+ " with image header " + image.InstanceNumber);
                        qc_template.match(image,templateheader,qc); 
                        next()                       
                    }
                    else {
                        console.log('setting qc.notemp to true');
                        qc.notemp = true;
                        next()
                    }  // template header is missing for this instance number                                  
                })
            } else {  
                console.log("primary template is the corresponding header for this image")
                console.log("matching primary template header "+ primtemplate.InstanceNumber+ " with image header " + image.InstanceNumber);
                qc_template.match(image,primtemplate,qc);
                next()
            } 
        },

        function(next) {
            image.qc = qc;
            console.log("after qc-ing image :" +image.InstanceNumber + " qc is ")
            console.log(image.qc);
            image.save(function(err) {
                if(err) next(err);
                return next();
                //invalidate series qc
                //db.Series.update({_id: image.series_id}, {$unset: {qc: 1}}, {multi: true}, next);
            });
        }
    ], function(err) {
        if(err) logger.error(err)
        next();
    });
}


    
function get_template_image(primtemplate,InstanceNumber,cb) {
    db.TemplateHeader.findOne({
        primary_image: primtemplate._id, 
        InstanceNumber: InstanceNumber,
    }, function(err,templateheader){
        if (err) cb(err)
        if (!templateheader) {
            console.log("template header with instance number"  +InstanceNumber + " not found");
            cb(null);
        } else {
            console.log("template header with instance number"  +templateheader.InstanceNumber + " found");
            reconstruct_header(templateheader, primtemplate, function() {
                cb(null,templateheader)
            })
        }

    });
}


function reconstruct_header(_header,_primary_image,cb) {
    if (_header.primary_image !== null) { //image is not primary image
        for (var k in _primary_image.headers) {     
            var v = _primary_image.headers[k]; 
            if (!_header.headers[k]) {                      
                _header.headers[k] = v;
            }       
        }
        cb()
    } else {
        console.log("image with InstanceNumber" +_header.InstanceNumber + " is a primary -- no reconstruction")
        cb();
    }
}


function find_template(image,cb) {
    db.Series.findById(image.series_id, 'template_exam_id series_desc exam_id', function(err, series) {
        if(err) return cb(err);
        if(!series) return cb("couldn't find such series: "+image.series_id);
        //then find template
        get_template(series, function(err, template) {
            if(err) return cb(err);
            if(!template) {
                logger.info("couldn't find template for series:"+series._id+" and image_id:"+image._id);
                return cb(null);
            }
            cb(null,template)
        })
    })
}


function get_template(series, cb) {
    //find the latest exam
    db.Exam
        .findById(series.exam_id, 'research_id')
        .sort('-date')
        .limit(1)
        .exec(function(err, exam) {
        if(err) return cb(err);
        if(!exam) {
            logger.info("couldn't find such exam: "+series.exam_id);
            return cb(null);
        }
        if(exam.length > 1) exam = exam[0];
        db.Template.find({
            research_id: exam.research_id,
            series_desc:series.series_desc,
            deprecated_by: null,
        }).sort({"SeriesNumber":-1}).limit(1) // I don't think I need this; there should only be one with deprecated_by:null
        .exec(function(err, template) {
            if(err) return cb(err);
            if(template.length == 0) {                    
                //logger.error("no templates found for series: " + series.series_desc + "and exam_id: "+ series.exam_id);
                return cb(null);            
            }
            //console.log('this is the template: '+ template[0])
            cb(null,template[0]);
        });
    });
}

function find_template_primary(template,cb) {
    // find the template primary header
    db.TemplateHeader.findOne({
        template_id: template._id,
        primary_image: null,
    },function(err,primtemplate) {
        if(err) return cb(err);
        check_tarball_mtime(primtemplate.headers, function(err,mtime) {
            if (mtime > config.qc.tarball_age) {
                cb(null,primtemplate);
            } else {
                cb(null);
            }
        })        
    })
}



