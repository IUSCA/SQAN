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

//used to list all iibisids, etc
router.get('/researches', jwt({secret: config.express.jwt.pub/*, credentialsRequired: false*/}), function(req, res, next) {
    var query = db.Research.find();
    query.sort('-IIBISID');
    query.exec(function(err, rs) {
        if(err) return next(err);
        if(~req.user.scopes.dicom.indexOf('admin')) {
            //admin needs to be able to see all iibisid - so that they can update the acl for all iibisids
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

router.get('/acl/:key', jwt({secret: config.express.jwt.pub/*, credentialsRequired: false*/}), function(req, res, next) {
    if(!~req.user.scopes.dicom.indexOf('admin')) return next(new Error("admin only"));
    db.Acl.findOne({key: req.params.key}, function(err, acl) {
        if(err) return next(err);
        if(!acl) return res.json({});
        res.json(acl.value);
    });
});

router.put('/acl/:key', jwt({secret: config.express.jwt.pub/*, credentialsRequired: false*/}), function(req, res, next) {
    if(!~req.user.scopes.dicom.indexOf('admin')) return next(new Error("admin only"));
    db.Acl.findOneAndUpdate({key: req.params.key}, {value: req.body}, {upsert:true}, function(err, doc){
        if (err) return next(err);
        res.json({status: "ok", acl: doc});
    });
});

router.get('/profiles', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    res.json(profile.getall());
});

module.exports = router;

