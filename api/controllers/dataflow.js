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

//get all dataflows
router.get('/', function(req, res, next) {
    var query = db.Dataflow.find();
    query.exec(function(err, rs) {
        if(err) return next(err);

        return res.json(rs);
    });
});

//add new dataflow request
router.get('/new/:type', function(req, res, next) {
    //console.log(req.params.type);
    var df = new db.Dataflow({
        isManual: (req.params.type == 'manual')
    });

    df.save(function (err, results) {
        //console.log(results._id);
        res.responseBody = results._id;
        return res.status(200).send();
    });
});

//update dataflow
router.get('/update/:id/:key', function(req, res, next) {

    db.Dataflow.findById(req.params.id).exec(function (err, df) {
        if (err) return next(err);
        if (!df) return res.status(404).json({message: "no such dataflow:" + req.params.id});
        df[req.params.key] = Date.now();
        df.save(function(err) {
            if (err) return (err);
            res.json({status: "ok"});
        });
    });
});



module.exports = router;
