'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');
var jwt = require('express-jwt');
var _ = require('underscore');
var async = require('async');

//mine
var config = require('../config');
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
    query.exec(function(err, rs) {
        if(err) return next(err);
        //should I filter by iibisid acl? 
        //admin needs to be able to see all iibisid - so that they can update the acl for all iibisids

        /*
        var rs = JSON.parse(JSON.stringify(rs)); //mongoose object won't let me update the users array (since it's [String])
        rs.forEach(function(r) {
            r.users = profile.load_profiles(r.users);
        });
        */
        res.json(rs);
    });
});

router.get('/acl/:key', jwt({secret: config.express.jwt.pub/*, credentialsRequired: false*/}), function(req, res, next) {
    if(!~req.user.scopes.common.indexOf('admin')) return next(new Error("admin only"));
    db.Acl.findOne({key: req.params.key}, function(err, acl) {
        if(err) return next(err);
        if(!acl) return res.json({});
        res.json(acl.value);
    });
});

router.put('/acl/:key', jwt({secret: config.express.jwt.pub/*, credentialsRequired: false*/}), function(req, res, next) {
    if(!~req.user.scopes.common.indexOf('admin')) return next(new Error("admin only"));
    db.Acl.findOneAndUpdate({key: req.params.key}, {value: req.body}, {upsert:true}, function(err, doc){
        if (err) return next(err);
        res.json({status: "ok", acl: doc});
    });
});

router.get('/profiles', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    res.json(profile.getall());
});

module.exports = router;

