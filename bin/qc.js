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
    //logger.info("querying un-qc-ed series -- "+ new Date());
    // get primary images that are not qc-ed
    db.Series.aggregate([
        {$match: {
            $and: [
                {qc: {$exists: false}},
                {qc1_state: {$ne: 'no template'}}
            ],
            updatedAt: {$lt: new Date(new Date().getTime() - 1000 * 30)} //wait for 30 seconds since last update
        }},{$sample: {size:config.qc.series_batch_size}}
    ]).exec(function(err,series){
    
        if(err) return cb(err);

        logger.info("Un-qc-ed Series retrieved: "+ series.length);

        async.forEach(series,qc_images,function(err) {
            if (err) return cb(err);

            // update exams reccords 
            var exams2qc = [];
            
            series.forEach(function(ss){
                if (exams2qc.indexOf(ss.exam_id.toString()) == -1){
                    exams2qc.push(ss.exam_id.toString());
                }
            });

            if(exams2qc.length > 0) {
                logger.info(exams2qc.length + " Exams to be updated"); //: "+exams2qc)
                exams2qc.forEach(function(ee){
                    qc_funcs.exam.qc_exam(ee,function(err){
                        if (err) return cb(err);
                        //console.log('Done with exam: ', ee);
                    })
                })
            }


            if(exams2qc.length > 0) {
                logger.info("Batch complete. Starting next batch...");
                run(cb);
            } else {
                setTimeout(function() {
                    run(cb);
                }, 1000*10);
            }
        })
    });
}

//iii) Compare headers on the images with the chosen template (on fields configured to be checked against) and store discrepancies. 
function qc_images(series,next) {

    // find the primary image for this series
    db.Image.findOne({"series_id":series._id, "primary_image":null},function(err,primimage) {
        if (err) return next(err);
        console.log(`primary image for this series : ${primimage._id}`);
                
        // find template for this series
        find_template(series, function(err,template) {
            if (err) return next(err);
            if (!template) return next(null,null);

            find_template_primary(template,function(err,primtemplate) {
                if (err) return next(err);
                if (!primtemplate) return next(null,null); // This case should only happen when the tarball for this template set is not "old" enough

                // Now find all image headers for this series
                db.Image.find({series_id: series._id},function(err,images) {
                // db.Image.find({$or: [ {primary_image: primimage._id},{_id:primimage._id}]},function(err,images) {
                    if (err) return next(err);
                    //console.log(`number of images for this series : ${images.length}`);
                    qc_the_series(images,primimage,primtemplate,function(err) {
                        if (err) return next(err);
                        //console.log(images.length + " images have been qc-ed, now aggregating qc for the series "+ primimage.headers.qc_series_desc + " -- " + new Date());

                        qc_funcs.series.qc_series(series,images,template,function(err) {
                            if (err) return next(err);

                            console.log(series._id + " Series has been qc-ed")
                            return next();
                        });
                    });
                });
            });
        });
    });
}

// ************************** QC functions ********************************//

function qc_the_series(images,primimage,primtemplate,cb) {
    async.each(images, function(image, callback) {
        qc_one_image(image, primimage, primtemplate, function(err) {
            if(err) callback(err);
            callback();
        });
    }, function(err) {
        cb(err);
    })
};


function qc_one_image(image,primimage,primtemplate,cb) {
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
	        var hasEchoNumbers = false;
	        if (primtemplate.EchoNumbers !== undefined && image.EchoNumbers !== undefined && primtemplate.EchoNumbers !== image.EchoNumbers) {
                hasEchoNumbers = true;	
                // console.log(" header has EchoNumbers that don't match --- "+ "primtemplate.EchoNumbers " +primtemplate.EchoNumbers + " image.EchoNumbers "+ image.EchoNumbers)
            }

            if ((image.InstanceNumber !== primtemplate.InstanceNumber) || hasEchoNumbers) {  // check if primary template is the header for the current image
                get_template_image(primtemplate,image, function(err,templateheader) {
                    if (err) return next(err);
                    
                    if (templateheader) {
                        //console.log("matching template header "+ templateheader.InstanceNumber+ " with image header " + image.InstanceNumber);
                        qc_funcs.template.match(image,templateheader,qc);
                        next()                       
                    }
                    else {
                        console.log("No template");
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
            image.save();
            next();

            // db.Image.findOneAndUpdate({
            //     _id: image._id,
            // },{
            //     qc:qc
            // }, {'new': true}, function(err,new_image){
            //     if(err) next(err);
            //     if (!new_image) next("something broke!")
            //     return next();
            // })
        }


    ], function(err) {
        if(err) {
            logger.error(err);
            return cb(err);
        }
        cb();
    });
}

function find_template(series, cb) {

    if (series.override_template_id) {
        get_override_template(series,cb)

    } else {
        get_mostrecent_template(series,cb)
    }
}


function get_override_template(series,cb) {
    db.Template.findOne({
        _id: series.override_template_id,
        series_desc: series.series_desc,
    },function(err,template) {
        if (err) return cb(err);
        update_qc1(series,template,cb)
    }) 
}


function get_mostrecent_template(series, cb) {
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
            //console.log(texams.length + " template exams retrieved for research_id "+exam.research_id);
            if (!texams || texams.length == 0) {
                logger.info("couldn't find any exam templates for series:"+series._id+" and research_id:"+exam.research_id);
                return update_qc1(series,null,cb);
            } else {
                db.Template.findOne({
                    exam_id: texams[0]._id,
                    series_desc: series.series_desc,
                    deprecated_by: null,
                    updatedAt: {$lt: new Date(new Date().getTime() - 1000 * 30)}
                },function(err,temp) {
                    if (err) return cb(err);
                    return update_qc1(series,temp,cb);        
                }) 
            }                                      
        })
    });
}

function update_qc1(series,template,cb){
    if(!template) {
        if (series.qc1_state == 'no template'){
            return cb(null);
        } else {
            series.qc1_state = 'no template';
            db.Series.findOneAndUpdate({_id: series._id},{qc1_state:series.qc1_state},function(err) {
                if (err) return cb(err);
                return cb(null);
            })                 
        }                        
    } else {
        cb(null,template)
    } 
}



function find_template_primary(template,cb) {
    // find the template primary header
    db.TemplateHeader.findOne({
        template_id: template._id,
        primary_image: null,
    },function(err,primtemplate) {
        if(err) return cb(err);
        cb(null,primtemplate);
        // make sure all template images have been cleaned and stored
        // qc_funcs.instance.check_tarball_mtime(primtemplate.headers, function(err,mtime) {
        //     if(err) return cb(err);
        //     if (mtime > config.qc.tarball_age || mtime < 0 ) {
        //         cb(null,primtemplate);
        //     } else {
        //         cb(null,null);
        //     }
        // })
    })
}

function get_template_image(primtemplate,image,cb) {
    db.TemplateHeader.findOne({
        primary_image: primtemplate._id, 
        InstanceNumber: image.InstanceNumber,
	    EchoNumbers: image.EchoNumbers !== undefined ? image.EchoNumbers : undefined,
    }, function(err,templateheader){
        if (err) cb(err)
        if (!templateheader) {
            //console.log("template header with instance number"  +InstanceNumber + " not found");
            cb(null);
        } else {
            // console.log("template header with instance number"  +templateheader.InstanceNumber + " and EchoNumbers "+ templateheader.EchoNumbers+ " and image with EchoNumbers is "+ image.EchoNumbers);
            qc_funcs.instance.reconstruct_header(templateheader, primtemplate, function() {
                cb(null,templateheader)
            })
        }

    });
}
