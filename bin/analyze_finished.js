#!/usr/bin/node
var fs = require('fs');
var mv = require('mv');
var async = require('async');

var config = require('../config/config').config;
var analyze = require('./analyze').analyze;

//find study directory with no new instance in the last 3600 seconds
fs.readdir(config.cleaned_headers, function(err, files) {
    if(err) throw err;
    async.eachSeries(files, function(studyid, next_study) {
        console.log("studyid:"+studyid);
        //look for any files modified in less than an hour
        fs.readdir(config.cleaned_headers+"/"+studyid, function(err, serieses) {
            if(err) throw err;

            async.eachSeries(serieses, function(seriesid, next_series) {
                if(~seriesid.indexOf(".json")) return next_series(); //skip .json
                //console.log("    seriesid:"+seriesid);
                path = config.cleaned_headers+"/"+studyid+"/"+seriesid;
                fs.readdir(path, function(err, insts) {
                    if(err) throw err;

                    async.eachSeries(insts, function(instid, next_inst) {
                        var stat = fs.statSync(config.cleaned_headers+"/"+studyid+"/"+seriesid+"/"+instid);
                        //console.log("        "+instid+" "+stat.mtime);
                        var age = Date.now() - stat.mtime.getTime();
                        //if(age < 3600*1000) {
                        if(age < 5*1000) {
                            console.log("  instid"+instid+" is young(age:"+age+") .. skipping this study");
                            return next_study();
                        }
                        next_inst();
                    }, next_series);
                });
            }, function() {
                console.log("study ready to be analyzed");
                analyze(studyid, function(err, result) {
                    if(err) throw err;
                    console.dir(result);
                    fs.writeFileSync(config.cleaned_headers+"/"+studyid+"/analysis.json", JSON.stringify(result, null, 4));
                    console.log("stored analysis.json - moving to "+config.analyzed_headers);
                    mv(config.cleaned_headers+"/"+studyid, config.analyzed_headers+"/"+studyid, function(err) {
                        if(err) throw err;
                        next_study();
                    });
                });
            });
        });
    }, function() {
        console.log("all done");
    }); 
});


