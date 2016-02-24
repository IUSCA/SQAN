'use strict';

//contrib
var winston = require('winston');
var amqp = require('amqp');
var async = require('async');

//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../api/models');
var qc = require('../api/qc');

logger.info("connecting to db");
db.init(function(err) {
    if(err) throw(err);

    logger.info("querying recent studies");
    var query = db.Series.find().lean();
    query.sort({StudyTimestamp: -1, SeriesNumber: 1});
    query.limit(50);//limitter..
    query.exec(function(err, studies) {
        if(err) throw(err);
        
        //if it excluded?
        studies.forEach(function(study) {
            study._excluded = qc.series.isExcluded(study.Modality, study.series_desc)
        });

        load_researches(studies, function(err, researches) {
            if(err) throw(err);

            //add research info to each studies
            studies.forEach(function(study) {
                researches.forEach(function(r) {
                    //console.log(r._id+" v.s. "+study.research_id);
                    //logger.debug(r._id.toString()); 
                    //logger.debug(study._id);
                    if(r._id.toString() == study.research_id) {
                        study.research = r;
                    }
                });
            });

            logger.info("loaded "+studies.length+" studies");

            db.disconnect(function() {
                send_studies(studies);
            });
            //console.log(JSON.stringify(studies, null, 4));
        });
    });
});

//load all researches referenced by studies
function load_researches(studies, cb) {
    var rids = [];
    studies.forEach(function(study) {
        rids.push(study.research_id);
    });
    db.Research.find().lean()
    .where('_id')
    .in(rids)
    .exec(function(err, researches) {
        if(err) return cb(err);
        cb(null, researches);
    });
}

function send_studies(studies) {
    logger.info("sending studies to amqp");
    var conn = amqp.createConnection(config.notification.amqp);
    conn.on('ready', function() {
        logger.info("amqp connection ready");
        conn.exchange(config.notification.ex, {autoDelete: false, durable: true, type: 'topic', confirm: true}, function(ex) {
            //console.log('Exchange ' + ex.name + ' is open');
            async.eachSeries(studies, function(study, next) {
                var key = "dicom.qc_study."+study.IIBISID;
                logger.info("publishing to "+ex.name+"/"+key);
                logger.info(study);
                //TODO routing key is pretty much in TBD state
                ex.publish(key, study, {}, next);
            }, function(err) {
                if(err) throw err; //or should I continue with other studies.. or even retry?
                conn.disconnect();
                logger.info("all done");
            });
        });
    });
    conn.on('error', function(err) {
        throw err;
    });
}

