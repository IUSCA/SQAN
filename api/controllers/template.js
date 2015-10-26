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

router.get('/:template_id/:inst_id', jwt({secret: config.express.jwt.secret}), function(req, res, next) {
    db.TemplateHeader.findOne({
        template_id: req.params.template_id,
        InstanceNumber: req.params.inst_id,
    }, function(err, templateheaders) {
        if(err) return next(err);
        res.json(templateheaders);
    }); 
});

module.exports = router;

