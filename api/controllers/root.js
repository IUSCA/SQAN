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
    /*
    function get_menu(user) {
        var scopes = {
            common: []
        };
        if(user) scopes = user.scopes;
        var menus = [];
        config.menu.forEach(function(menu) {
            if(menu.scope && !menu.scope(scopes)) return;
            var _menu = _.clone(menu);
            if(_menu.submenu) {
                _menu.submenu = get_menu(_menu.submenu, scopes);
            }
            menus.push(_menu);
        });
        return menus;
    }
    */
    var conf = {
        //service_types: config.service_types,
        //defaults: config.defaults,
        //menu: get_menu(req.user),
    };
    res.json(conf);
});

router.get('/researches', jwt({secret: config.express.jwt.pub/*, credentialsRequired: false*/}), function(req, res, next) {
    var query = db.Research.find();
    query.exec(function(err, rs) {
        var rs = JSON.parse(JSON.stringify(rs)); //mongoose object won't let me update the users array (since it's [String])
        if(err) return next(err);
        rs.forEach(function(r) {
            r.users = profile.load_profiles(r.users);
        });
        res.json(rs);
    });
});

//update researches - admin only
router.put('/researches', jwt({secret: config.express.jwt.pub/*, credentialsRequired: false*/}), function(req, res, next) {
    if(!~req.user.scopes.common.indexOf('admin')) return next(new Error("admin only"));
    async.eachSeries(req.body, function(research, next) {
        //replace user object with sub
        var subs = [];
        research.users.forEach(function(user) {
            subs.push(user.sub);
        });
        research.users = subs;
        db.Research.findByIdAndUpdate(research._id, research, next);
    }, function(err) {
        if(err) return next(err);
        res.json({status: "ok", message: "all research updated"}); 
    });
});

router.get('/profiles', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    res.json(profile.getall());
});

module.exports = router;

