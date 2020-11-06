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

//get all handlers
router.get('/', jwt({secret: config.express.jwt.pub, algorithms: ['RS256']}), function(req, res, next) {
    var query = db.Handler.find();
    query.exec(function(err, rs) {
        if(err) return next(err);

        return res.json(rs);
    });
});

router.post('/update/:handler_id', jwt({secret: config.express.jwt.pub, algorithms: ['RS256']}), function(req, res, next) {
    console.log(req.params.handler_id);
    db.Handler.findById(req.params.handler_id).exec(function (err, handler) {
        if (err) return next(err);
        //make sure user has access to this series
        if (!handler) return res.status(404).json({message: "no such handler:" + req.params.handler_id});
        if (req.body.handlers === undefined) return res.status(404).json({message: 'no handlers defined'});

        handler.handlers = req.body.handlers;
        handler.notes = req.body.notes;
        handler.lastEdit = Date.now();
        handler.save(function(err) {
            if (err) return (err);
            res.json({status: "ok"});
        });
    });
});

module.exports = router;

