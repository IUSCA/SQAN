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
var common = require('./common');
// var profile = require('../profile');

/**
 * @api {post} /exam/comment/:exam_id Add comment for exam
 * @apiName PostExamComment
 * @apiGroup Exam
 *
 * @apiHeader {String} authorization A valid JWT token (Bearer:)
 *
 * @apiParam {Number} exam_id Exam ID
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "user_id": 1,
 *       "comment": "test omment",
 *       "date": "2016-05-23T15:53:51.093Z"
 *     }

*/


router.post('/comment/:exam_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Exam.findById(req.params.exam_id).populate('research_id').exec(function(err, exam) {
        if(err) return next(err);
        //make sure user has access to this series
        if(!exam) return res.status(404).json({message: "no such exam:"+req.params.exam_id});

        common.isUserAllowed(req.user,'view',exam.research_id.IIBISID,function(err,can){
        //db.Acl.can(req.user, 'view', exam.IIBISID, function(can) {
            if (err) return res.status(404).json({message:"there was an error during authorization - please contact SCA team"})
            if(!can) return res.status(401).json({message: "you are not authorized to view this IIBISID:"+exam.IIBISID});
            if(!exam.comments) exam.comments = [];
            var comment = {
                user_id: req.user.sub,
                comment: req.body.comment, //TODO - validate?
                date: new Date(), //should be set by default, but UI needs this right away
            };
            exam.comments.push(comment);
            exam.save(function(err) {
                if(err) return(err);
                res.json(comment);
            });
        });
    });
});


router.get('/subject/:q', function(req, res, next) {
    db.Exam.find(
        {
            'subject': { "$regex": req.params.q, "$options": "i" }
        }).populate('research_id').exec(function(err, _docs) {
            if(err) return next(err);
            let results = {};
            async.each(_docs, function(_doc, cb) {
                if(!(_doc.subject in results)) results[_doc.subject] = { 'subject': _doc.subject, 'exams': []};
                results[_doc.subject].exams.push(_doc);
                cb();
            }, function(err) {
                if(err) return next(err);
                res.json(results);
            })
        })
});

router.get('/calendar', function(req, res, next) {

    let d = new Date();
    d.setDate(d.getDate() - 360);
    db.Exam.find(
        {
            istemplate: false,
            StudyTimestamp: {$gt: d}
        }).populate('research_id').exec(function(err, _docs) {
        if(err) return next(err);
        res.json(_docs);
    })
})

router.get('/query', jwt({secret: config.express.jwt.pub}), function(req, res, next) {

    //lookup iibisids that user has access to (TODO - refactor this to aclSchema statics?)
    //console.log(req.user);
    common.getUserCan(req.user,'view', function(err,researchids){

        if (err) {
            //console.log("error in getUserCan")
            //console.log(err);
            return next(err);
        }
        //console.log(researchids);

        var query = db.Exam.find().populate('research_id');
        query.where('research_id').in(researchids);


        if(req.query.where) {
            var where = JSON.parse(req.query.where);
            for(var field in where) {
                query.where(field, where[field]); //TODO is it safe to pass this from UI?
            }
        }

        if(req.query.sort) {
            query.sort(JSON.parse(req.query.sort));
        }

        async.series([
            function(next){
                if(!req.query.pending){
                    //console.log('getting all!');
                    next();
                } else {
                    //console.log('getting pending!');
                    db.Series.distinct('exam_id',{
                        $and: [
                            {qc1_state:{$ne:"autopass"}},
                            {qc1_state:{$ne:"accept"}},
                            {deprecated_by: null}
                        ]
                    }).exec(function(err, _exam_ids){
                        query.where('_id').in(_exam_ids);
                        next(err);
                    })
                }
            }
        ], function(err) {
            if(err) return next(err);
            var org = {};

            query.exec(function(err, _exams) {
                if(err) return next(err);
                //console.log(_exams)

                _exams.forEach(function(_exam){
                    var research = _exam.research_id._id;
                    org[_exam.research_id.IIBISID] = org[_exam.research_id.IIBISID] || {};
                    org[_exam.research_id.IIBISID][research] = org[_exam.research_id.IIBISID][research] || {research : _exam.research_id, exams: []};
                    org[_exam.research_id.IIBISID][research].exams.push({
                        _id: _exam._id,
                        subject: _exam.subject,
                        StudyTimestamp: _exam.StudyTimestamp,
                        qc: _exam.qc
                    });
                })
                //console.log(org);
                res.json(org);
            });
        });
    })
});


router.get('/:exam_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Exam.findById(req.params.exam_id).populate('research_id').exec(function(err, exam) {
        if(err) return next(err);
        if(!exam) return res.status(404).json({message: "no such exam:"+req.params.exam_id});
        db.Series.find({exam_id: exam._id}).exec(function(err, serieses) {
            if(err) return next(err);
            let data = {
                exam: exam,
                series: serieses
            }
            res.json(data);
        });
    });
});


router.post('/template/:exam_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {

    db.Exam.findById(req.params.exam_id).populate('research_id').exec(function(err, exam) {
        if(err) return next(err);
        //make sure user has access to this series
        if(!exam) return res.status(404).json({message: "no such exam:"+req.params.exam_id});
        //console.log(exam);

        db.Acl.can(req.user,'qc',exam.research_id.IIBISID,function(can) {
            if(!can) return res.status(401).json({message: "You are not authorized to QC this IIBISID:"+exam.research_id.IIBISID});

            db.Exam.findOne({_id: req.body.template_id, "istemplate":true}).exec(function(err, texam) {
                if(err) return next(err);
                if(!texam) return res.status(404).json({message: "no such template exam:"+req.body.template_id});
                exam.override_template_id = req.body.template_id;
                exam.save();

                db.Series.find({exam_id: exam._id})
                    .exec(function(err, serieses) {

                        let series_updated = 0;
                        let images_updated = 0;
                        async.each(serieses, function(series, cb) {
                            db.Template.findOne({
                                exam_id: req.body.template_id,
                                series_desc: series.series_desc,
                                deprecated_by: null,
                                updatedAt: {$lt: new Date(new Date().getTime() - 1000 * 30)}
                            },function(err,template) {
                                if (err) return cb(err);
                                if (!template) return cb();

                                var override_template_id = template._id;

                                var detail = {
                                    qc1_state:series.qc1_state,
                                    date_qced: series.qc ? series.qc.date : undefined,
                                    template_id: series.qc ? series.qc.template_id : undefined,
                                    comment:"Re-QCing due to exam-level template override",
                                }

                                var event = {
                                    user_id: req.user.sub,
                                    title: "Template override",
                                    date: new Date(), //should be set by default, but UI needs this right away
                                    detail:detail,
                                };

                                db.Image.update({series_id: series._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
                                    if(err) return next(err);
                                    db.Series.update({_id: series._id}, {$push: { events: event }, qc1_state:"re-qcing", override_template_id:override_template_id, $unset: {qc: 1}}, function(err){
                                        if(err) next(err);
                                        series_updated++;
                                        images_updated += affected.nModified;
                                        cb()
                                    });
                                });
                            })
                        }, function(err) {
                            if(err) return res.status(500).json({message: "There was an error overriding series templates in this exam"});
                            return res.json({message: images_updated + " images in " + series_updated + " series marked for QC with override template."});
                        })
                    });
            });

        });
    });
});


router.post('/delete/:exam_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {

    db.Exam.findById(req.params.exam_id).populate('research_id').exec(function(err, exam) {
        if(err) return next(err);
        //make sure user has access to this series
        if(!exam) return res.status(404).json({message: "no such exam:"+req.params.exam_id});
        //console.log(exam);

        db.Acl.can(req.user,'qc',exam.research_id.IIBISID,function(can) { // for now..
            if(!can) return res.status(401).json({message: "You are not authorized to Delete data from this IIBISID:"+exam.research_id.IIBISID});

            var comment = {
                title: "Exam Deleted",
                user_id: req.user.sub,
                comment: req.body.comment, //TODO - validate?
                date: new Date(),
            };
            exam.comments.push(comment);

            db.Deletedexam.create({
                research_id:exam.research_id._id,
                subject: exam.subject,
                StudyInstanceUID:exam.StudyInstanceUID,
                istemplate: exam.istemplate,
                StudyTimestamp: exam.StudyTimestamp,
                DeletionTimestamp: new Date(),
                qc: exam.qc,
                comments: exam.comments
            }, function (err) {
                if (err) return next(err);
            })


            db.Series.find({exam_id:exam._id},function(err,series){
                if(err) console.log(err);
                if(!series) return res.status(404).json({message: "no series found for such exam:"+req.params.exam_id});
                //var n_series = series.length;
                series.forEach(function(t){
                    db.Image.deleteMany({series_id:t._id},function(err){
                        if (err) console.log(err);
                        db.Series.deleteOne({_id:t._id},function(err){
                            if (err) console.log(err);
                        })
                    })
                })

                exam.isdeleted = true;
                exam.qc = undefined;
                exam.save(function(err, _exam) {
                    if (err) console.log(err);
                    return res.json({message: "Subject " + exam.subject + " -- " + series.length + " series deleted ", exam: _exam});
                });

            })
        });
    });
});




router.post('/maketemplate/:exam_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {

    db.Exam.findById(req.params.exam_id).populate('research_id').exec(function(err, exam) {
        if(err) return next(err);
        //make sure user has access to this series
        if(!exam) return res.status(404).json({message: "no such exam:"+req.params.exam_id});
        //console.log(exam);

        db.Acl.can(req.user,'qc',exam.research_id.IIBISID,function(can) { // for now..
            if(!can) return res.status(401).json({message: "You are not authorized to modify data from this IIBISID:"+exam.research_id.IIBISID});

            var comment = {
                title: "Exam Added as Template",
                user_id: req.user.sub,
                comment: req.body.comment, //TODO - validate?
                date: new Date(),
            };

            //Insert Exam as a template:
            db.Exam.create({
                    research_id: exam.research_id,
                    subject: null,
                    StudyInstanceUID: exam.StudyInstanceUID,
                    StudyTimestamp: exam.StudyTimestamp,
                    istemplate:true,
                    isdeleted: false,
                    converted_to_template:true,
                    parent_exam_id: exam._id,

                }, function(err, _texam) {
                    if(err) return next(err);

                    // Save original exam with flag indicating that it was added as template

                    var commentarr = exam.comments ? exam.comments : [];
                    commentarr.push(comment)

                    db.Exam.update({_id: exam._id},
                        {$set:{
                            converted_to_template:true,
                            comments: commentarr
                        }}, function(err,_exam){

                        if (err) console.log(err);
                        console.log(_exam)

                        // find all the series for this exam
                        db.Series.find({exam_id:exam._id},function(err,series){
                            if(err) console.log(err);
                            if(!series) return res.status(404).json({message: "no series found for such exam:"+req.params.exam_id});

                            // for each series, ss
                            async.each(series, function(ss, cb_ss) {
                            // series.forEach(function(ss){

                                var ee = {
                                    service_id: "SCA",
                                    user_id: req.user.sub,
                                    title: "Received",
                                    detail: "Series added as Template: Exam " + exam.id+ "=> "+ _texam._id,
                                    date: new Date(),
                                }

                                console.log("Series added as Template: Exam " + exam.id+ "=> "+ _texam._id)

                                // create the corresponding template-series, tt
                                db.Template.create({
                                    exam_id: _texam._id,
                                    series_desc: ss.series_desc ,
                                    SeriesNumber:ss.SeriesNumber,
                                    //deprecated_by: ss.deprecated_by,
                                }, function(err,tt){
                                    if(err) console.log(err);

                                    checkDeprecated(tt, function() {
                                        // find the primary header h1 for series ss
                                        db.Image.findOne({series_id:ss._id, _id:ss.primary_image},function(err,h1){
                                            if (err) console.log(err);

                                            // remove subject name
                                            console.log("remove subject name")
                                            h1.headers.qc_subject = undefined;

                                            // series prim header becomes template prim header
                                            db.TemplateHeader.create({
                                                template_id: tt._id,
                                                SOPInstanceUID: h1.SOPInstanceUID,
                                                InstanceNumber: h1.InstanceNumber,
                                                EchoNumbers: h1.EchoNumbers,
                                                primary_image: null,
                                                headers: h1.headers,
                                            }, function (err, primary_template) {
                                                if (err) return next(err);

                                                // insert primary_template._id into the template document and add a event
                                                console.log("insert primary template id into template")
                                                db.Template.updateOne({_id: tt._id},
                                                {
                                                    primary_image: primary_template._id,
                                                    $push: {events: ee},
                                                }, function (err) {
                                                    if (err) return next(err);

                                                    // find all other non-primary headers from series ss
                                                    console.log("find all series non-prim images")
                                                    db.Image.find({series_id:ss._id, primary_image:ss.primary_image},function(err,h){
                                                        if (err) console.log(err);
                                                        console.log("series has "+h.length+ " non-prim images")
                                                        // insert each series header into templateheaders
                                                        async.each(h, function(hh, cb_hh){
                                                        // h.forEach(function(hh){

                                                            // remove subject name
                                                            hh.headers.qc_subject = undefined;

                                                            db.TemplateHeader.create({
                                                                template_id: tt._id,
                                                                SOPInstanceUID: hh.SOPInstanceUID,
                                                                InstanceNumber: hh.InstanceNumber,
                                                                EchoNumbers: hh.EchoNumbers,
                                                                primary_image: primary_template._id,
                                                                headers: hh.headers,
                                                            }, function (err, th) {
                                                                if (err) cb_hh(err);
                                                                cb_hh()

                                                                // return res.json({message: series.length + " series converted to templates ", exam: _exam});

                                                            });

                                                        }, function(err) {
                                                            if(err) cb_ss(err);
                                                            cb_ss()
                                                        })

                                                    })

                                                });
                                            })

                                        })

                                    })
                                });

                            }, function(err){
                                if(err) return next(err);
                                return res.json({message: series.length + " series converted to templates ", exam: _exam});
                            })

                        })
                    });
                });
        });
    });
});


function checkDeprecated(doc, cb) {
    db.Template.update({
        exam_id: doc.exam_id,
        series_desc: doc.series_desc,
        SeriesNumber: { $lt: doc.SeriesNumber },
    }, {
        deprecated_by: doc._id,
    },{multi: true}, function(err,numdeprecated) {
        if (err) logger.warn("error deprecating older template");
        //console.log(numdeprecated);
        db.Template.findOne({
            exam_id: doc.exam_id,
            series_desc: doc.series_desc,
            SeriesNumber: { $gt: doc.SeriesNumber },
        }, function(err, _doc){
            if(err) logger.warn("error deprecating current series");
            if(_doc) {
                doc.deprecated_by = _doc._id;
            } else {
                doc.deprecated_by = null;
            }
            doc.save();
            cb();
        });
    });
}


module.exports = router;


