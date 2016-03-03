'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');
var jwt = require('express-jwt');
var async = require('async');

//mine
var config = require('../../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');
var qc = require('../qc');

function load_related_info(serieses, cb) {
    var rids = [];
    serieses.forEach(function(series) {
        rids.push(series.research_id);
    });
    db.Research.find().lean()
    .where('_id')
    .in(rids)
    .exec(function(err, researches) {
        if(err) return cb(err);

        //load all templates referenced also
        db.Template.find().lean()
        .where('research_id')
        .sort({date: -1})
        .in(rids)
        .exec(function(err, templates) {
            if(err) return cb(err);
            cb(null, {
                studies: serieses, //TODO rename to serises
                researches: researches,
                templates: templates,
            });
        });
    });
}

//query against all serieses
router.get('/query', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    //lookup iibisids that user has access to (TODO - refactor this to aclSchema statics?)
    db.Acl.getCan(req.user, 'view', function(err, iibisids) {
        if(err) return next(err);
        var query = db.Series.find().lean();

        query.where('IIBISID').in(iibisids);
        if(req.query.where) {
            var where = JSON.parse(req.query.where);
            for(var field in where) {
                //console.log(field);
                //console.dir(where[field]);
                query.where(field, where[field]); //TODO is it safe to pass this from UI?
            }
        }

        query.sort({StudyTimestamp: -1, SeriesNumber: 1});
        query.limit(req.query.limit || 50); 

        if(req.query.skip) {
            query.skip(req.query.skip);
        }
        query.exec(function(err, serieses) {
            if(err) return next(err);

            /*
            serieses.forEach(function(series) {
                series._excluded = qc.series.isExcluded(series.Modality, series.series_desc)
            });
            */

            load_related_info(serieses, function(err, details){
                if(err) return next(err);
                res.json(details); 
            });
        });
    });
});

//return all serieses that belongs to a given research_id
router.get('/byresearchid/:research_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Research.findById(req.params.research_id).exec(function(err, research) {
        if(err) return next(err);
        //make sure user has access to this research/IIBISID
        //console.log(JSON.stringify(research, null, 4));
        db.Acl.can(req.user, 'view', research.IIBISID, function(can) {
            if(err) return next(err);
            db.Series.find({research_id: research._id})
            .sort('series_desc subject SeriesNumber') //mongoose does case-sensitive sorting - maybe I should try sorting it on ui..
            .exec(function(err, _serieses) {
                if(err) return next(err);
                var serieses = JSON.parse(JSON.stringify(_serieses)); //objectify
                db.Template.find({research_id: research._id})
                .sort('series_desc SeriesNumber') //mongoose does case-sensitive sorting - maybe I should try sorting it on ui..
                .exec(function(err, templates) {
                    if(err) return next(err);
                    res.json({studies:serieses, templates: templates, researches: [research]});  //TODO rename to serieses
                });
            });
        });
    });
});

router.get('/id/:series_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    //first load the series
    db.Series.findById(req.params.series_id)
    .exec(function(err, series) {
        if(err) return next(err);
        if(!series) return res.status(404).json({message: "no such series:"+req.params.series_id});

        //make sure user has access to this series
        db.Acl.can(req.user, 'view', series.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to view this IIBISID:"+series.IIBISID});
            db.Acl.can(req.user, 'qc', series.IIBISID, function(canqc) {
                var ret = {
                    canqc: canqc,
                    series: series,
                };

                //load research detail
                db.Research.findById(series.research_id).exec(function(err, research) {
                    if(err) return next(err);
                    ret.research = research;

                    //load all template exams available for this research
                    db.Exam.find({research_id: research._id, istemplate: true}).exec(function(err, exams) {
                        if(err) return next(err);
                        ret.template_exams = exams;

                        //load image details
                        db.Image.find().lean()
                        .where('series_id').equals(series._id)
                        .sort('headers.InstanceNumber')
                        .select({qc: 1, 'headers.InstanceNumber': 1, 'headers.AcquisitionNumber': 1})
                        .exec(function(err, _images) {
                            if(err) return next(err);
                            
                            //don't return the qc.. just return counts of errors / warnings
                            ret.images = [];
                            _images.forEach(function(_image) {
                                var image = { 
                                    _id: _image._id, 
                                    inum: _image.headers.InstanceNumber,
                                    anum: _image.headers.AcquisitionNumber,
                                };
                                if(_image.qc) {
                                    image.errors = 0;
                                    image.warnings = 0;
                                    if(_image.qc.errors) image.errors = _image.qc.errors.length;
                                    if(_image.qc.warnings) image.warnings = _image.qc.warnings.length;
                                    image.notemp = _image.qc.notemp;
                                }
                                ret.images.push(image);
                            });

                            //load template used to QC
                            if(series.qc) {
                                db.Template.findById(series.qc.template_id).exec(function(err, template) {
                                    ret.qc_template = template;
                                    res.json(ret);
                                });
                            } else res.json(ret);
                        }); 
                    });
                });
            });
        });
    });
});

router.post('/comment/:series_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Series.findById(req.params.series_id).exec(function(err, series) {
        if(err) return next(err);
        //make sure user has access to this series
        db.Acl.can(req.user, 'view', series.IIBISID, function(can) {
        //db.Acl.canAccessIIBISID(req.user, series.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to view this IIBISID:"+series.IIBISID});
            if(!series.comments) series.comments = [];
            var comment = {
                user_id: req.user.sub,
                comment: req.body.comment, //TODO - validate?
                date: new Date(), //should be set by default, but UI needs this right away
            };
            series.comments.push(comment);
            series.save(function(err) {
                if(err) return(err);
                res.json(comment);
            });
        });
    });
});

router.post('/qcstate/:series_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Series.findById(req.params.series_id).exec(function(err, series) {
        if(err) return next(err);
        //make sure user has access to this series
        db.Acl.can(req.user, 'qc', series.IIBISID, function(can) {
        //db.Acl.canAccessIIBISID(req.user, series.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC this IIBISID:"+series.IIBISID});
            var event = {
                user_id: req.user.sub,
                title: "Updated QC "+req.body.level+" state to "+req.body.state,
                date: new Date(), //should be set by default, but UI needs this right away
                detail: req.body.comment,
            };
            series.events.push(event);
            if(req.body.level == "1") series.qc1_state = req.body.state; 
            if(req.body.level == "2") series.qc2_state = req.body.state; 
            series.save(function(err) {
                if(err) return(err);
                res.json({message: "State updated to "+req.body.state, event: event});
            });
        });
    });
});

//change template and invalidate QC
//TODO I haven't implemented unsetting of template yet..
router.post('/template/:series_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Series.findById(req.params.series_id).exec(function(err, series) {
        if(err) return next(err);
        //make sure user has access to this series
        db.Acl.can(req.user, 'qc', series.IIBISID, function(can) {
        //db.Acl.canAccessIIBISID(req.user, series.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC this IIBISID:"+series.IIBISID});
            //make sure template_id belongs to this series (don't let user pick someone else's template)
            db.Exam.findById(req.body.exam_id).exec(function(err, exam) {
                if(err) return next(err);
                if(!exam.research_id.equals(series.research_id)) return next("invalid template_id");
                series.template_exam_id = exam._id;
                series.qc = undefined; //invalidate series qc
                series.save(function(err) {
                    if(err) return(err);
                    //invalidate image QC.
                    db.Image.update({series_id: series._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
                        if(err) return next(err);
                        console.dir(affected);
                        res.json({message: "Template updated. Re-running QC on "+affected.nModified+" images."});
                    });
                });
            });
        });
    });
});

router.post('/reqc/:series_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Series.findById(req.params.series_id, function(err, series) {
        if(err) return next(err);
        if(!series) return res.status(404).json({message: "can't find specified series"});
        //make sure user has access to this research
        db.Acl.can(req.user, 'qc', series.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC IIBISID:"+series.IIBISID});
            series.qc = undefined;
            series.save(function(err) {
                if(err) next(err);
                //also invalidate image QC.
                db.Image.update({series_id: series._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
                    if(err) return next(err);
                    res.json({message: "Re-running QC on "+affected.nModified+" images."});
                });
            });
        });
    });
});

router.post('/reqcbyexamid/:exam_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Exam.findById(req.params.exam_id, function(err, exam) {
        if(err) return next(err);
        if(!exam) return res.status(404).json({message: "can't find specified exam"});
        //make sure user has access to this research
        db.Acl.can(req.user, 'qc', exam.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC IIBISID:"+exam.IIBISID});
            //find all serieses user specified
            db.Series.find({exam_id: req.params.exam_id}).exec(function(err, serieses) {
                if(err) return next(err);
                var total_modified = 0;
                async.forEach(serieses, function(series, next_series) {
                    //do unset
                    series.qc = undefined;
                    series.save(function(err) {
                        if(err) next(err);
                        //also invalidate image QC.
                        db.Image.update({series_id: series._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
                            if(err) return next(err);
                            total_modified += affected.nModified;
                            next_series();
                        });
                    });
                }, function(err) {
                    res.json({message: "Re-running QC on "+total_modified+" images."});
                });
            });
        });
    });
});

module.exports = router;

