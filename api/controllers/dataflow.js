'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');
var jwt = require('express-jwt');
var async = require('async');

//mine
var config = require('../../config');
var common = require('./common');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');

var qc_func = require('../qc');

//get all dataflows
router.get('/', function(req, res, next) {
    var query = db.Dataflow.find();
    query.exec(function(err, rs) {
        if(err) return next(err);

        return res.json(rs);
    });
});

//add new dataflow request
router.get('/new/:type', function(req, res, next) {
    //console.log(req.params.type);
    var df = new db.Dataflow({
        isManual: (req.params.type == 'manual')
    });

    df.save(function (err, results) {
        //console.log(results._id);
        res.responseBody = results._id;
        return res.status(200).send();
    });
});

//update dataflow
router.get('/update/:id/:key', function(req, res, next) {

    db.Dataflow.findById(req.params.id).exec(function (err, df) {
        if (err) return next(err);
        if (!df) return res.status(404).json({message: "no such dataflow:" + req.params.id});
        df[req.params.key] = Date.now();
        df.save(function(err) {
            if (err) return (err);
            res.json({status: "ok"});
        });
    });
});


router.post('/', common.check_whitelist, function(req, res, next) {

    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    console.log(`Request received from IP ${ip}`);

    // for(var k in req.body) {
    //     console.log(`${k}: ${req.body[k]}`);
    // }

    // req.body.series.forEach(function(s) {
    //     console.log(s);
    //     console.log(`${s.series_name} has ${s.image_count} images`);
    // })

    let rec = req.body;
    if(rec.StudyDate !== undefined && rec.StudyTime !== undefined) {
        rec['date'] = qc_func.instance.toTimestamp(rec.StudyDate, rec.StudyTime);
    }

    db.Dataflow.create(rec, function(err, doc) {
        if(err) return next(err);
        console.log(`Inserted dataflow entry for ${rec.subject} with ${rec.series.length} series`);
        res.json({status: "ok"});
    })
});


router.get('/imgcount', function(req, res, next) {

    console.log(req.query);

    db.Research.find({IIBISID: req.query.iibis}, {_id: 1}).exec(function(err, _researches) {
        if(err) return next(err);
        if(!_researches) return res.status('500').json({status: "cannot find matching research"});
        db.Exam.findOne({
            subject: req.query.subject,
            StudyTimestamp: req.query.StudyTimestamp,
            research_id: {$in: _researches}
        }).populate('research_id').exec(function(err, _exam) {
            if(err) return next(err);
            if(!_exam) return res.json({});
            db.Series.find({exam_id: _exam}, {series_desc: 1, SeriesNumber: 1, _id: 1}).exec(function(err, _series) {
                if(err) return next(err);
                if(!_series) return res.json({});
                let result = {};

                async.each(_series, function(series, callback) {
                    db.Image.count({series_id: series._id}).exec(function(err, img_count){
                        result[series.SeriesNumber] = img_count;
                        callback();
                    });
                }, function(err) {
                    if(err) return next(err);
                    res.json(result);
                });
            })
        })
    })
});

module.exports = router;
