#!/usr/bin/node
var fs = require('fs');
var config = require('../config/config').config;
var async = require('async');
var ss = require('simple-statistics');

function analyze(inputdir, done){
    var count = 0;
    var studies = {};
    fs.readdir(inputdir, function(err, files) {
        if(err) throw err;
        async.eachSeries(files, function(studyid, next) {
            if(fs.lstatSync(inputdir+"/"+studyid).isDirectory()) {
                console.log("studyid:"+studyid);
                count++;
                analyze_study(inputdir+"/"+studyid, function(study) {
                    studies[studyid] = study;
                    next();
                });
            } else {
               next(); 
            }
        }, function() {
            done({study_count: count, studies: studies});
        });
    });
}

function analyze_study(studydir, done) {
    var count = 0;
    var serieses = {};
    var sample_h = null;
    fs.readdir(studydir, function(err, files) {
        if(err) throw err;
        async.eachSeries(files, function(seriesid, next) {
            if(fs.lstatSync(studydir+"/"+seriesid).isDirectory()) {
                count++;
                analyze_series(studydir+"/"+seriesid, function(series, inst_h) {
                    if(!sample_h) sample_h = inst_h;
                    serieses[seriesid] = series;
                    next();
                });
            } else {   
                next();
            }
        }, function() {
            done({study_desc: sample_h.StudyDescription, series_count: count, serieses: serieses}, sample_h);
        });
    });
}

//aggregate all inst under a series and check for any issues in stats
function analyze_series(seriesdir, done) {
    var h_agg = {};
    //var instids = [];
    var instances = {};
    var sample_h = null;
    fs.readdir(seriesdir, function(err, files) {
        if(err) throw err;
        async.eachSeries(files, function(instid, next) {
            //instids.push(instid);
            analyze_inst(seriesdir+"/"+instid, function(instance_errors, instance_warnings, inst_h) {
                if(!sample_h) sample_h = inst_h;
                //aggregate values for each field
                for(var k in inst_h) {
                    switch(k) {
                    //ignore some fields
                    case "SOPInstanceUID":
                    case "InstanceCreationTimestamp":
                    case "ContentTimestamp":
                    case "AcquisitionTimestamp":
                        break;
                    default:
                        var v = inst_h[k];
                        if(!h_agg[k]) h_agg[k] = [];
                        h_agg[k].push(v);
                    }
                }
                instances[instid] = {errors: instance_errors, warnings: instance_warnings};
                next();
            });
        }, function() {
            //summerize aggregate
            var h_stats = {};
            for(var k in h_agg) {
                var vs = h_agg[k];
                switch(typeof vs[0]) {
                case "object": 
                    //let's not aggregate objects for now.
                    break;
                case "string": 
                    //count occurence of each values
                    var counts = {};
                    vs.forEach(function(v) {
                        if(counts[v] === undefined) counts[v] = 1;
                        else counts[v]++;
                    });
                    h_stats[k] = counts;
                    break;
                case "number":
                    h_stats[k] = {
                        count: vs.length,
                        mean: ss.mean(vs),
                        median: ss.median(vs),
                        min: ss.min(vs),
                        max: ss.max(vs),
                        standard_deviation: ss.standard_deviation(vs),
                    };
                    break;
                default: 
                    console.error("unknown value type:"+(typeof vs[0])+" for field "+k);
                }
            }
        
            //TODO - check h_stats to make sure all parameters are within a range
            //Sundar says we don't need to do anything for this yet (we just need to validate at instance level)
    
            done({
                series_desc: sample_h.SeriesDescription, 
                //instids: instids, 
                stats: h_stats, 
                instances: instances,
                //errors: errors, 
                //warnings: warnings
            }, sample_h);
        });
    });
}

function analyze_inst(instpath, next) {
    var errors = [];
    var warnings = [];
    //console.log("analyzing:"+instpath);
    
    var json = fs.readFileSync(instpath, {encoding: "utf8"});
    var h = JSON.parse(json);
    
    //TODO - check for problems in h.

    //DEBUG mock up some random error message
    if(h.SOPInstanceUID.indexOf("004") != -1) {
        errors.push({type:"out_of_range", field:"abc", value: 123, message: "abc should be within 300 - 400"});
    }
    if(h.SOPInstanceUID.indexOf("005") != -1) {
        errors.push({type:"out_of_range", field:"def", value: 10, message: "defshould be within 100 - 200"});
    }
    if(h.SOPInstanceUID.indexOf("006") != -1) {
        errors.push({type:"missing", field:"missing_field", value: null, message: "ghj not set"});
    }

    if(h.SOPInstanceUID.indexOf("007") != -1) {
        warnings.push({type:"random warning 1", field:"abc", value: 123, message: "something is somewhat out of range"});
    }
    if(h.SOPInstanceUID.indexOf("008") != -1) {
        warnings.push({type:"random warning 2", field:"def", value: 10, message: "something is fishy here"});
    }
    if(h.SOPInstanceUID.indexOf("009") != -1) {
        warnings.push({type:"random warning 3", field:"ghj", value: null, message: "some value looks odd."});
    }
    next(errors, warnings, h);
}

//process.argv[2];
//var inputdir = "/usr/local/incoming-dicom-headers/20150604";
var inputdir = process.argv[2];
//var outputdir = process.argv[3];
analyze(inputdir, function(study_errs) {
    //console.log(JSON.stringify(study_errs, null, 4));
    console.log("writing to "+inputdir+"/analysis.json");
    fs.writeFileSync(inputdir+"/analysis.json", JSON.stringify(study_errs, null, 4));
});

