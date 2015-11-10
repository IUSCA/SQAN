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
var qc = require('../qc');

/*
//return most recent studies (DEPRECATED)
router.get('/recent', jwt({secret: config.express.jwt.secret}), function(req, res, next) {
    logger.error("/study/recent called - deprecated");
    //var today = new Date();
    //var last_week = new Date(today.getTime() - 3600*24*7*1000); //1 week
    var query = db.Study.find();
    //.where('StudyTimestamp').gt(last_week)
    query.sort('-StudyTimestamp');
    query.limit(200);

    query.exec(function(err, studies) {
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

                //load all templates referenced
                db.Template.find()
                .where('series_id')
                .in(seriesids)
                //.select({series_id: 1, date: 1, count: 1, research_id: 1}) //don't load the headers
                .exec(function(err, templates) {
                    if(err) return next(err);

                    res.json({
                        studies: studies,
                        serieses: serieses,
                        researches: researches,
                        templates: templates,
                    });
                });

            });
        });
    });
});
*/

//query against all studies
router.get('/query', jwt({secret: config.express.jwt.secret}), function(req, res, next) {
    var query = db.Study.find();

    query.sort({StudyTimestamp: -1});
    query.limit(req.query.limit || 50); 
    if(req.query.skip) {
        query.skip(req.query.skip);
    }

    /*
    if(req.query.studytimestamp_gt) {
        query.where('StudyTimestamp')
        .gt(new Date(req.query.studytimestamp_gt))
        .lt(new Date(req.query.studytimestamp_lt));
    }
    if(req.query.modality) {
        query.where('Modality').equals(req.query.modality);
    }
    if(req.query.research_id) {
        query.where('research_id').equals(req.query.research_id);
    }
    */

    var serieses = {};

    query.exec(function(err, studies) {
        if(err) return next(err);

        //pull unique serieses and see if it's excluded or not
        //TODO - instead of not doing QC, I am thinking about going ahead with QC, but let UI / report deal with
        //how to handle excluded series
        studies.forEach(function(study) {
            //check for series exclusion
            if(serieses[study.Modality] == undefined) serieses[study.Modality] = {};
            if(serieses[study.Modality][study.series_desc] == undefined) {
                serieses[study.Modality][study.series_desc] = qc.series.isExcluded(study.Modality, study.series_desc);
            }
        });

        //load all researches referenced by studies
        var rids = [];
        studies.forEach(function(study) {
            rids.push(study.research_id);
        });
        db.Research.find()
        .where('_id')
        .in(rids)
        .exec(function(err, researches) {
            if(err) return next(err);

            //load all templates referenced also
            db.Template.find()
            .where('research_id')
            .sort({date: -1})
            .in(rids)
            .exec(function(err, templates) {
                if(err) return next(err);

                res.json({
                    studies: studies,
                    researches: researches,
                    templates: templates,
                    serieses: serieses,
                });
            });

        });
    });
});

/*
//deprecated
router.get('/qc/:study_id', jwt({secret: config.express.jwt.secret}), function(req, res, next) {
    var study_id = req.params.study_id;
    db.Image.find()
    .where('study_id').equals(study_id)
    .sort('headers.InstanceNumber')
    .select({qc: 1})
    .exec(function(err, _images) {
        if(err) return next(err);
        //don't return the qc.. just return counts of qc results
        var images = [];
        _images.forEach(function(_image) {
            //count number of errors / warnings
            var image = {
                _id: _image._id,
            };
            if(_image.qc) {
                image.qc = {e: 0, w: 0};
                if(_image.qc.errors) image.qc.e = _image.qc.errors.length;
                if(_image.qc.warnings) image.qc.w = _image.qc.warnings.length;
                //if(_image.qc.notes) image.n = _image.qc.notes.length;
            }
            images.push(image);
        });
        res.json(images);
    }); 
});
*/

router.get('/id/:study_id', jwt({secret: config.express.jwt.secret}), function(req, res, next) {
    var ret = {};
    db.Study.findById(req.params.study_id).exec(function(err, study) {
        if(err) return next(err);
        ret.study = study;

        db.Research.findById(study.research_id).exec(function(err, research) {
            if(err) return next(err);
            ret.research = research;

            if(study.qc) {
                db.Template.findById(study.qc.template_id).exec(function(err, template) {
                    if(err) return next(err);
                    ret.template = template;

                    db.Image.find()
                    .where('study_id').equals(study._id)
                    .sort('headers.InstanceNumber')
                    .select({qc: 1})
                    .exec(function(err, _images) {
                        if(err) return next(err);
                        //don't return the qc.. just return counts of errors / warnings
                        ret.images = [];
                        _images.forEach(function(_image) {
                            //count number of errors / warnings
                            var image = { _id: _image._id };
                            if(_image.qc) {
                                image.errors = 0;
                                image.warnings = 0;
                                if(_image.qc.errors) image.errors = _image.qc.errors.length;
                                if(_image.qc.warnings) image.warnings = _image.qc.warnings.length;
                                image.notemp = _image.qc.notemp;
                            }
                            ret.images.push(image);
                        });
                        res.json(ret);
                    }); 
                });
            } else {
                //not-QCed .. this is all I can get
                res.json(ret);
            }
        });
    });
});

//invalidate qc on all images for this study
router.put('/qc/invalidate/:study_id', jwt({secret: config.express.jwt.secret}), function(req, res, next) {
    var study_id = req.params.study_id;
    db.Image.update({study_id: study_id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
        if(err) return next(err);
        res.json({status: "ok", affected: affected});
    });
});

module.exports = router;

