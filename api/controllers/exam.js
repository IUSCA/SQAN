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
var profile = require('../profile');

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
        
        profile.isUserAllowed(req.user,'view',exam.research_id.IIBISID,function(err,can){
        //db.Acl.can(req.user, 'view', exam.IIBISID, function(can) {
            if (err) return res.status(404).json({message:"there was an error during authorization - please contact SCA team"})
            if(!can) return res.status(401).json({message: "you are not authorized to view this IIBISID:"+exam.IIBISID});
            if(!exam.comments) exam.comments = [];
            var comment = {
                user_id: req.user.sub,
                comment: req.body.comment, //TODO - validate?
                date: new Date(), //should be set by default, but UI needs this right away
                _profile: profile.get(req.user.sub),
            };
            exam.comments.push(comment);
            exam.save(function(err) {
                if(err) return(err);
                res.json(comment);
            });
        });
    });
});

router.get('/query', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    
    //lookup iibisids that user has access to (TODO - refactor this to aclSchema statics?)  
    //console.log(req.user);
    profile.getUserCan(req.user,'view', function(err,researchids){

        if (err) {
            console.log("error in getUserCan")
            console.log(err);
            return next(err);
        }
        console.log(researchids);

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
                    console.log('getting all!');
                    next();
                } else {
                    console.log('getting pending!');
                    db.Series.distinct('exam_id',{
                        $and: [
                            {qc1_state:{$ne:"autopass"}},
                            {qc1_state:{$ne:"accept"}}
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


        //});            
    //});
});

module.exports = router;


