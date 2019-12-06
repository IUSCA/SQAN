'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');
var jwt = require('express-jwt');
var async = require('async');
var fs = require('fs');
var childProcess = require('child_process');

//mine
var config = require('../../config');
var common = require('./common');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');


function runScript(scriptPath, args, callback) {

    // keep track of whether callback has been invoked to prevent multiple invocations
    var invoked = false;

    var process = childProcess.fork(scriptPath, args);

    // listen for errors as they may prevent the exit event from firing
    process.on('error', function (err) {
        if (invoked) return;
        invoked = true;
        callback(err);
    });

    // execute the callback once the process has finished running
    process.on('exit', function (code) {
        if (invoked) return;
        invoked = true;
        var err = code === 0 ? null : new Error('exit code ' + code);
        callback(err);
    });

}


//return list of all ingestions
router.get('/all', jwt({secret: config.express.jwt.pub}), common.has_role("admin"), function(req, res, next) {
    db.Ingest.find({}).exec(function(err, ingestions) {
        if(err) return next(err);
        logger.info(`Fetched list of ${ingestions.length} ingestions`);
        res.json(ingestions);
    });
});

//create ingestion
router.post('/', jwt({secret: config.express.jwt.pub}), common.has_role("admin"), function(req, res, next) {
    db.User.findOne({username: req.user.profile.username}).exec(function(err, _user) {
        var new_ingestion = new db.Ingest({
            user: _user._id,
            path: req.body.path,
            studyname: req.body.studyname,
            subject: req.body.subject
        });

        if (fs.existsSync(req.body.path)) {
            new_ingestion.save();
            res.json(new_ingestion);

            let script_path = __dirname + `/../../bin/incoming.js`;
            let args = [req.body.path, req.body.studyname, req.body.subject];
            console.log(args);
            runScript(script_path, args,function(err) {
                if(err) logger.error(err);
                if(!err) logger.info(`data ingestion succeeded for ${req.params.system}`);
            })

        } else {
            res.sendStatus('400');
        }

    });
});


module.exports = router;
