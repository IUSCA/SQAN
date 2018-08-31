'use strict';

//node
var fs = require('fs');
var path = require('path');
var tar = require('tar');


//contrib
var express = require('express');
var jwt = require('express-jwt');
var async = require('async');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var winston = require('winston');
var expressWinston = require('express-winston');
var compress = require('compression');

//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('./models');
var profile = require('./profile');

//init express
var app = express();
app.use(bodyParser.json()); //parse application/json
app.use(bodyParser.urlencoded({ extended: false})); //parse application/x-www-form-urlencoded
app.use(compress());
app.use('/', require('./controllers'));

//error handling
app.use(expressWinston.errorLogger(config.logger.winston));
app.use(function(err, req, res, next) {
    if(typeof err == "string") err = {message: err};
    logger.error(err);
    if(err.stack) {
        logger.error(err.stack);
        err.stack = "hidden"; //for ui
    }
    res.status(err.status || 500);
    res.json(err);
});
process.on('uncaughtException', function (err) {
    //TODO report this to somewhere!
    logger.error((new Date).toUTCString() + ' uncaughtException:', err.message)
    logger.error(err.stack)
})

exports.app = app;
exports.start = function(cb) {
    var port = process.env.PORT || config.express.port || '8080';
    var host = process.env.HOST || config.express.host || 'localhost';
    db.init(function(err) {
        if(err) return cb(err);
        var server = app.listen(port, host, function() {
            logger.info("QC api server listening on port %d in %s mode", port, app.settings.env);

            //cache profile from profile service
            setInterval(profile.cache, 1000*300); //5 minutes?
            profile.cache(cb);
        });
    });
};



