'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');
var jwt = require('express-jwt');

//mine
var config = require('../config/config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');

//all test specs are open to public for read access
router.get('/', function(req, res, next) {
    /*
    db.Testspec.findAll({include: [{
        model: db.Admin
    }]}).then(function(testspecs) {
        res.json(testspecs);
    });
    */
});

//just to make sure mocha supertest is functioning properly
router.get('/check', function(req, res, next) {
    res.json({test: 'hello'});
});

module.exports = router;

