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
    db.Exam.findById(req.params.exam_id).exec(function(err, exam) {
        if(err) return next(err);
        //make sure user has access to this series
        if(!exam) return res.status(404).json({message: "no such exam:"+req.params.exam_id});
        db.Acl.can(req.user, 'view', exam.IIBISID, function(can) {
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
module.exports = router;

