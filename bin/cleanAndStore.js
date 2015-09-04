#!/usr/bin/node

//os
var fs = require('fs');

//contrib
var amqp = require('amqp');
var winston = require('winston');
var async = require('async');

//mine
var config = require('../config/config');
var logger = new winston.Logger(config.logger.winston);
var models = require('../models');
var instance = require('../qc/instance');

//to-be-initizalied
var conn = null;
var cleaned_ex = null;
var cleaned_q = null;
var failed_q = null;
var incoming_q = null;

models.init(function(err) {
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
    //pull some very important information first
    var pn = instance.parseMeta(h);
    h.qc_iibisid = pn.iibisid;
    h.qc_subject = pn.subject;

    //then, first things first, store a copy of raw input
    var path = config.cleaner.raw_headers+"/"+h.qc_iibisid;
    logger.info("storing header to "+path);
    write_to_disk(path, h, function(err) {
        if(err) throw err; //will crash app
        logger.info("wrote to raw_headers");
        
        //cb to call after handling instance / template
        //store on failed_header queue if something goes wrong
        function finish_handler(err) {
            if(err) {
                logger.error("caught exception while handling:"+path);
                logger.error(err);
               // if(err.stack) logger.error(err.stack);
                conn.publish(config.cleaner.failed_q, h); //publishing to default exchange can't be confirmed?
                fs.writeFile(config.cleaner.failed_headers+"/"+h.SOPInstanceUID+".json", JSON.stringify(h,null,4), function(err) {
                    if(err) throw err; //will crash app
                    ack.acknowledge(); 
                }); 
            } else {
                //all good then.
                ack.acknowledge();
            }
        }

        try {
            var esindex = instance.composeESIndex(h);
            logger.info(h.qc_iibisid+" esindex:"+esindex+" "+h.SOPInstanceUID);
            h.qc_esindex = esindex;

            instance.clean(h);

            if(pn.template) {
                handle_template(h, finish_handler);
            } else {
                handle_instance(h, finish_handler);
            }
        } catch(err) {
            finish_handler(err);
        }
    });
}

function findOrCreate_template(study, h, cb) {
    var keys = {
        SOPInstanceUID: h.SOPInstanceUID,
    };
    models.Template.findOne(keys, function(err, template) {
        if(err) return cb(err);
        if(!template) {
            template = new models.Template(keys);
            template.study_id = study._id;
            template.headers = h;
            template.save(cb);

            logger.info("received a new template -- SOPInstanceUID:" + h.SOPInstanceUID);

        } else cb(null, template); //template re-sent?
    });
}

function handle_template(h, cb) {
    var path = config.cleaner.cleaned_templates;
    write_to_disk(path, h, function(err) {
        if(err) return cb(err);

        //add to db
        findOrCreate_study(h, function(err, study) {
            if(err) return cb(err);
            findOrCreate_template(study, h, cb);
        });
    });
}

function handle_instance(h, cb) {
    async.waterfall([
        function(next) {
            //publish to es queue
            cleaned_ex.publish('', h, {}, function(err) {
                next(err);
            });
        },

        function(next) {
            //start by making sure we know about this study
            findOrCreate_study(h, function(err, study) {
                if(err) return next(err);
                
                /*
                //add series id to study
                if(study.SeriesInstanceUID.indexOf(h.SeriesInstanceUID) === -1) {
                    study.SeriesInstanceUID.push(h.SeriesInstanceUID);
                    study.save(cb);
                } else cb(null);
                */
                next(null, study);
            });
        },

        function(study, next) {
            //then series under it
            findOrCreate_series(study, h, function(err, series) {
                if(err) return next(err);
                next(null, study, series);
            });
        },

        function(study, series, next) {
            //then store the instance
            findOrCreate_acquisition(study, series, h, function(err, aq) {
                if(err) return next(err);
                next(null, study, series, aq); 
            });
        },

        function(study, series, aq, next) {
            //finally store the instance
            findOrCreate_instance(study, series, aq, h, function(err, instance) {
                if(err) return next(err);
                
            });
        },
    ], function(err, result) {
        if(err) logger.error(err); //continue
    }); 

    /*
    //publish to es queue
    cleaned_ex.publish('', h, {}, function(err) {
        if(err) return cb(err);
        
        //also write cleaned data to file (shouldn't be needed, but just in case)
        var cleanpath = config.cleaner.cleaned_headers+"/"+h.qc_iibisid;
        write_to_disk(cleanpath, h, function(err) {
            if(err) return cb(err);

            //then store series under study
            findOrCreate_study(h, function(err, study) {
                if(err) return cb(err);
                
                //add series id to study
                if(study.SeriesInstanceUID.indexOf(h.SeriesInstanceUID) === -1) {
                    study.SeriesInstanceUID.push(h.SeriesInstanceUID);
                    study.save(cb);
                } else cb(null);
            });
        });
    });
    */
}

function write_to_disk(dir, h, cb) {
    fs.exists(dir, function (exists) {
        if(!exists) fs.mkdirSync(dir);
        fs.writeFile(dir+"/"+h.SOPInstanceUID+".json", JSON.stringify(h,null,4), cb);
    });
}

function findOrCreate_study(h, cb) {
    var keys = {
        StudyInstanceUID: h.StudyInstanceUID,
    };
    models.Study.findOne(keys, function(err, study) {
        if(err) return cb(err);
        if(!study) {
            //create new study
            study = new models.Study(keys);

            study.StudyTimestamp = h.qc_StudyTimestamp;
            study.StudyDescription = h.StudyDescription;
            study.StudyID = h.StudyID;
        
            study.IIBISID = h.qc_iibisid;
            study.Modality = h.Modality;
            study.StationName = h.StationName;
            study.Radiopharmaceutical = h.Radiopharmaceutical; //only set for Modality: PT/CT

            study.save(cb);

            logger.info("received a new study");
        } else cb(null, study);
    });
}

function findOrCreate_series(study, h, cb) {
    var keys = {
        SOPInstanceUID: h.SOPInstanceUID,
    };
    models.Instance.findOne(keys, function(err, series) {
        if(err) return cb(err);
        if(!series) {
            //create new study
            series = new models.Series(keys);
            series.study_id = study._id;
            series.SeriesNumber = h.SeriesNumber;
            series.SeriesTimestamp = h.q_SeriesTimestamp;
            series.SeriesDescription = h.SeriesDescription;
            series.save(cb);
        } else cb(null, series);
    });
}

function findOrCreate_acquisition(study, series, h, cb) {
    var keys = {
        series_id: series._id,
        AcquisitionNumber: h.AcquisitionNumber,
    };
    models.Acquisition.findOne(keys, function(err, aq) {
        if(err) return cb(err);
        if(!aq) {
            //create new study
            aq = new models.Acquisition(keys);
            aq.study_id = study._id;
            aq.AcquisitionTimestamp = h.q_AcquisitionTimestamp;
            aq.save(cb);
        } else cb(null, aq);
    });
}
function findOrCreate_instance(study, series, aq, h, cb) {
    var keys = {
        SOPInstanceUID: h.SOPInstanceUID,
    };
    models.Instance.findOne(keys, function(err, instance) {
        if(err) return cb(err);
        if(!instance) {
            //create new study
            instance = new models.Instance(keys);
            instance.study_id = study._id;
            instance.series_id = series._id;
            instance.acquisition_id = aq._id;
            instance.headers = h;
            instance.save(cb);
        } else cb(null, instance);
    });
}


