'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');
var jwt = require('express-jwt');

//mine
var config = require('../config/config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');

//return all recent studies
router.get('/recent', jwt({secret: config.express.jwt.secret}), function(req, res, next) {
    var today = new Date();
    var last_week = new Date(today.getTime() - 3600*24*365*2*1000); //2 years
    //console.log(last_week.toString())

    db.Study
    .find()
    .where('StudyTimestamp').gt(last_week)
    .sort('-StudyTimestamp')
    .exec(function(err, studies) {
        if(err) return next(err);

        //load all series referenced
        var seriesids = [];
        studies.forEach(function(study) {
            seriesids.push(study.series_id);
        });
        db.Series.find()
        .where('_id')
        .in(seriesids)
        .exec(function(err, serieses) {
            if(err) return next(err);

            //load all researches referenced
            var rids = [];
            serieses.forEach(function(series) {
                rids.push(series.research_id);
            });
            db.Research.find()
            .where('_id')
            .in(rids)
            .exec(function(err, researches) {
                if(err) return next(err);
                res.json({
                    studies: studies,
                    serieses: serieses,
                    researches: researches,
                });
            });
        });
    });
});

module.exports = router;

