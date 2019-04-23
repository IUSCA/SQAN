'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');
var jwt = require('express-jwt');
var async = require('async');
var mongoose = require('mongoose');


//mine
var config = require('../../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');
var qc = require('../qc');

//get all researches that user can view
router.get('/', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    var query = db.Research.find();
    query.sort('-IIBISID');
    query.exec(function(err, rs) {
        if(err) return next(err);
        //if admin parameter is set and if user is admin, return all (used to list all iibisid on admin page)
        if(req.query.admin && ~req.user.scopes.dicom.indexOf('admin')) {
            return res.json(rs);
        }
        db.Acl.getCan(req.user, 'view', function(err, iibisids) {
            //only show iibisids that user has access to
            var researches = [];
            rs.forEach(function(r) {
                if(~iibisids.indexOf(r.IIBISID)) researches.push(r);
            });
            res.json(researches);
        }); 
    });
});

router.get('/summary/:id', function(req, res, next) {
    var subjects = [];
    var exams = {};
    var series_desc = [];
    db.Exam.find({'research_id': req.params.id, 'istemplate' : false}).exec(function(err, _exams){
        if(err) return next(err);
        //console.log(_exams);

        async.each(_exams, function(exam, callback) {
            subjects.indexOf(exam.subject) === -1 && subjects.push(exam.subject);
            db.Series.find({exam_id: exam._id}).populate('exam_id').exec(function(err, _series){
                var exam_series = {};
                _series.forEach(function(ser){
                    series_desc.indexOf(ser.series_desc) === -1 && series_desc.push(ser.series_desc);
                    exam_series[ser.series_desc] = ser;
                });
                exams[exam.subject] === undefined ? exams[exam.subject] = [exam_series] : exams[exam.subject].push(exam_series);
                callback();
            });
        }, function(err) {
            if(err) return next(err);
            res.json({series_desc: series_desc, subjects: subjects, exams: exams});
        });


    });


});

//rerun QC1 on the entire "research"
router.post('/reqcall/:research_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {

    console.log("ReQC-All research id "+req.params.research_id)
    db.Research.findById(req.params.research_id)
    .exec(function(err, research) {
        if(err) return next(err);
        if(!research) return res.status(404).json({message: "can't find specified research"});
        //make sure user has access to this research
        db.Acl.can(req.user, 'qc', research.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC IIBISID:"+research.IIBISID});
            
            db.Exam.find({research_id:research._id})  //new mongoose.Types.ObjectId(req.params.research_id))
            .exec(function(err, exams) {
                if(err) return next(err);
                if(!exams) return res.status(404).json({message: "can't find specified exams"});
                
                async.forEach(exams,function(exam,next_exam){
                    
                    //find all serieses user specified
                    db.Series.find({exam_id: exam._id}).exec(function(err, serieses) {
                        if(err) return next_exam(err);
                        serieses.forEach(function(series) {
                            db.Image.update({series_id: series._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
                                if(err) return next_exam(err);
                                //events.series(series);
                                // add event to each series
                                var detail = {
                                    qc1_state:series.qc1_state,
                                    date_qced:  series.qc ? series.qc.date : undefined,
                                    template_id: series.qc ? series.qc.template_id : undefined,
                                }
                                var event = {
                                    user_id: req.user.sub,
                                    title: "Research-level ReQC all",
                                    date: new Date(), //should be set by default, but UI needs this right away
                                    detail: detail,
                                }; 
                                db.Series.update({_id: series._id}, {$push: { events: event }, qc1_state:"re-qcing", $unset: {qc: 1}}, function(err){
                                    if(err) return next_exam(err);
                                });
                            });
                        });
                        next_exam()
                    });

                }, function(err) {
                    res.json({message: "Re-running QC on "+exams.length+ " exams"}); 
                })
            });

        });
    })

});

//rerun QC1 on the entire "research"
router.post('/reqcfailed/:research_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {

    console.log("ReQC-failed research id "+req.params.research_id)
    db.Research.findById(req.params.research_id)
    .exec(function(err, research) {
        if(err) return next(err);
        if(!research) return res.status(404).json({message: "can't find specified research"});
        //make sure user has access to this research
        db.Acl.can(req.user, 'qc', research.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC IIBISID:"+research.IIBISID});
            
            db.Exam.find({research_id:research._id})  //new mongoose.Types.ObjectId(req.params.research_id))
            .exec(function(err, exams) {
                if(err) return next(err);
                if(!exams) return res.status(404).json({message: "can't find specified exams"});
                
                var qced_series = 0;
                async.forEach(exams,function(exam,next_exam){
                    
                    //find all serieses user specified
                    db.Series.find({exam_id: exam._id, qc1_state:{$ne:"autopass"}}).exec(function(err, serieses) {
                        if(err) return next_exam(err);
                        qced_series = qced_series+serieses.length;
                        serieses.forEach(function(series) {
                            db.Image.update({series_id: series._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
                                if(err) return next_exam(err);
                                //events.series(series);
                                // add event to each series
                                var detail = {
                                    qc1_state:series.qc1_state,
                                    date_qced: series.qc ? series.qc.date : undefined,
                                    template_id: series.qc ? series.qc.template_id : undefined,
                                }
                                var event = {
                                    user_id: req.user.sub,
                                    title: "Research-level ReQC failures",
                                    date: new Date(), //should be set by default, but UI needs this right away
                                    detail: detail,
                                }; 
                                db.Series.update({_id: series._id}, {$push: { events: event }, qc1_state:"re-qcing", $unset: {qc: 1}}, function(err){
                                    if(err) return next_exam(err);
                                });
                            });
                        });
                        next_exam()
                    });

                }, function(err) {
                    res.json({message: "Re-running QC on "+qced_series+ " series with QC1 state failed"}); 
                })
            });

        });
    })

});


//get research detail, exams and series for a given research
router.get('/:id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {

    db.Research.findById(req.params.id).lean().exec(function(err, research) {

        //make sure user has access to this IIBISID
        db.Acl.can(req.user, 'view', research.IIBISID, function(can) {
            //db.Acl.canAccessIIBISID(req.user, image.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to access IIBISID: "+research.IIBISID});
            //get all exams in this research

            research['exams'] = {};
            research['templates'] = {};
            //console.log(research);
            async.series([

                //get subject exams
                function(next) {
                    var query = db.Exam.find().lean()
                    query.where('research_id', research._id);
                    query.where('istemplate', false);
                    query.sort({StudyTimestamp: -1});

                    query.exec(function(err, _exams) {
                        if(err) return next(err);
                        async.each(_exams, function(exam, callback) {
                            //console.log("looking up exam "+exam._id);
                            var query = db.Series.find().lean();
                            query.where('exam_id', exam._id);
                            query.sort({SeriesNumber: 1});
                            query.exec(function(err, exam_series) {
                                if(err) return next(err);
                                exam['series'] = exam_series;
                                callback();
                            });
                        }, function(err) {
                            //console.log('done getting series');
                            if(err) return next(err);
                            research.exams = _exams;
                            next();
                        });
                    });
                },

                //get template exams
                function(next) {
                    var query = db.Exam.find().lean()
                    query.where('research_id', research._id);
                    query.where('istemplate', true);
                    query.sort({StudyTimestamp: -1});

                    query.exec(function(err, _exams) {
                        if(err) return next(err);
                        async.each(_exams, function(exam, callback) {
                            var query = db.Template.find().lean();
                            query.where('exam_id', exam._id);
                            query.sort({SeriesNumber: 1});
                            query.exec(function(err, exam_series) {
                                if(err) return next(err);
                                exam['series'] = exam_series;
                                callback();
                            });
                        }, function(err) {
                            if(err) return next(err);
                            research.templates = _exams;
                            next();
                        });
                    });
                }
            ], function(err) {
                if(err) return next(err);
                res.json(research);
            });

        });
    });
});


module.exports = router;
