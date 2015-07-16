#!/usr/bin/node
var fs = require('fs');
var config = require('../config/config').config;
var async = require('async');
var ss = require('simple-statistics');
var _ = require('underscore');

var qc_instance = require('../qc/instance');
var qc_series = require('../qc/series');
var qc_template = require('../qc/template');

/*
function analyze(inputdir, done){
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
*/

function analyze(studyid, done) {
    var count = 0;
    var serieses = {};
    var sample_h = null;
    fs.readdir(config.cleaned_headers+'/'+studyid, function(err, files) {
        if(err) throw err;
        async.eachSeries(files, function(seriesid, next) {
            if(fs.lstatSync(config.cleaned_headers+'/'+studyid+"/"+seriesid).isDirectory()) {
                count++;
                analyze_series(config.cleaned_headers+'/'+studyid+"/"+seriesid, function(series, h) {
                    if(!sample_h) sample_h = h;
                    serieses[seriesid] = series;
                    next();
                });
            } else {   
                console.log(studyid+" // " + seriesid+" is not directory .. skipping");
                next();
            }
        }, function(err) {
            done(err, {
                studyid: studyid, 
                study_desc: sample_h.StudyDescription, 
                series_count: count, 
                serieses: serieses,
                esindex: sample_h.qc_esindex 
            }, sample_h);
        });
    });
}

var templates = {};
function getTemplate(h, cb) {
    var name = qc_template.getName(h);
    if(templates[name]) return cb(templates[name], null);

    if(fs.existsSync(config.qc_templates+"/"+name)) {
        //need to load from disk
        var json = fs.readFileSync(config.qc_templates+"/"+name, {encoding: "utf8"});
        var template = JSON.parse(json);
        templates[name] = name;
        cb(template, null);
    } else {
        //first time we see this study (use this instance as a template)
        var template = _.clone(h);
        
        //ignore fields configured not to check
        qc_template.ignore.forEach(function(ignore) {
            delete template[ignore];
        });
        
        //then save as new template
        fs.writeFileSync(config.qc_templates+"/"+name, JSON.stringify(template, null, 4));
        templates[name] = template;
        cb(template, name);
    }
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
            var json = fs.readFileSync(seriesdir+"/"+instid, {encoding: "utf8"});
            var h = JSON.parse(json);
            if(!sample_h) sample_h = h;
            
            //aggregate values for each field
            for(var k in h) {
                switch(k) {
                //ignore some fields
                case "SOPInstanceUID":
                case "InstanceCreationTimestamp":
                case "ContentTimestamp":
                case "AcquisitionTimestamp":
                    break;
                default:
                    var v = h[k];
                    if(!h_agg[k]) h_agg[k] = [];
                    h_agg[k].push(v);
                }
            }

            //do parameter checks
            qc_instance.check(h, function(instance_errors, instance_warnings) {
                //do template checks
                getTemplate(h, function(template, newtemplatename) {
                    if(newtemplatename) {
                        instance_warnings.push({type:"new_template",message: "New StudyDescription "+newtemplatename+" - using this instance as template"});
                    }
                    
                    //compare values
                    for(var tk in template) {
                        var tv = template[tk];
                        if(h[tk] === undefined) {
                            instance_errors.push({type:"missing", field:tk, message: "Field "+tk+" is missing"});
                        } else if(h[tk] != tv) { //TODO - should I do deep comparison?
                            instance_errors.push({type:"invalid_value", field:tk, value: h[tk], message: "Field "+tk+" should be "+tv});
                        }
                    }

                    instances[instid] = {errors: instance_errors, warnings: instance_warnings};
                    next();
                });
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
        
            qc_series.check(h_stats, function(series_errors, series_warnings) {
                done({
                    series_desc: sample_h.SeriesDescription, 
                    //instids: instids, 
                    stats: h_stats, 
                    instances: instances,
                    series_errors: series_errors, 
                    series_warnings: series_warnings
                }, sample_h);
            });
        });
    });
}

/*
var inputdir = process.argv[2];
analyze(inputdir, function(study_errs) {
    console.log("writing to "+inputdir+"/analysis.json");
    fs.writeFileSync(inputdir+"/analysis.json", JSON.stringify(study_errs, null, 4));
});
*/

exports.analyze = analyze;
