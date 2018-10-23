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
var qc_aggregate = require('../api/qc/series')
//var qc_aggregate = require('./qc_series_aggregate');

//connect to db and start processing batch indefinitely
db.init(function(err) {
    run(function(err) {
        if(err) throw err;
    });
});

function run(cb) {
    logger.info("querying un-qc-ed series -- "+ new Date());
    // get primary images that are not qc-ed=
    db.Image.find({qc: {$exists: false},primary_image:null}).limit(config.qc.primimg_batch_size).exec(function(err, primimages) { //config.qc.batch_size
        if(err) return cb(err);

        logger.info("primary images retrieved: "+ primimages.length);

        async.forEach(primimages,qc_images,function(err) {
            if (err) return cb(err);

            logger.info("Batch complete. Sleeping before next batch");

            setTimeout(function() {
                run(cb);
            }, 1000*3);
        })
    });
}

//iii) Compare headers on the images with the chosen template (on fields configured to be checked against) and store discrepancies. 
function qc_images(primimage,next) {

    // make sure all images in this series have been cleaned and stored
    check_tarball_mtime(primimage.headers, function(err,mtime) {
        if (err) return next(err);        
        logger.info("file last modified " +mtime + "seconds ago")

        if (mtime > config.qc.tarball_age) {  // file has not been modified in the last 2 minutes
            logger.info("QC-ing batch with primary_image_id:"+primimage.id + " InstanceNumber " + primimage.InstanceNumber+ " and description " + primimage.headers.qc_series_desc);
            
            // find template for this series
            find_template(primimage, function(err,template) {
                if (err) return next(err);
                if (!template) return next(null,null); 
        
                find_template_primary(template,function(err,primtemplate) {
                    if (err) return cb(err);
                    if (!primtemplate) return next(null,null); // this case should not happen -> if template collection exists, then there should be at least one image for this template
                    
                    // Now find all image headers for this series 
                    db.Image.find({$or: [ {primary_image: primimage._id},{_id:primimage._id}]},function(err,images) {
                        if (err) return next(err);
                        console.log(`number of images for this series : ${images.length}`); 
                        
                        qc_the_series(images,primimage,primtemplate,function(err) {
                            if (err) return next(err);
                            console.log(images.length + " images have been qc-ed, now aggregating qc for the series "+ primimage.headers.qc_series_desc + " -- " + new Date());
                            db.Series.findById(primimage.series_id, function(err,series) {
                                if (err) return next(err);

                                qc_aggregate.qc_series(series,images);

                                logger.info(primimage.headers.qc_series_desc + " Series has been qc-ed")
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

// ************************** QC functions ********************************//

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
        error_stats: {}
    };

    async.series([
        function(next) {
            reconstruct_header(image,primimage,next);
        },

        function(next) {
            if (image.InstanceNumber != primtemplate.InstanceNumber) {  // check if primary template is the header for the current image
                get_template_image(primtemplate,image.InstanceNumber, function(err,templateheader) {
                    if (err) return next(err);
                    
                    if (templateheader) {
                        console.log("matching template header "+ templateheader.InstanceNumber+ " with image header " + image.InstanceNumber);
                        qc_template.match(image,templateheader,qc); 
                        next()                       
                    }
                    else {
                        qc.notemp = true;
                        next()
                    }  // template header is missing for this instance number                                  
                })
            } else {  
                qc_template.match(image,primtemplate,qc);
                next()
            } 
        },

        function(next) {
            image.qc = qc;
            image.save(function(err) {
                if(err) next(err);
                return next();
            });
        }
    ], function(err) {
        if(err) logger.error(err)
        next();
    });
}


// ************************** Template functions ********************************//
function find_template(image,cb) {
    db.Series.findById(image.series_id, 'template_exam_id series_desc exam_id', function(err, series) {
        if(err) return cb(err);
        if(!series) return cb("couldn't find such series: "+image.series_id);
        //then find template
        get_template(series, function(err, template) {
            if(err) return cb(err);
            if(!template) {
                logger.info("couldn't find template for series:"+series._id+" and image_id:"+image._id);
                db.Exam.update({"_id": series.exam_id, "qc.series_desc": series.series_desc}, 
                {$set: {"qc.$.status": "no_temp"}}, {upsert:false}, function(err) {
                    if (err) return cb(err);         
                })
                return cb(null);
            }
            cb(null,template)
        })
    })
}



function get_template(series, cb) {
    //find the research_id by looking in the exam doc
    db.Exam
        .findById(series.exam_id, 'research_id')
        .exec(function(err, exam) {
        if(err) return cb(err);
        if(!exam) {
            logger.info("couldn't find such exam: "+series.exam_id);
            return cb(null);
        }
        db.Template.find({
            research_id:exam.research_id,
            series_desc:series.series_desc,
            deprecated_by: null
        }).sort('-date')
        .exec(function(err,templates){
            if (err) return cb(err);
            console.log(templates);
            cb(null,templates[0]);
        })
        // db.Exam.find({
        //     research_id: exam.research_id,
        //     istemplate: true
        // }).exec(function(err,texams){
        //     if(err) return cb(err);
        //     //console.log(texams);
        //     var latest = null;
        //     texams.forEach(function(te,index) {
        //         //console.log(te._id)
        //         db.Template.findOne({
        //             exam_id:te._id,
        //             series_desc: series.series_desc,
        //             deprecated_by: null
        //         }).exec(function(err,t) {
        //             if (err) return cb(err);
        //             if(!t) {
        //                 logger.info("couldn't find template for exam id: "+te._id);
        //                 return cb(null);
        //             }
        //             if (latest == null) {                        
        //                 latest = t._id;
        //                 console.log("latest equals t: "+ latest)
        //             }
        //             else {
        //                 latest = t.date > latest.date ? t._id : latest;
        //                 console.log("latest date is " + latest);
        //             }
        //        })    
        //        if (index + 1 == texams.length) {
        //            console.log(latest)
        //             cb(null,latest);
        //        } else {
        //            console.log("index is "+ index + " and texams.length is "+ texams.length);
        //            cb(null,null);
        //        }
        //     })                        
        // });
    });
}


function find_template_primary(template,cb) {
    // find the template primary header
    db.TemplateHeader.findOne({
        template_id: template._id,
        primary_image: null,
    },function(err,primtemplate) {
        if(err) return cb(err);
        // make sure all template images have been cleaned and stored
        check_tarball_mtime(primtemplate.headers, function(err,mtime) {
            if (mtime > config.qc.tarball_age) {
                cb(null,primtemplate);
            } else {
                cb(null);
            }
        })        
    })
}

function get_template_image(primtemplate,InstanceNumber,cb) {
    db.TemplateHeader.findOne({
        primary_image: primtemplate._id, 
        InstanceNumber: InstanceNumber,
    }, function(err,templateheader){
        if (err) cb(err)
        if (!templateheader) {
            //console.log("template header with instance number"  +InstanceNumber + " not found");
            cb(null);
        } else {
            //console.log("template header with instance number"  +templateheader.InstanceNumber + " found");
            reconstruct_header(templateheader, primtemplate, function() {
                cb(null,templateheader)
            })
        }

    });
}

// ************************** other functions ********************************//

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
        //console.log("image with InstanceNumber" +_header.InstanceNumber + " is a primary -- no reconstruction")
        cb();
    }
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
