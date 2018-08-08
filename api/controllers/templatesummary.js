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
    db.Template.aggregate([
        {$group: {
            _id:"$research_id",
            IIBISID:{$addToSet:"$IIBISID"},
            Modality:{$addToSet:"$Modality"},
            date: {$addToSet:"$date"},
            series_desc: {$push: "$series_desc"}
            }
        },{$lookup: {
                from:"researches",
                localField:"_id",
                foreignField:"_id",
                as:"fromResearch"
                }
        },{ $project: {
                IIBISID: 1,
                Modality: 1,
                date: 1,
                seroes_desc: 1,
                count: { $size: "$date" },
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
    console.log(req.params.research_id)
    db.Template.aggregate([    
        {$match: {"research_id": new mongoose.Types.ObjectId(req.params.research_id)} },
	    {$group:{
		    _id:"$exam_id",
		    date:{$addToSet:"$date"},
		    template_id:{$push: "$_id"},
            series_desc:{$push:"$series_desc"},
            SeriesNumber:{$push:"$SeriesNumber"}            
		    }
        },{$unwind:"$date"}//,
        //{$sort:{"date":1}}
    ],
    function (err, data) {
        if (err) return next(err);
        if (!data) {
            return res.status(404).json({message: "no such research_id:" + req.params.research_id});
        } else {
            res.json(data);
            //res.json({status: "ok"});
            console.log(`retrieved ${data.length} templates with the matching research_id ...`);
        }
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
