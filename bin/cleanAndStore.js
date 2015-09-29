#!/usr/bin/node

//os
var fs = require('fs');

//contrib
var amqp = require('amqp');
var winston = require('winston');
var async = require('async');
var mkdirp = require('mkdirp');

//mine
var config = require('../api/config/config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../api/models');
var instance = require('../api/qc/instance');

//to-be-initizalied
var conn = null;
var cleaned_ex = null;
var cleaned_q = null;
var failed_q = null;
var incoming_q = null;

//connect to AMQP, ensure exchange / queues exists, and subscribe to the incoming q
db.init(function(err) {
    if(err) throw err; //will crash
    conn = amqp.createConnection(config.amqp);
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
                //parse some special fields
                //if these fields fails to set, rest of the behavior is undefined.
                //according to john, however, iibisid and subject should always be found
                var pn = instance.parseMeta(h);
                h.qc_iibisid = pn.iibisid;
                h.qc_subject = pn.subject;
                h.qc_istemplate = pn.template;

                //construct esindex
                var esindex = instance.composeESIndex(h);
                logger.info(h.qc_iibisid+" esindex:"+esindex+" "+h.SOPInstanceUID);
                h.qc_esindex = esindex;

                next();
            } catch(err) {
                next(err);
            }
        },

        function(next) {
            //store a copy of raw input before cleaning
            var path = config.cleaner.raw_headers+"/"+h.qc_iibisid+"/"+h.qc_subject+"/"+h.StudyInstanceUID+"/"+h.SeriesDescription;
            logger.debug("storing header to "+path);
            write_to_disk(path, h, function(err) {
                if(err) throw err; //let's kill the app - to alert the operator of this critical issue
                logger.debug("wrote to raw_headers");
                next();
            });
        },

        function(next) {
            try {       
                instance.clean(h);
                next();
            } catch(err) {
                next(err);
            }
        },

        function(next) {
            //store clearned data to cleaned directory
            var path = config.cleaner.cleaned+"/"+h.qc_iibisid+"/"+h.qc_subject+"/"+h.StudyInstanceUID+"/"+h.SeriesDescription;
            logger.debug("storing headers to "+path);
            write_to_disk(path, h, function(err) {
                if(err) logger.error(err); //continue
                next();
            });
        },

        function(next) {
            if(h.qc_istemplate) return next(); //if template then don't send to es
            logger.debug("publishing to cleaned_ex");
            cleaned_ex.publish('', h, {}, function(err) {
                next(err);
            });
        },

        //make sure we know about this research
        function(next) {
            db.Research.findOneAndUpdate({
                IIBISID: h.qc_iibisid,
                Modality: h.Modality,
                StationName: h.StationName,
                Radiopharmaceutical: h.Radiopharmaceutical, //undefined for MR
            }, {}, {upsert:true, 'new': true}, function(err, _research) {
                if(err) return next(err);
                research = _research;
                next();
            });
        },

        //make sure we know about this series
        function(next) {
            db.Series.findOneAndUpdate({
                research_id: research._id,
                SeriesDescription: h.SeriesDescription,
            }, {}, {upsert:true, 'new': true}, function(err, _series) {
                if(err) return next(err);
                series = _series;
                next();
            });
        },
        
        //make sure we know about this template 
        function(next) {
            if(!h.qc_istemplate) return next();  //if not template then skip

            db.Template.findOneAndUpdate({
                series_id: series._id,
                date: h.qc_StudyTimestamp, //TODO qc_StudyTimestamp the best choice?
            }, {
                $inc: { count: 1 }, //increment the count
                headers: h, //update with the latest headers (or mabe we should store all under an array?)
            }, {upsert:true, 'new': true}, function(err, _template) {
                if(err) return next(err);
                next();
            });
        },
        
        //make sure we know about this study
        function(next) {
            if(h.qc_istemplate) return next();  //if it's template then skip

            db.Study.findOneAndUpdate({
                series_id: series._id,
                subject: h.qc_subject,
                StudyInstanceUID: h.StudyInstanceUID,
            }, {
                StudyTimestamp: h.qc_StudyTimestamp,
            }, {upsert:true, 'new': true}, function(err, _study) {
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

            var image = new db.Image({
                research_id: research._id,
                study_id: study._id,
                series_id: series._id,
                acquisition_id: aq._id,
                headers: h,
            });
            image.save(next);
        },

    ], function(err) {
        //all done
        if(err) {
            logger.error(err);
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

