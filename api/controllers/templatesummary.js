'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');
var jwt = require('express-jwt');

//mine
var config = require('../../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');
var mongoose = require('mongoose')

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
        details: [],
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

                        template_instance.details.push(tobj);
                        
                        if(template_instance.details.length == templates.length) {
                            res.json(template_instance);
                        }
                    })
                });
            })                         
        })                
     });
});


module.exports = router;
