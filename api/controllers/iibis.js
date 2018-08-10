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

//get IIBIS record by IIBIS ID
router.get('/:iibis_id', function(req, res, next) {
    db.IIBIS.find({iibis_project_id: req.params.iibis_id}).exec(function (err, _iibis){
        if (err) return next(err);
        if (!_iibis) return res.status(404).json({message: "no such iibis record:" + req.params.iibis_id});
        return res.json(_iibis);
    });
});

module.exports = router;