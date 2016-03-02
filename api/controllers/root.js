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

