'use strict';

//node
var fs = require('fs');
var path = require('path');

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
var config = require('./config');
var logger = new winston.Logger(config.logger.winston);
var db = require('./models');

//init express
var app = express();
app.use(bodyParser.json()); //parse application/json
app.use(bodyParser.urlencoded({ extended: false})); //parse application/x-www-form-urlencoded
app.use(compress());
//if(config.express.jwt) app.use(require('express-jwt')(config.express.jwt)); //jwt auth is optional
app.use('/', require('./router'));

/*
//cache result info
var analysis_cache = [];
function cache_analysis() {
    console.log("caching analysis");
    fs.readdir(config.analyzed_headers, function(err, studyids) {
        var new_cache = [];
        async.eachSeries(studyids, function(studyid, next) {
            //console.log(config.analyzed_headers+'/'+date+'/analysis.json');
            try {
                var json = fs.readFileSync(config.analyzed_headers+'/'+studyid+'/analysis.json', {encoding: 'utf8'});
                var analysis = JSON.parse(json);
                analysis._inst_error_count = 0;
                analysis._inst_warning_count = 0;
                analysis._series_error_count = 0;
                analysis._series_warning_count = 0;
                for(var seriesid in analysis.serieses) {
                    var series = analysis.serieses[seriesid];
                    series._inst_error_count  = 0;
                    series._inst_warning_count  = 0;
                    for(var instid in series.instances) {
                        var instance = series.instances[instid];
                        series._inst_error_count += instance.errors.length;
                        series._inst_warning_count += instance.warnings.length;
                    }
                    analysis._inst_error_count += series._inst_error_count;
                    analysis._inst_warning_count += series._inst_warning_count;
                    analysis._series_error_count += series.series_errors.length;
                    analysis._series_warning_count += series.series_warnings.length;
                    
                    //don't store memory hogging stuff (let client load this individually)
                    delete series.stats; 
                }
            } catch (e) {
                console.error(e, e.stack.split("\n"));
            }
            var stats = fs.statSync(config.analyzed_headers+'/'+studyid);
            analysis._mtime = stats.mtime;
            new_cache.push(analysis);
            next(null);
        }, function(){
            //let's sort by date in reverse
            new_cache.sort(function(a,b){return b._mtime - a._mtime});

            console.dir(new_cache[0]);
            analysis_cache  = new_cache;
            console.log("updated result_analysis.. count:"+analysis_cache.length);
        });
    });
}
cache_analysis(); //initial run
setInterval(cache_analysis, 1000*3600); //cache entire results list every hour

app.get('/studies', jwt({secret: publicKey}), function(req, res) {
    //TODO - check req.user.scopes?
    var start = req.query.start?req.query.start:0;
    var end = req.query.end?req.query.end:5;
    res.json(analysis_cache.slice(start, end));
});

app.get('/series', jwt({secret: publicKey}), function(req, res) {
    //TODO - check req.user.scopes?
    var studyid = req.query.studyid.replace(/[^\.0-9]/, "");
    var seriesid = req.query.seriesid.replace(/[^\.0-9]/, "");
    var json = fs.readFileSync(config.analyzed_headers+'/'+studyid+'/analysis.json', {encoding: 'utf8'});
    var analysis = JSON.parse(json);
    res.json(analysis.serieses[seriesid]);
});

//no longer needed?
app.get('/instance', jwt({secret: publicKey}), function(req, res) {
    var studyid = req.query.studyid.replace(/[^\.0-9]/, "");
    var seriesid = req.query.seriesid.replace(/[^\.0-9]/, "");
    var instid = req.query.instid.replace(/[^\.0-9]/, "");
    var json = fs.readFileSync(config.analyzed_headers+'/'+studyid+'/'+seriesid+'/'+instid, {encoding: 'utf8'});
    var inst = JSON.parse(json);
    res.json(inst);
});
*/

//error handling
app.use(expressWinston.errorLogger(config.logger.winston));
app.use(function(err, req, res, next) {
    logger.error(err);
    logger.error(err.stack);
    res.status(err.status || 500);
    res.json({message: err.message, /*stack: err.stack*/}); //let's hide callstack for now
});
process.on('uncaughtException', function (err) {
    //TODO report this to somewhere!
    logger.error((new Date).toUTCString() + ' uncaughtException:', err.message)
    logger.error(err.stack)
    //process.exit(1); //some people think we should do this.. but I am not so sure..
})

exports.app = app;
exports.start = function(cb) {
    var port = process.env.PORT || config.express.port || '8080';
    var host = process.env.HOST || config.express.host || 'localhost';
    //controllers.init(function() {
    db.init(function(err) {
        if(err) return cb(err);
        var server = app.listen(port, host, function() {
            logger.info("QC api server listening on port %d in %s mode", port, app.settings.env);
            cb();
        });

        /*
        //init socket.io
        var io = require('socket.io').listen(server);
        io.on('connection', function (socket) {
            socket.on('subscribe', function (key) {
                console.log("socket joining "+key);
                socket.join(key);
            });
        });
        controllers.set_socketio(io);
        */
    });
};

