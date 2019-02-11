#!/usr/bin/node

//node
var fs = require('fs');
const path = require('path');
var request = require("request");
var tar = require('tar');

//contrib
var winston = require('winston');
var async = require('async');
var mkdirp = require('mkdirp');
var split = require('split');


//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../api/models');
var qc_func = require('../api/qc');


//connect to db and start process loop
db.init(function(err) {
    if(err) throw err; //will crash
    
    console.log("printing process args")
    process.argv.forEach((val, index) => {console.log(`${index}: ${val}`);});

    var fpath = process.argv.slice(2).toString();
    
    if (fpath && file_exists(fpath)) {        
        console.log("filename " +fpath);
        // check if fpath is a file or a directory
        if (path.extname(fpath).toString().toLowerCase() == '.json') {
            console.log("file is JSON ")
            var jsoni = validateJSON(fpath.toString());
            if (jsoni) {                            
                incoming(jsoni,function(){
                    console.log(fpath +" --> processed!!");
                });
            }
        }
        else if (path.extname(fpath).toString() == '.tar') {
            console.log("file is a tarball ")        
            extracttarball(fpath,function(files){
                gotoIncoming(files)
            })
        }
        else {
            console.log("this is a directory ")
            filewalker(fpath, function(err, files){
                if(err) throw err;  
                console.log(files)
                gotoIncoming(files);
            });
        }
    } 
    else if (fpath && !file_exists(fpath)){
        console.log("Path not found --> "+ fpath);
        process.exit(0);
    }
    else {
        console.log("Running in batch mode");
        process0(0)
    }
   
});


function process0(since) {
    logger.info("processing "+config.orthanc.url+'/changes?since='+since+'&limit=1000');
    request({ url: config.orthanc.url+'/changes?since='+since+'&limit=300', json: true }, function(error, response, json) {
        if (!error && response.statusCode === 200) {
            if(json.Changes) {
                async.eachSeries(json.Changes, function(change, next) {
                    if(change.ChangeType == 'NewInstance') {
                        process_instance(change, next);
                    } else {
                        /*
                        //ignore, but remove the record from orthanc
                        request.del(config.orthanc.url+change.Path).on('response', function(res) {
                            next();
                        });
                        */
                        next();
                    }
                }, function(err) {
                    if(err) throw err;
                    logger.debug("last:"+json.Last);
                    if(json.Done) setTimeout(function() { process0(json.Last)}, 1000*3);
                    else setTimeout(function() {process0(json.Last)}, 0);
                });
            }
        } else {
            //failed to load
            logger.error(error);
            logger.error(response);
            throw error;
        }
    });
}

function process_instance(change, next) {
    /* sample change object
    { ChangeType: 'NewInstance',
      Date: '20150420T172053',
      ID: 'bb1b239d-a80d6649-44ea3fc5-b6527fc1-fe4ce7ed',
      Path: '/instances/bb1b239d-a80d6649-44ea3fc5-b6527fc1-fe4ce7ed',
      ResourceType: 'Instance',
      Seq: 110 }
    */
    var tagurl = config.orthanc.url+change.Path+'/tags';
    logger.info("loading (seq:"+change.Seq+"):"+tagurl);
    request({ url: tagurl, json: true }, function(err, res, json){
        if(err) {
            logger.error(err);
            next(err);
        } else {
            incoming(json, function(){
                request.del(config.orthanc.url+change.Path).on('response', function(res) {
                    next();
                });
            });
        }
    });
}

//here is the main business logic
function incoming(tags, cb) {
    var research = null;
    var exam = null;
    var series = null;
    var template = null;
    var aq = null;
    var h = {};
    var isHeader;

    async.series([

        function(next) {
            var testag = tags[Object.keys(tags)[0]];
            console.log(testag);
            if (testag.Name == undefined) {
                isHeader = true;
                h = tags;
                console.log("is header: "+ isHeader)
                return next();
            } else {
                isHeader = false;
                console.log("is header: "+ isHeader)
                return next();
            }
        },

        //process tags into key/value pairs for database
        function(next) {  
            if (isHeader) return next();
            console.log("Parsing tags into header h")
            async.each(tags, function(tag, _cb) {
                h[tag.Name] = tag.Value;
                _cb();
            }, function(err) {
                next(err);
            });
        },

        function(next) {
            try {
                //parse some special fields
                //if these fields fails to set, rest of the behavior is undefined.
                //according to john, however, iibisid and subject should always be found
                var meta = qc_func.instance.parseMeta(h);
                h.qc_iibisid = meta.iibisid;
                h.qc_subject = meta.subject;
                h.qc_istemplate = meta.template;
                h.qc_series_desc = meta.series_desc;
                //h.qc_series_desc_version = meta.series_desc_version;

                //construct esindex
                var esindex = qc_func.instance.composeESIndex(h);
                logger.info(h.qc_iibisid+" subject:"+h.qc_subject+" esindex:"+esindex+" "+h.SOPInstanceUID);
                h.qc_esindex = esindex;
                next();
            } catch(err) {
                next(err);
            }
        },

        // Make sure this header is not in the databse already
        function(next) {
            if(!h.qc_istemplate) return next();

            db.TemplateHeader.findOne({
                SOPInstanceUID: h.SOPInstanceUID
            }, function(err,repeated_header) {
                if (err) return next(err);
                if (repeated_header) {

                    var fpath = h.qc_iibisid+"/"+h.qc_subject+"/"+h.StudyInstanceUID+"/"+h.qc_series_desc;

                    logger.info(h.SOPInstanceUID+ " --Repeated image header identified -- archiving and deprecating qc state of series "+ fpath);

                    // check if this template is used for QC
                    db.Template.findOne({_id:repeated_header.template_id},function(err,template){
                        if (err) return next(err);

                        db.Series.find({"qc.template_id":template._id}).count(function (err, usedInQC) {
                            if (err) return next(err);

                            if (usedInQC == 0) {

                                qc_func.series.deprecate_series(h, 'overwritten',function(err){
                                    if (err) return next(err);

                                    var new_event = {
                                        service_id: 'incoming', //if event was performeed by a system, this is set
                                        title: 'Template Overwritten',
                                        detail: {},
                                        date: new Date()
                                    }

                                    qc_func.series.overwritte_template(repeated_header.series_id,new_event,function(err) {
                                        if (err) return next(err);
                                        return next()
                                    })
                                })
                            } else {
                                return next("Cannot overwrite template -- it is currently used to QC "+usedInQC+ " series");
                            }
                        })
                    })
                } else {
                    next();
                }
            });
        },


        // Make sure this header is not in the databse already
        function(next) {
            if(h.qc_istemplate) return next();

            db.Image.findOne({
                SOPInstanceUID: h.SOPInstanceUID
            }, function(err,repeated_header) {
                if (err) return next(err);
                if (repeated_header) {

                    var fpath = h.qc_iibisid+"/"+h.qc_subject+"/"+h.StudyInstanceUID+"/"+h.qc_series_desc;

                    logger.info(h.SOPInstanceUID+ " --Repeated image header identified -- archiving and deprecating qc state of series "+ fpath);

                    qc_func.series.deprecate_series(h, 'overwritten',function(err){
                        if (err) return next(err);

                        var new_event = {
                            service_id: 'incoming', //if event was performeed by a system, this is set
                            title: 'Series Overwritten',
                            detail: {},
                            date: new Date()
                        }

                        qc_func.series.unQc_series(repeated_header.series_id,new_event,function(err) {
                            if (err) return next(err);
                            return next()
                        })
                    })
                } else {;
                    next();
                }
            });
        },


        function(next) {
            var fpath = config.cleaner.raw_headers+"/"+h.qc_iibisid+"/"+h.qc_subject+"/"+h.StudyInstanceUID+"/"+h.qc_series_desc;
            var path2file = fpath+"/"+h.SOPInstanceUID+".json"
            //write full header to disk, not simplified tags
            write_to_disk(fpath, path2file, tags, function(err) {
                if(err) throw err; //let's kill the app - to alert the operator of this critical issue
                var path2tar = fpath+".tar"
                write_to_tar(path2tar, path2file, function(err) {
                    if(err) throw err; //let's kill the app - to alert the operator of this critical issue
                    next();
                });
            });
        },


        function(next) {
            try {
                qc_func.instance.clean(h);
                console.log('cleaned image: '+h.SOPInstanceUID)
                next();
            } catch(err) {
                next(err);
            }
        },


        function(next) {
            //ignore all image/template with SeriesNumber > 200
            // AAK - large SeriesNumber's identify reconstructed images which should not be inserted in the database
            if(h.Modality == "MR") {
                if(h.SeriesNumber > 200) {
                    return next("MR image SeriesNumber is >200:"+h.SeriesNumber);
                }
            } else {
                if(h.SeriesNumber > 100) {
                    return next("image SeriesNumber is >100:"+h.SeriesNumber);
                }
            }
            next();
        },

        //set the default ACL for new IIBISids
        function(next) {
            db.Acl.findOne({IIBISID: h.qc_iibisid}, function(err, acl) {
                var update = false;
                if (err) {
                    return next();
                }
                if (!acl) {
                    acl = {
                        IIBISID: h.qc_iibisid
                    }
                }

                for( let a of config.acl.actions) {
                    if(acl[a] === undefined) { //action not defined, create it
                        update = true;
                        acl[a] = {
                            users: [],
                            groups: config.acl.default_groups
                        }
                    } else {
                        for( let gid of config.acl.default_groups) {
                            if(acl[a].groups.indexOf(gid) < 0) { //default group not found, add it
                                acl[a].groups.push(gid);
                                update = true;
                            }
                        }
                    }
                }

                if(update) {
                    db.Acl.findOneAndUpdate({IIBISID: h.qc_iibisid}, acl, {upsert: true}, function (err, doc) {
                        if (err) console.log('error updating ACLs');
                        return next();
                    });
                } else {
                    return next();
                }
            });
        },

        //make sure we know about this research
        function(next) {
            //TODO radio_tracer should always be set for CT.. right? Should I validate?
            var radio_tracer = null;
            if(h.RadiopharmaceuticalInformationSequence && h.RadiopharmaceuticalInformationSequence.length > 0) {
                //AAK - h.RadiopharmaceuticalInformationSequence is an array with a single entry. Can there be more than 1 entry? - for now just pick the first one
                radio_tracer = h.RadiopharmaceuticalInformationSequence[0].Radiopharmaceutical;
            }
            db.Research.findOneAndUpdate({
                IIBISID: h.qc_iibisid,
                Modality: h.Modality,
                StationName: h.StationName,
                radio_tracer: radio_tracer
            }, {}, {upsert:true, 'new': true}, function(err, _research) {
                if(err) return next(err);
                research = _research;
                next();
            });
        },

        //make sure we know about this exam
        function(next) {
            db.Exam.findOneAndUpdate({
                    research_id: research._id,
                    subject: (h.qc_istemplate?null:h.qc_subject),
                    StudyTimestamp: h.qc_StudyTimestamp
                },
                {
                    istemplate:h.qc_istemplate,
                },
                {upsert:true, 'new': true}, function(err, _exam) {
                    if(err) return next(err);
                    exam = _exam;
                    next();
                });
        },

        //make sure we know about this template and insert template header
        function(next) {
            if(!h.qc_istemplate) return next();  //if not a template then skip

            db.Template.findOneAndUpdate({
                    exam_id: exam._id,
                    series_desc: h.qc_series_desc,
                    SeriesNumber: h.SeriesNumber,
                }, {}, {upsert:true, 'new': true},
                function(err, _template) {
                    if(err) return next(err);
                    template = _template;

                    // Check if a primary image already exists for this series
                    db.TemplateHeader.findOne({
                        template_id: template._id,
                        primary_image: null,
                    }, function(err, _primary_template) {
                        if (err) return next(err);
                        if (!_primary_template) {
                            db.TemplateHeader.create({
                                template_id: template._id,
                                SOPInstanceUID: h.SOPInstanceUID,
                                InstanceNumber: h.InstanceNumber,
                                //EchoNumbers: h.EchoNumbers !== undefined ? h.EchoNumbers : null,
                                primary_image: null,
                                headers: h
                            }, function(err,primary_template) {
                                if (err) return next(err);
                                var deprecated_by = template_deprecatedBy(template);
                                console.log("deprecated_by " + deprecated_by)
                                // finally, insert primary_template._id into the template document and add a "created" event
                                var event = {
                                    service_id: 'incoming', //if event was performeed by a system, this is set
                                    title: 'Received', // This is the date in which the template document was first created in the database
                                    date: new Date()
                                }
                                db.Template.updateOne({_id: template._id},
                                    {
                                        primary_image:primary_template._id,
                                        deprecated_by: deprecated_by !== "undefined"? deprecated_by : null,
                                        $push: { events: event },
                                    }, function(err) {
                                        if (err) return next(err);
                                        return next();
                                    });
                            })
                        } else {
                            //var echonumber = h.EchoNumbers;
                            qc_func.instance.compare_with_primary(_primary_template.headers,h,function(){
                                db.TemplateHeader.create({
                                    template_id: template._id,
                                    SOPInstanceUID: h.SOPInstanceUID,
                                    InstanceNumber: h.InstanceNumber,
                                    //EchoNumbers: echonumber !== undefined ? echonumber : null,
                                    primary_image: _primary_template._id,
                                    headers:h
                                }, function(err) {
                                    if(err) return next(err);
                                    return next();
                                });
                            });
                        }
                    })
                })
        },

        //make sure we know about this series
        function(next) {
            if(h.qc_istemplate) return next();  //if it's template then skip

            db.Series.findOneAndUpdate({
                    exam_id: exam._id,
                    series_desc: h.qc_series_desc,
                    SeriesNumber: h.SeriesNumber,
                    isexcluded: qc_func.series.isExcluded(h.Modality, h.qc_series_desc)
                }, {}, {upsert: true, 'new': true},
                function(err, _series) {
                    if(err) return next(err);
                    series = _series;

                    // Check if a primary image already exists for this series
                    db.Image.findOne({
                        series_id: series._id,
                        primary_image: null,
                    }, function(err, _primary_image) {
                        if (err) return next(err);
                        if (!_primary_image) {
                            db.Image.create({
                                series_id: series._id,
                                SOPInstanceUID: h.SOPInstanceUID,
                                InstanceNumber: h.InstanceNumber,
                                primary_image: null,
                                headers: h
                            }, function(err,primary_image) {
                                if (err) return next(err);
                                var deprecated_by = series_deprecatedBy(series);
                                // finally, insert primary_image._id into the series document
                                var event = {
                                    service_id: 'incoming', //if event was performeed by a system, this is set
                                    title: 'Received', // This is the date in which the template document was first created in the database
                                    date: new Date()
                                }
                                db.Series.updateOne({_id: series._id},
                                    {
                                        primary_image:primary_image._id,
                                        deprecated_by: deprecated_by !== "undefined"? deprecated_by : null,
                                        $push: { events: event },
                                    }, function(err) {
                                        if (err) return next(err);
                                        return next();
                                    });
                            })
                        } else {
                            // Check if series has been QC-ed already (i.e. if this is a new image for an existing series)
                            if(series.qc !== undefined) {
                                series.qc = undefined;
                                series.save();
                            }

                            qc_func.instance.compare_with_primary(_primary_image.headers,h,function(){
                                db.Image.create({
                                    series_id: series._id,
                                    SOPInstanceUID: h.SOPInstanceUID,
                                    InstanceNumber: h.InstanceNumber,
                                    //EchoNumbers: echonumber !== undefined ? echonumber : null,
                                    primary_image: _primary_image._id,
                                    headers:h
                                }, function(err) {
                                    if(err) return next(err);
                                    return next();
                                });
                            });
                        }
                    });
                });
        },


    ], function(err) {

        //all done
        if(err) {
            logger.error(err);
            h.qc_err = err;
            // conn.publish(config.cleaner.failed_q, h); //publishing to default exchange can't be confirmed?
            write_to_disk(config.cleaner.failed_headers, h, function(err) {
                if(err) throw err; //TODO - will crash app. Maybe we should remove this if we want this to run continuously
                cb();
            });
        } else {
            //all good then.
            cb();
        }
    });
}

var series_deprecatedBy = function(series) {
    db.Series.update({
        exam_id: series.exam_id,
        series_desc: series.series_desc,
        SeriesNumber: { $lt: series.SeriesNumber },
    }, {
        deprecated_by: series._id,
    },{multi: true}, function(err) {
        if (err) logger.warn("error deprecating older series");
    });

    db.Series.findOne({
        exam_id: series.exam_id,
        series_desc: series.series_desc,
        SeriesNumber: { $gt: series.SeriesNumber },
    }, function(err, _series){
        if(err) {
            logger.warn("error deprecating current series");
            return (null);
        }
        if(!_series) return (undefined); //series.deprecated_by = null;
        if(_series) return (_series._id); //series.deprecated_by = _series._id;
    });
}

var template_deprecatedBy = function(template) {
    db.Template.update({
        exam_id: template.exam_id,
        series_desc: template.series_desc,
        SeriesNumber: { $lt: template.SeriesNumber },
    }, {
        deprecated_by: template._id,
    },{multi: true}, function(err,numdeprecated) {
        if (err) logger.warn("error deprecating older template");
        console.log(numdeprecated);
    });

    db.Template.findOne({
        exam_id: template.exam_id,
        series_desc: template.series_desc,
        SeriesNumber: { $gt: template.SeriesNumber },
    }, function(err, _template){
        if(err) {
            logger.warn("error deprecating current series");
            return (null);
        }
        if(!_template) return (undefined); //series.deprecated_by = null;
        if(_template) return (_template._id); //series.deprecated_by = _series._id;
    });
}

function write_to_tar(path2tar, path2file, cb) {
    tar.u({file: path2tar},[path2file]
    ).then(cb);
}


function write_to_disk(dir, filepath, h, cb) {

    if(!qc_func.series.file_exists(dir)) mkdirp.sync(dir);
    fs.writeFile(filepath, JSON.stringify(h), cb);
}

function extracttarball(path2tar,cb){
    var extr = [];
    tar.x({
        file: path2tar,
        cwd: "/",
        onentry: entry => {
            console.log(entry.path);
            extr.push("/"+entry.path);
        }
    }).then(function(){
        console.log(extr);
        cb(extr)
    })
}

function gotoIncoming(filename){             

    filename.forEach(function(f){
        var jsoni = validateJSON(f.toString());
        if (jsoni) {                            
            incoming(jsoni,function(){
                console.log(f +" --> processed!!");
            });
        } 
    })
    // async.eachSeries(filename, function(f, next) {                  
    //     var jsoni = validateJSON(f.toString());
    //     if (jsoni) {                            
    //         incoming(jsoni,function(){
    //             console.log(f +" --> processed!!");
    //             next();
    //         });
    //     }              
    // }, function(err) {
    //     if(err) throw err;
    //     logger.debug("processed "+filename.length+ " files");
    //     cb()
    // });
}


function validateJSON(filePath) {
     try {
        var json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        //console.log(json);
        return json;
    } catch(e) {
        return null;
    }
}

var file_exists = function(filePath){
    try {
        if (fs.existsSync(filePath)) {
            return true;
        }
      } catch(err) {
        return false;
      }
}


function filewalker(dir, done) {
    let results = [];
    fs.readdir(dir, function(err, list) {
        if (err) return done(err);
        var pending = list.length;
        if (!pending) return done(null, results);
        list.forEach(function(file){
            file = path.resolve(dir, file);
            fs.stat(file, function(err, stat){
                // If directory, execute a recursive call
                if (stat && stat.isDirectory()) {
                    filewalker(file, function(err, res){
                        results = results.concat(res);
                        if (!--pending) done(null, results);
                    });
                } else {
                    results.push(file);
                    if (!--pending) done(null, results);
                }
            });
        });
    });
};