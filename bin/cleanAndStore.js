#!/usr/bin/node

//node
var fs = require('fs');

//contrib
var amqp = require('amqp');
var winston = require('winston');
var async = require('async');
var mkdirp = require('mkdirp');

//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../api/models');
var qc = require('../api/qc');

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
                            incoming_q.subscribe({ack: true, prefetchCount: 1}, handle_message);
                        });
                    });
                });
            });
        });
    });
});

//here is the main business logic
function handle_message(h, msg_h, info, ack) {
    var research = null;
    var series = null;
    var study = null;
    var aq = null;
    async.series([
        function(next) {
            try {
                //debug - remove qc_ fields... it shouldn't be there, but there are.. maybe I've corrupted the data?
                for(var k in h) {
                    if(k.indexOf("qc_") === 0) delete h[k];
                }
                
                //parse some special fields
                //if these fields fails to set, rest of the behavior is undefined.
                //according to john, however, iibisid and subject should always be found
                var meta = qc.instance.parseMeta(h);
                h.qc_iibisid = meta.iibisid;
                h.qc_subject = meta.subject;
                h.qc_istemplate = meta.template;
                h.qc_series_desc = meta.series_desc;
                h.qc_series_desc_version = meta.series_desc_version;

                //construct esindex
                var esindex = qc.instance.composeESIndex(h);
                logger.info(h.qc_iibisid+" esindex:"+esindex+" "+h.SOPInstanceUID);
                h.qc_esindex = esindex;

                next();
            } catch(err) {
                next(err);
            }
        },

        function(next) {
            //store a copy of raw input before cleaning
            var path = config.cleaner.raw_headers+"/"+h.qc_iibisid+"/"+h.qc_subject+"/"+h.StudyInstanceUID+"/"+h.qc_series_desc;
            //logger.debug("storing header to "+path);
            write_to_disk(path, h, function(err) {
                if(err) throw err; //let's kill the app - to alert the operator of this critical issue
                //logger.debug("wrote to raw_headers");
                next();
            });
        },

        function(next) {
            try {       
                qc.instance.clean(h);
                next();
            } catch(err) {
                next(err);
            }
        },

        function(next) {
            //store clearned data to cleaned directory
            var path = config.cleaner.cleaned+"/"+h.qc_iibisid+"/"+h.qc_subject+"/"+h.StudyInstanceUID+"/"+h.qc_series_desc;
            //logger.debug("storing headers to "+path);
            write_to_disk(path, h, function(err) {
                if(err) logger.error(err); //continue
                next();
            });
        },

        //make sure we know about this research
        function(next) {
            //TODO radio_tracer should always be set for CT.. right? Should I validate?
            var radio_tracer = undefined;
            if(h.RadiopharmaceuticalInformationSequence) {
                radio_tracer = h.RadiopharmaceuticalInformationSequence[0].Radiopharmaceutical;
            }

            db.Research.findOneAndUpdate({
                IIBISID: h.qc_iibisid,
                Modality: h.Modality,
                StationName: h.StationName,
                radio_tracer: radio_tracer,
            }, {}, {upsert:true, 'new': true}, function(err, _research) {
                if(err) return next(err);
                research = _research;
                next();
            });
        },

        /*
        //make sure we know about this series
        function(next) {
            db.Series.findOneAndUpdate({
                research_id: research._id,
                series_desc: h.qc_series_desc,
            }, {}, {upsert:true, 'new': true}, function(err, _series) {
                if(err) return next(err);
                series = _series;
                next();
            });
        },
        */
        
        //make sure we know about this template 
        function(next) {
            if(!h.qc_istemplate) return next();  //if not template then skip

            db.Template.findOneAndUpdate({
                research_id: research._id,
                series_desc: h.qc_series_desc,
                date: h.qc_StudyTimestamp, 
                SeriesNumber: h.SeriesNumber,
            }, {
                //$inc: { count: 1 }, //increment the count
                Modality: h.Modality,
                //headers: h, //update with the latest headers (or mabe we should store all under an array?)
            }, {upsert:true, 'new': true}, function(err, _template) {
                if(err) return next(err);

                //store template header
                db.TemplateHeader.findOneAndUpdate({
                    template_id: _template._id,
                    AcquisitionNumber: h.AcquisitionNumber,
                    InstanceNumber: h.InstanceNumber,
                }, {
                    headers: h,
                    IIBISID: h.qc_iibisid,
                }, {upsert:true, 'new': true}, function(err, _templateheader) {
                    if(err) return next(err);
                    next();
                });
                /*
                var ih = new db.TemplateHeader({
                    template_id: _template._id,
                    AcquisitionNumber: h.AcquisitionNumber,
                    InstanceNumber: h.InstanceNumber,
                    headers: h,
                });
                ih.save(function(err) {
                    if(err) return next(err);
                    next();
                });
                */
            });
        },
        
        //make sure we know about this study
        function(next) {
            if(h.qc_istemplate) return next();  //if it's template then skip

            db.Study.findOneAndUpdate({
                research_id: research._id,
                series_desc: h.qc_series_desc,
                subject: h.qc_subject,
                StudyInstanceUID: h.StudyInstanceUID,
                SeriesNumber: h.SeriesNumber,
            }, {
                //$inc: { count: 1 }, //increment the count
                Modality: h.Modality,
                StudyTimestamp: h.qc_StudyTimestamp,
                IIBISID: h.qc_iibisid,
            }, {upsert: true, 'new': true}, function(err, _study) {
                if(err) return next(err);
                study = _study;
                next();
            });
        },

        //make sure we know about this acquisition
        function(next) {
            if(h.qc_istemplate) return next();  //if it's template then skip

            db.Acquisition.findOneAndUpdate({
                study_id: study._id,
                AcquisitionNumber: h.AcquisitionNumber,
            }, {}, {upsert:true, 'new': true}, function(err, _aq) {
                if(err) return next(err);
                aq = _aq;
                next();
            });
        },
        
        //insert image
        function(next) {
            if(h.qc_istemplate) return next();  //if template then skip

            db.Image.findOneAndUpdate({
                acquisition_id: aq._id,
                InstanceNumber: h.InstanceNumber,
            }, {
                research_id: research._id,
                IIBISID: h.qc_iibisid,
                study_id: study._id,
                headers: h,
                $unset: {qc: 1},
            }, {upsert: true, 'new': true}, function(err, _study) {
                if(err) return next(err);
                study = _study;
                
                //send to elastic search
                //TODO - somehow only do this when the record is first inserted.. fineOneAndUpdate seems to give me this info, 
                //but maybe I can add a counter for each record?
                cleaned_ex.publish('', h, {}, function(err) {
                    next(err);
                });
            });

            /*
            db.Image.findOne({
                acquisition_id: aq._id,
                InstanceNumber: h.InstanceNumber,
            }, function(err, image) {
                if(err) return next(err);
                var data = {
                    research_id: research._id,
                    study_id: study._id,
                    headers: h
                }
                if(image) {
                    //if image already exists, update it!
                    logger.warn("SOPInstanceUID: "+h.SOPInstanceUID+" already exists.. updating header");
                    db.Image.update({SOPInstanceUID: h.SOPInstanceUID}, {$set: data, $unset: {qc: 1}}, function(err, res) {
                        if(err) logger.error(err); //continue anyway..
                        return next(); 
                    });
                } else {
                    //new image!
                    logger.info("new image! SOPInstanceUID: "+h.SOPInstanceUID);
                    data.SOPInstanceUID = h.SOPInstanceUID;
                    var image = new db.Image(data);
                    image.save(function(err) {
                        if(err) logger.error(err); //continue to publish anyway..
                
                        //send to elastic search
                        cleaned_ex.publish('', h, {}, function(err) {
                            next(err);
                        });
                    });
                }
            });
            */
        },
    ], function(err) {
        //all done
        if(err) {
            logger.error(err);
            h.qc_err = err;
            conn.publish(config.cleaner.failed_q, h); //publishing to default exchange can't be confirmed?
            fs.writeFile(config.cleaner.failed_headers+"/"+h.SOPInstanceUID+".json", JSON.stringify(h,null,4), function(err) {
                if(err) throw err; //TODO - will crash app. Maybe we should remove this if we want this to run continuously
                ack.acknowledge(); 
            }); 
        } else {
            //all good then.
            ack.acknowledge();
        }
    });
}

function write_to_disk(dir, h, cb) {
    fs.exists(dir, function (exists) {
        //if(!exists) fs.mkdirSync(dir);
        if(!exists) mkdirp.sync(dir);
        fs.writeFile(dir+"/"+h.SOPInstanceUID+".json", JSON.stringify(h,null,4), cb);
    });
}

