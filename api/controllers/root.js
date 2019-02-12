'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');
var jwt = require('express-jwt');
var _ = require('underscore');
var async = require('async');

//mine
var config = require('../../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');
var profile = require('../profile');

/**
 * @api {get} /health Get current service status
 * @apiName Health
 * @apiGroup System
 *
 * @apiSuccess {String} status 'ok' or 'failed'
 */
router.get('/health', function(req, res, next) {
    res.json({status: 'ok'});
});

router.get('/config', jwt({secret: config.express.jwt.pub, credentialsRequired: false}), function(req, res) {
    var conf = {
        //service_types: config.service_types,
        //defaults: config.defaults,
        //menu: get_menu(req.user),
    };
    res.json(conf);
});

router.get('/acl/:key', jwt({secret: config.express.jwt.pub/*, credentialsRequired: false*/}), function(req, res, next) {
    if(!~req.user.scopes.dicom.indexOf('admin')) return next(new Error("admin only"));
    db.Acl.find({}, function(err, acl) {
        if(err) return next(err);
        if(!acl) return res.json({});
        res.json(acl);
    });
});

router.put('/acl/:key', jwt({secret: config.express.jwt.pub/*, credentialsRequired: false*/}), function(req, res, next) {
    if(!~req.user.scopes.dicom.indexOf('admin')) return next(new Error("admin only"));
    var update_cnt = 0;
    async.eachOf(req.body, function(acl, iibisid, callback) {
        console.log(iibisid);
        console.log(acl);
        db.Acl.findOneAndUpdate({IIBISID: iibisid}, acl, {upsert:true}, function(err, doc){
            if (err) return next(err);
            update_cnt++;
            callback()
        });
    }, function(err) {
        if (err) return next(err);
        res.json({status: "ok", msg: update_cnt + " ACLs updated"});
    });
});

router.get('/profiles', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    res.json(profile.getall());
});

router.get('/stats', function(req, res, next) {
    db.Image.count({}, function(err, img_cnt){
        if (err) return next(err);
        db.Exam.distinct('subject', function(err, subject_ids){
            if (err) return next(err);
            var subj_cnt = subject_ids.length;
            db.Research.aggregate([
                {$group:{"_id":"$Modality","IIBISIDS":{$addToSet:"$IIBISID"}}},
                {$project:{"Modality":"$_id","_id":0,"count":{$size:"$IIBISIDS"}}}
            ], function(err, res_cnts) {
                if (err) return next(err);
                res.json({images: img_cnt, subjects: subj_cnt, researches: res_cnts});
            });
        });
    });
});

module.exports = router;

