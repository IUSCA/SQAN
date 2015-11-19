'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');
var jwt = require('express-jwt');
var _ = require('underscore');

//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');

router.get('/health', function(req, res, next) {
    res.json({status: 'ok'});
});

router.get('/config', jwt({secret: config.express.jwt.secret, credentialsRequired: false}), function(req, res) {
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

//used?
router.get('/researches', jwt({secret: config.express.jwt.secret, credentialsRequired: false}), function(req, res) {
    db.Research.find().then(function(rs) {
        res.json(rs);
    });
});

module.exports = router;

