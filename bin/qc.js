#!/usr/bin/node
'use strict';

//contrib
var winston = require('winston');
var async = require('async');
var _ = require('underscore'); 

//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../api/models');
var qc_funcs = require('../api/qc');

//connect to db and start processing batch indefinitely
db.init(function(err) {
    run(function(err) {
        if(err) throw err;
    });
});

function run(cb) {
    logger.info("querying un-qc-ed series -- "+ new Date());
    // get primary images that are not qc-ed=
    db.Series.find({qc: {$exists: false}}).limit(config.qc.series_batch_size).exec(function(err, series) { 
        if(err) return cb(err);

        logger.info("Un-qc-ed Series retrieved: "+ series.length);

        async.forEach(series,qc_images,function(err) {
            if (err) return cb(err);

            logger.info("Batch complete. Sleeping before next batch");

            setTimeout(function() {
                run(cb);
            }, 1000*3);
        })
    });
}

//iii) Compare headers on the images with the chosen template (on fields configured to be checked against) and store discrepancies. 
function qc_images(series,next) {

    // find the primary image for this series
    db.Image.findOne({"series_id":series._id, "primary_image":null},function(err,primimage) {
        if (err) return next(err);
        console.log(`primary image for this series : ${primimage._id}`);

        // make sure all images in this series have been cleaned and stored
        qc_funcs.instance.check_tarball_mtime(primimage.headers, function(err,mtime) {
            if (err) return next(err);        
            logger.info("file last modified " +mtime + "seconds ago")

            if (mtime > config.qc.tarball_age) {  // file has not been modified in the last 2 minutes
                logger.info("QC-ing batch series_id:" + series.id + " and description " + primimage.headers.qc_series_desc);
                
                // find template for this series
                find_template(series, function(err,template) {
                    if (err) return next(err);
                    if (!template) return next(null,null); 

                    find_template_primary(template,function(err,primtemplate) {
                        if (err) return cb(err);
                        if (!primtemplate) return next(null,null); // This case should only happen when the tarball for this template set is not "old" enough 
                        
                        // Now find all image headers for this series 
                        db.Image.find({$or: [ {primary_image: primimage._id},{_id:primimage._id}]},function(err,images) {
                            if (err) return next(err);
                            console.log(`number of images for this series : ${images.length}`); 
                            
                            qc_the_series(images,primimage,primtemplate,function(err) {
                                if (err) return next(err);
                                console.log(images.length + " images have been qc-ed, now aggregating qc for the series "+ primimage.headers.qc_series_desc + " -- " + new Date());

                                qc_funcs.series.qc_series(series,images);

                                logger.info(primimage.headers.qc_series_desc + " Series has been qc-ed")
                                return next();
                            })
                        }); 
                    })
                })
            } else { // tarball was recently modified; do not qc this series
                return next();
            }
        })
    });
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
            qc_funcs.instance.reconstruct_header(image,primimage,next);
        },

        function(next) {
            if (image.InstanceNumber !== primtemplate.InstanceNumber) {  // check if primary template is the header for the current image
                get_template_image(primtemplate,image.InstanceNumber, function(err,templateheader) {
                    if (err) return next(err);
                    
                    if (templateheader) {
                        console.log("matching template header "+ templateheader.InstanceNumber+ " with image header " + image.InstanceNumber);
                        qc_funcs.template.match(image,templateheader,qc); 
                        next()                       
                    }
                    else {
                        qc.notemp = true;
                        next()
                    }  // template header is missing for this instance number                                  
                })
            } else {  
                qc_funcs.template.match(image,primtemplate,qc);
                next()
            } 
        },

        function(next) {
            image.qc = qc;

            db.Image.findOneAndUpdate({
                _id: image._id,
            },{
                qc:qc
            }, {'new': true}, function(err,new_image){
                if(err) next(err);
                if (!new_image) console.log("something broke!")
                //console.log(new_image)
                return next();
            }) 
        }


    ], function(err) {
        if(err) logger.error(err)
        next();
    });
}


// ************************** Template functions ********************************//
function find_template(series, cb) {

    get_template(series, function(err, template) {
        if(err) return cb(err);
        if(!template) {
            logger.info("couldn't find template for series:"+series._id);
            qc_funcs.series.update_exam(series,false);

            return cb(null);
        }
        cb(null,template)
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
                
        db.Exam.find({"research_id":exam.research_id, "istemplate":true})
            .sort({"StudyTimestamp":-1})  //.sort('-date')
            .exec(function(err,texams) {
                if (err) return cb(err);
                console.log(texams.length + " template exams retrieved for research_id "+exam.research_id);
                if (!texams || texams.length == 0) {
                    logger.info("couldn't find template for exam:"+series._id+" and research_id:"+exam.research_id);
                    return cb(null,null);
                } else {
                    db.Template.findOne({
                        exam_id: texams[0]._id,
                        series_desc: series.series_desc,
                        deprecated_by: null
                    },function(err,temp) {
                        if (err) return cb(err);
                        return cb(null,temp)        
                    }) 
                }                                      
            })
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
        qc_funcs.instance.check_tarball_mtime(primtemplate.headers, function(err,mtime) {
            if(err) return cb(err);
            if (mtime > config.qc.tarball_age) {
                cb(null,primtemplate);
            } else {
                cb(null,null);
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
            qc_funcs.instance.reconstruct_header(templateheader, primtemplate, function() {
                cb(null,templateheader)
            })
        }

    });
}

// ************************** other functions ********************************//


// function check_tarball_mtime(primimage,cb) {
//     // check for the last modified date on the coresponding tar file
//     var path2tar = config.cleaner.raw_headers+"/"+primimage.qc_iibisid+"/"+primimage.qc_subject+"/"+primimage.StudyInstanceUID+"/"+primimage.qc_series_desc+".tar";          
//     fs.stat(path2tar,function(err,stats){
//         if (err) cb(err); 
//         var mtime = (parseInt((new Date).getTime()) - parseInt(new Date(stats.mtime).getTime()))/1000;
//         cb(null,mtime);
//     });
// }
