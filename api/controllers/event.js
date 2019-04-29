'use strict';

//contrib
const express = require('express');
const router = express.Router();
const winston = require('winston');
const jwt = require('express-jwt');
//const async = require('async');
//const fs = require('fs');

//mine
const config = require('../../config');
const logger = new winston.Logger(config.logger.winston);
const db = require('../models');

/*
function check_series(req, res, next) {
    var key = req.params.key;
    var key_tokens = key.split(".");

    var usersub = key_tokens[0];
    if(req.user.sub != usersub) return next("401");
    res.json({status: "ok"});
}
*/

//called by sca-event to check to see if user has access to this key
router.get('/checkaccess/series/:key', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    var key = req.params.key;
    var key_tokens = key.split(".");
    var research_id = key_tokens[0];

    //logger.debug("checking access for research_id:"+research_id);

    //first lookup IIBISID for this research
    db.Research.findById(research_id, function(err, research) {
        if(err) return next(err);
        if(!research) return res.status(404).json({message: "no such research_id"});
        db.Acl.can(req.user, 'view', research.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to view this IIBISID:"+research.IIBISID});
            res.json({status: "ok"});
        });
    });
});

module.exports = router;
