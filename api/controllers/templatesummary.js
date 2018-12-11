'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');
var jwt = require('express-jwt');
var fs = require('fs');
var mkdirp = require('mkdirp');


//mine
var config = require('../../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');
var mongoose = require('mongoose');


// move headers from dicom-raw to dicom-deleted
function moveDeletedHeaders(h,cb){

    logger.info("Moving headers from dicom-raw into dicom-deleted");
    var origin_dir = config.cleaner.raw_headers;
    var dest_dir = config.cleaner.deleted_headers;
    var path = h.headers.qc_iibisid+"/"+h.headers.qc_subject+"/"+h.headers.StudyInstanceUID+"/"+h.headers.qc_series_desc;          
    var now = new Date();
    var deleted_dirname = dest_dir+"/"+path+"/" + now.getFullYear() + "-"+ now.getMonth() + "-" + now.getDate()+ "-"+ now.getHours() + "-" + now.getMinutes()

    fs.exists(deleted_dirname, function (exists) {
        console.log(exists)
        console.log(deleted_dirname)
        if(!exists) {
            console.log("creating directory to migrate headers")
            mkdirp.sync(deleted_dirname);
        }
        fs.rename(origin_dir+"/"+path+"/",deleted_dirname+"/", function(err) {
            if (err) return cb(err);
            fs.unlink(origin_dir+"/"+path+".tar",function(err){
                if (err) return cb(err);
                return cb();
            })
        });
    });
}



router.get('/istemplate', jwt({secret: config.express.jwt.pub}),function(req,res,next) {
    db.Exam.aggregate([
        {$match: {
            istemplate:true
            }
         },{$group: {
             _id:"$research_id",
             StudyTimestamp: {$addToSet:"$StudyTimestamp"},
             exam_id: {$addToSet:"$_id"},
             }
         },{$lookup: {
                 from:"researches",
                 localField:"_id",
                 foreignField:"_id",
                 as:"fromResearch"
                 }
         },{ $project: {
                 StudyTimestamp: 1, 
                 exam_id:1,
                 count: { $size: "$exam_id" },       
                 IIBISID: "$fromResearch.IIBISID",
                 Modality: "$fromResearch.Modality",
                 StationName: "$fromResearch.StationName",
                 radio_tracer: "$fromResearch.radio_tracer"
                 }
         },{$unwind:"$IIBISID"},
         {$unwind:"$Modality"},
         {$unwind:"$StationName"},
         {$unwind:"$radio_tracer"}
        ], function (err, data) {
             if (err) {
                 next(err);
             } else {
                 res.json(data);
                 console.log(`retrieved ${data.length} templates from exam db ...`);
             }
    });
});


// search template's by research_id and group them by exam_id:
router.get('/texams/:exam_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
        
    var template_instance = {
        date: null,
        exam_id: null,
        series: [],
        usedInQC:0
    };

    db.Exam.findById(new mongoose.Types.ObjectId(req.params.exam_id), function(err,texam) {
        if (err) return next(err);
        template_instance.date = texam.StudyTimestamp;
        template_instance.exam_id = texam._id;

        db.Template.find({"exam_id":texam._id},function(err,templates){
            if (err) return next(err);

            templates.forEach(function(t,ind){

                db.Series.find({"qc.template_id":t._id}).count(function (err, usedInQC) {
                    if (err) return next(err);

                    template_instance.usedInQC = usedInQC==0 ? template_instance.usedInQC : template_instance.usedInQC+1;

                    db.TemplateHeader.find({"template_id":t._id}).count(function(err,imageCount){
                        if(err) return next(err);
                        
                        var tobj = {
                            SeriesNumber: t.SeriesNumber,
                            series_desc: t.series_desc,
                            template_id: t._id,
                            imageCount: imageCount,
                            usedInQC: usedInQC
                        };

                        template_instance.series.push(tobj);
                        
                        if(template_instance.series.length == templates.length) {
                            res.json(template_instance);
                        }
                    })
                });
            })                         
        })                
     });
});



// delete a template series
router.get('/deleteselected/:template_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    
    db.Template.findById(new mongoose.Types.ObjectId(req.params.template_id),function(err,template){
        if (err) return next(err);

            db.TemplateHeader.findOne({"template_id":template._id,primary_image:null}).exec(function(err,h){
                if(err) return next(err);

                // Move files from dicom-raw to dicom-deleted 
                 moveDeletedHeaders(h,function(err){
                     if (err) return next(err);
                     db.TemplateHeader.deleteMany({"template_id":template._id},function(err) {
                        if (err) return next(err);
    
                        db.Template.deleteOne({_id:template._id},function(err){
                            if (err) return next(err);
                            res.send("Template series deleted successfully!! -- id: "+template._id+ " series_desc: "+template.series_desc)
                        })
                    }) 
                 })

                // var origin_dir = config.cleaner.raw_headers;
                // var dest_dir = config.cleaner.deleted_headers;
                // var path = h.headers.qc_iibisid+"/"+h.headers.qc_subject+"/"+h.headers.StudyInstanceUID+"/"+h.headers.qc_series_desc;          
                // var now = new Date();
                // var deleted_dirname = dest_dir+"/"+path+"/" + now.getFullYear() + "-"+ now.getMonth() + "-" + now.getDate()+ "-"+ now.getHours() + "-" + now.getMinutes()

                // fs.exists(deleted_dirname, function (exists) {
                //     console.log(exists)
                //     console.log(deleted_dirname)
                //     if(!exists) {
                //         console.log("creating directory to migrate headers")
                //         mkdirp.sync(deleted_dirname);
                //     }
                //     fs.rename(origin_dir+"/"+path+"/",deleted_dirname+"/", function(err) {
                //         if (err) return next(err);
                //         fs.unlink(origin_dir+"/"+path+".tar",function(err){
                //             if (err) return next(err);
                //         })
                //     });
                // });
                
                // db.TemplateHeader.deleteMany({"template_id":template._id},function(err) {
                //     if (err) return next(err);

                //     db.Template.deleteOne({_id:template._id},function(err){
                //         if (err) return next(err);
                //         res.send("template deleted successfully!! -- id: "+template._id+ " series_desc: "+template.series_desc)
                //     })
                // })                
            })
        })                         
})



// delete a template exam
router.get('/deleteall/:exam_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    
    db.Template.find({"exam_id":new mongoose.Types.ObjectId(req.params.exam_id)},function(err,templates){
        if (err) return next(err);

        templates.forEach(function(temp){

            db.TemplateHeader.findOne({"template_id":temp._id,primary_image:null}).exec(function(err,h){
                if(err) return next(err);

                // Move files from dicom-raw to dicom-deleted 
                 moveDeletedHeaders(h,function(err){
                     if (err) return next(err);

                     db.TemplateHeader.deleteMany({"template_id":temp._id},function(err) {
                        if (err) return next(err);
    
                        db.Template.deleteOne({_id:temp._id},function(err){
                            if (err) return next(err);                            
                        })
                    }) 
                 })
            })
        }) 
        db.Exam.deleteOne({_id:new mongoose.Types.ObjectId(req.params.exam_id)},function(err){
            if (err) return next(err);
            res.send("Template exam deleted successfully!!")
        })
    })
})


module.exports = router;
