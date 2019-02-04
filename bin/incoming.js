#!/usr/bin/node

//node
var fs = require('fs');
var request = require("request");
var tar = require('tar');

//contrib
var winston = require('winston');
var async = require('async');
var mkdirp = require('mkdirp');

//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../api/models');
var qc_func = require('../api/qc');

//connect to db and start process loop
db.init(function(err) {
    if(err) throw err; //will crash
    process(0)
});


function process(since) {
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
                    if(json.Done) setTimeout(function() { process(json.Last)}, 1000*3);
                    else setTimeout(function() {process(json.Last)}, 0);
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
    var tagurl = config.orthanc.url+change.Path+'/simplified-tags';
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
function incoming(h, cb) {
    var research = null;
    var exam = null;
    var series = null;
    var template = null;
    var aq = null;

    async.series([
        function(next) {
            try {
                console.time('meta_func');
                // AAK -- this should be removed once we are ready to deploy
                //debug - remove qc_ fields... it shouldn't be there, but there are.. maybe I've corrupted the data?
                for(var k in h) {
                    if(k.indexOf("qc_") === 0) delete h[k];
                }

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
                console.timeEnd('meta_func');
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

                    var path = h.qc_iibisid+"/"+h.qc_subject+"/"+h.StudyInstanceUID+"/"+h.qc_series_desc;

                    logger.info(h.SOPInstanceUID+ " --Repeated image header identified -- archiving and deprecating qc state of series "+ path);

                    // check if this template is used for QC
                    db.Template.findOne({_id:repeated_header.template_id},function(err,template){
                        if (err) return next(err);

                        db.Series.find({"qc.template_id":template._id}).count(function (err, usedInQC) {
                            if (err) return next(err);

                            if (usedInQC == 0) {

                                qc_func.series.deprecate_series(h, 'overwritten',function(err){
                                    if (err) return next(err);

                                    var new_event = {
                                        service_id: 'cleanAndStore', //if event was performeed by a system, this is set
                                        user_id: 'SCA', //if event was performed by a user, this is set to req.user.sub
                                        title: 'template was overwritten',
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

            console.time('Dupe_lookup');
            db.Image.findOne({
                SOPInstanceUID: h.SOPInstanceUID
            }, function(err,repeated_header) {
                if (err) return next(err);
                if (repeated_header) {

                    var path = h.qc_iibisid+"/"+h.qc_subject+"/"+h.StudyInstanceUID+"/"+h.qc_series_desc;

                    logger.info(h.SOPInstanceUID+ " --Repeated image header identified -- archiving and deprecating qc state of series "+ path);

                    qc_func.series.deprecate_series(h, 'overwritten',function(err){
                        if (err) return next(err);

                        var new_event = {
                            service_id: 'cleanAndStore', //if event was performeed by a system, this is set
                            user_id: 'SCA', //if event was performed by a user, this is set to req.user.sub
                            title: 'series was overwritten',
                            detail: {},
                            date: new Date()
                        }

                        qc_func.series.unQc_series(repeated_header.series_id,new_event,function(err) {
                            if (err) return next(err);
                            console.timeEnd('Dupe_lookup');
                            return next()
                        })
                    })
                } else {
                    console.timeEnd('Dupe_lookup');
                    next();
                }
            });
        },


        function(next) {
            console.time('write_to_disk');
            var path = config.cleaner.raw_headers+"/"+h.qc_iibisid+"/"+h.qc_subject+"/"+h.StudyInstanceUID+"/"+h.qc_series_desc;
            write_to_disk(path, h, function(err) {
                if(err) throw err; //let's kill the app - to alert the operator of this critical issue
                //logger.debug("wrote to raw_headers");
                console.timeEnd('write_to_disk');
                next();
            });
        },

        function(next) {
            console.time('write_to_tar');
            var path = config.cleaner.raw_headers+"/"+h.qc_iibisid+"/"+h.qc_subject+"/"+h.StudyInstanceUID+"/"+h.qc_series_desc;
            var path2tar = path+".tar"
            var path2file = path+"/"+h.SOPInstanceUID+".json"
            // logger.debug("tarball -- storing file>> "+ path2file);
            write_to_tar(path2tar,path2file, function(err) {
                if(err) throw err; //let's kill the app - to alert the operator of this critical issue
                //logger.debug("wrote to tar");
                console.timeEnd('write_to_tar');
                next();
            });
        },

        function(next) {
            console.time('clean');
            try {
                qc_func.instance.clean(h);
                console.log('cleaned image: '+h.SOPInstanceUID)
                console.timeEnd('clean');
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
            console.time('ACL');
            db.Acl.findOne({IIBISID: h.qc_iibisid}, function(err, acl) {
                console.time('ACL-if');
                var update = false;
                if (err) {
                    console.log('error looking up ACLs');
                    return next();
                }
                if (!acl) {
                    console.log('ACL not found, creating!');
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

                console.timeEnd('ACL-if');
                if(update) {
                    console.time('ACL-insert');
                    db.Acl.findOneAndUpdate({IIBISID: h.qc_iibisid}, acl, {upsert: true}, function (err, doc) {
                        if (err) console.log('error updating ACLs');
                        console.timeEnd('ACL-insert');
                        console.timeEnd('ACL');
                        return next();
                    });
                } else {
                    console.log('No ACL update needed');
                    return next();
                }

                // else if (typeof acl.value[h.qc_iibisid] === 'undefined') {
                //     acl.value[h.qc_iibisid] = {};
                //     for( let a of config.acl.actions) {
                //         acl.value[h.qc_iibisid][a] = { users : [], groups : config.acl.default_groups}
                //     }
                // } else {
                //     for( let a of config.acl.actions) {
                //         if(acl.value[h.qc_iibisid][a].groups.indexOf(config.acl.default_groups[0]) < 0){
                //             acl.value[h.qc_iibisid][a].groups = acl.value[h.qc_iibisid][a].groups.concat(config.acl.default_groups);
                //             //console.log(acl.value[h.qc_iibisid][a].groups);
                //         }
                //     }
                // }
                // console.timeEnd('ACL-if');
                // console.time('ACL-insert');
                // db.Acl.findOneAndUpdate({IIBISID: h.qc_iibisid}, {value: acl.value}, {upsert: true}, function (err, doc) {
                //     if (err) console.log('error updating ACLs');
                //     console.timeEnd('ACL-insert');
                //     console.timeEnd('ACL');
                //     return next();
                // });
            });
        },

        //make sure we know about this research
        function(next) {
            console.time('research');
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
                console.timeEnd('research');
                next();
            });
        },

        //make sure we know about this exam
        function(next) {
            console.time('exam');
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
                    console.timeEnd('exam');
                    next();
                });
        },

        //make sure we know about this template and insert template header
        function(next) {
            if(!h.qc_istemplate) return next();  //if not a template then skip

            console.log("Inserting template!!! h.qc_istemplate "+ h.qc_istemplate)
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
                                console.log("derprecated_by " + deprecated_by)
                                // finally, insert primary_template._id into the template document
                                db.Template.updateOne({_id: template._id},
                                    {
                                        primary_image:primary_template._id,
                                        deprecated_by: deprecated_by !== "undefined"? deprecated_by : null
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

            console.time('image_insert');
            //console.log("Inserting series!!! h.qc_istemplate "+ h.qc_istemplate)
            console.time('image_insert_series');
            db.Series.findOneAndUpdate({
                    exam_id: exam._id,
                    series_desc: h.qc_series_desc,
                    SeriesNumber: h.SeriesNumber,
                    isexcluded: qc_func.series.isExcluded(h.Modality, h.qc_series_desc)
                }, {}, {upsert: true, 'new': true},
                function(err, _series) {
                    console.timeEnd('image_insert_series');
                    if(err) return next(err);
                    series = _series;

                    // Check if a primary image already exists for this series
                    console.time('imagePrimary');
                    db.Image.findOne({
                        series_id: series._id,
                        primary_image: null,
                    }, function(err, _primary_image) {
                        if (err) return next(err);
                        console.timeEnd('imagePrimary');
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
                                db.Series.updateOne({_id: series._id},
                                    {
                                        primary_image:primary_image._id,
                                        deprecated_by: deprecated_by !== "undefined"? deprecated_by : null
                                    }, function(err) {
                                        if (err) return next(err);
                                        console.timeEnd('image_insert');
                                        return next();
                                    });
                            })
                        } else {
                            // Check if series has been QC-ed already (i.e. if this is a new image for an existing series)
                            console.time('checkQC');
                            series.qc = undefined;
                            series.save();
                            console.timeEnd('checkQC');

                            // db.Series.find({_id: series._id, qc: {$exists: true}}).exec(function(err,qced_series) {
                            //     if (err) return next(err);
                            //     if (qced_series) {  // remove embedded qc objects from series and from all images in the series
                            //         db.Series.update({_id:series._id}, {$unset:{qc:1}},{multi:false}, function(err) {
                            //             if (err) return next(err);
                            //             db.Image.update({series_id:series._id}, {$unset:{qc:1}},{multi:true}, function(err) {
                            //                 console.timeEnd('checkQC');
                            //                 if (err) return next(err);
                            //             })
                            //         })
                            //     }
                                // Finally, insert the image in the database
                                //var echonumber = h.EchoNumbers;
                            console.time('compare_and_insert');
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
                                    console.timeEnd('compare_and_insert');
                                    console.timeEnd('image_insert');
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


function write_to_disk(dir, h, cb) {

    if(!qc_func.series.file_exists(dir)) mkdirp.sync(dir);
    fs.writeFile(dir+"/"+h.SOPInstanceUID+".json", JSON.stringify(h,null,4), cb);
}

