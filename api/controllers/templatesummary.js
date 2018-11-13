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
router.get('/examids/:research_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    console.log(req.params.research_id);
    db.Exam.find({"research_id":new mongoose.Types.ObjectId(req.params.research_id),"istemplate":true},{_id: 1}, function(err,_te) {
        if (err) return next(err);
        if (!texams) return res.status(404).json({message: "no template exams for research_id:" + req.params.research_id});
        var texams = [];
        _te.forEach(function(te){
            texams.push(te._id);
        })
        console.log(texams);

        db.Template.aggregate([    
            {$match: {"exam_id": {$in: texams}} },
            {$group:{
                _id:"$exam_id",
                date:{$addToSet:"$date"},
                template_id:{$push: "$_id"},
                series_desc:{$push:"$series_desc"},
                SeriesNumber:{$push:"$SeriesNumber"}            
                }
            },{$unwind:"$date"}
        ],
        function (err, data) {
            if (err) return next(err);
            if (!data) {
                return res.status(404).json({message: "no such research_id:" + req.params.research_id});
            } else {                
                console.log(data);
                console.log(`retrieved ${data.length} templates with the matching research_id ...`);
                res.json(data);
            }
        });
    });

});

// for each template_id, search series and count times used for QC
// router.get('/series/:template_id', check_jwt, function(req, res, next) {
router.get('/series/:template_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    console.log('in controler series_qc'+req.params.template_id);
    db.Series.aggregate([
        {$match: {"qc.template_id": new mongoose.Types.ObjectId(req.params.template_id)} },
        {$count:"usedInQC"}
    ],
    function (err, data) {
        if (err) return next(err);
        if (!data) {
            return res.status(404).json({message: "no such research_id:" + req.params.research_id});
        } else {
            res.json(data);
            //res.json({status: "ok"});
            console.log(`retrieved ${data.length} templates with the matching template_id ...`);
        }
   });
});

//search template QC by research
// router.get('/imagecount/:template_id', check_jwt, function(req, res, next) {
router.get('/imagecount/:template_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    console.log('in controler template_details'+req.params.template_id);
    db.TemplateHeader.aggregate([
        {$match: {template_id: new mongoose.Types.ObjectId(req.params.template_id)}},
        {$count:"imageCount"}],
        function (err, data) {
            if (err) return next(err);
            if (!data) {
                return res.status(404).json({message: "no such template_id:" + req.params.template_id});
            } else {
                res.json(data);
                //res.json({status: "ok"});
                console.log(`retrieved ${data.length} templates with the matching template_id ...`);
            }
   });
});

module.exports = router;
