#!/usr/bin/node

//node
var fs = require('fs');
var tar = require('tar');

//contrib
var amqp = require('amqp');
var winston = require('winston');
var async = require('async');
var mkdirp = require('mkdirp');

//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../api/models');
var qc_func = require('../api/qc');

//to-be-initizalied
var conn = null;
var cleaned_ex = null;
var cleaned_q = null;
var failed_q = null;
var incoming_q = null;

//connect to AMQP, ensure exchange / queues exists, and subscribe to the incoming q
db.init(function(err) {
    if(err) throw err; //will crash
    conn = amqp.createConnection(config.cleaner.amqp);
    conn.on('ready', function () {
        logger.info("connected to amqp - connecting to ex:"+config.cleaner.ex);
        conn.exchange(config.cleaner.ex, {confirm: true, autoDelete: false, durable: true, type: 'topic'}, function(_cleaned_ex) {
            cleaned_ex = _cleaned_ex;
            logger.info("connecting to failed_q:"+config.cleaner.failed_q);
            conn.queue(config.cleaner.failed_q, {autoDelete: false, durable: true}, function(_failed_q) {
                failed_q = _failed_q;
                logger.info("connecting to es_q:"+config.cleaner.es_q);
                conn.queue(config.cleaner.es_q, {autoDelete: false, durable: true}, function(_cleaned_q) {
                    cleaned_q = _cleaned_q;
                    logger.info("binding es_q to ex:"+config.cleaner.ex);
                    cleaned_q.bind(config.cleaner.ex, '#', function() {
                        logger.info("connecting to incoming q:"+config.incoming.q);
                        conn.queue(config.incoming.q, {autoDelete: false, durable: true}, function (_incoming_q) {
                            incoming_q = _incoming_q;
                            logger.info("finally, subscribing to incoming q");
                            incoming_q.subscribe({ack: true, prefetchCount: 1}, incoming);
                        });
                    });
                });
            });
        });
    });
});

//here is the main business logic
function incoming(h, msg_h, info, ack) {
    var research = null;
    var exam = null;
    var series = null;
    var template = null;
    var aq = null;

    async.series([
        function(next) {
            try {
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
                                        user_id: '1', //if event was performed by a user, this is set to req.user.sub
                                        title: 'Overwritten',
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

                    var path = h.qc_iibisid+"/"+h.qc_subject+"/"+h.StudyInstanceUID+"/"+h.qc_series_desc;

                    logger.info(h.SOPInstanceUID+ " --Repeated image header identified -- archiving and deprecating qc state of series "+ path);

                    qc_func.series.deprecate_series(h, 'overwritten',function(err){
                        if (err) return next(err);

                        var new_event = {    
                            service_id: 'cleanAndStore', //if event was performeed by a system, this is set
                            user_id: '1', //if event was performed by a user, this is set to req.user.sub
                            title: 'Overwritten',
                            detail: {},
                            date: new Date()
                        }

                        qc_func.series.unQc_series(repeated_header.series_id,new_event,function(err) {
                            if (err) return next(err);
                            return next()
                        })                                          
                    })
                } else {
                    next();
                }
            });
        },


        function(next) {
            var path = config.cleaner.raw_headers+"/"+h.qc_iibisid+"/"+h.qc_subject+"/"+h.StudyInstanceUID+"/"+h.qc_series_desc;
            write_to_disk(path, h, function(err) {
                if(err) throw err; //let's kill the app - to alert the operator of this critical issue
                //logger.debug("wrote to raw_headers");                
                next();
            });
        },

        function(next) {  
            var path = config.cleaner.raw_headers+"/"+h.qc_iibisid+"/"+h.qc_subject+"/"+h.StudyInstanceUID+"/"+h.qc_series_desc;          
            var path2tar = path+".tar"
            var path2file = path+"/"+h.SOPInstanceUID+".json"
             logger.debug("tarball -- storing file>> "+ path2file);
            write_to_tar(path2tar,path2file, function(err) {
                if(err) throw err; //let's kill the app - to alert the operator of this critical issue
                //logger.debug("wrote to tar");                
                next();
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
            db.Acl.findOne({key: config.acl.key}, function(err, acl) {
                if (err) {
                    console.log('error looking up ACLs');
                    return next();
                }
                if (!acl) {
                    console.log('unable to locate ACLs');
                    return next();
                } else if (typeof acl.value[h.qc_iibisid] === 'undefined') {
                    acl.value[h.qc_iibisid] = {};
                    for( let a of config.acl.actions) {
                        acl.value[h.qc_iibisid][a] = { users : [], groups : config.acl.default_groups}
                    }
                } else {
                    for( let a of config.acl.actions) {
                        if(acl.value[h.qc_iibisid][a].groups.indexOf(config.acl.default_groups[0]) < 0){
                            acl.value[h.qc_iibisid][a].groups = acl.value[h.qc_iibisid][a].groups.concat(config.acl.default_groups);
                            //console.log(acl.value[h.qc_iibisid][a].groups);
                        }
                    }
                }
                db.Acl.findOneAndUpdate({key: config.acl.key}, {value: acl.value}, {upsert: true}, function (err, doc) {
                    if (err) console.log('error updating ACLs');
                    return next();
                });
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
                            // finally, insert primary_template._id into the template document and add a "created" event
                            var event = {    
                                service_id: 'cleanAndStore', //if event was performeed by a system, this is set
                                user_id: 'SCA', //if event was performed by a user, this is set to req.user.sub
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
            
            console.log("Inserting series!!! h.qc_istemplate "+ h.qc_istemplate)
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
                                service_id: 'cleanAndStore', //if event was performeed by a system, this is set
                                user_id: 'SCA', //if event was performed by a user, this is set to req.user.sub
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
                        db.Series.find({_id: series._id, qc: {$exists: true}}).exec(function(err,qced_series) {
                            if (err) return next(err);
                            if (qced_series) {  // remove embedded qc objects from series and from all images in the series                                        
                                db.Series.update({_id:series._id}, {$unset:{qc:1}},{multi:false}, function(err) {
                                    if (err) return next(err);                                                         
                                    db.Image.update({series_id:series._id}, {$unset:{qc:1}},{multi:true}, function(err) {
                                        if (err) return next(err);
                                    })  
                                })
                            }
                            // Finally, insert the image in the database
                            //var echonumber = h.EchoNumbers;
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
            conn.publish(config.cleaner.failed_q, h); //publishing to default exchange can't be confirmed?
            write_to_disk(config.cleaner.failed_headers, h, function(err) {
                if(err) throw err; //TODO - will crash app. Maybe we should remove this if we want this to run continuously
                ack.acknowledge(); 
            });
        } else {
            //all good then.
            ack.acknowledge();
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

