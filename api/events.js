'use strict';

const amqp = require('amqp');
const winston = require('winston');

//mine
const config = require('../config');
const logger = new winston.Logger(config.logger.winston);

var connected = false;
var series_ex = null;
//var resource_ex = null;
if(config.events) {
    logger.info("attempting to connect to amqp..");
    var conn = amqp.createConnection(config.events.amqp, {reconnectBackoffTime: 1000*10});
    conn.on('ready', function() {
        connected = true;
        logger.info("amqp connection ready.. creating exchanges");

        conn.exchange(config.events.exchange+".series", 
            {autoDelete: false, durable: true, type: 'topic', confirm: true}, function(ex) {
            series_ex = ex;
        });

        /*
        conn.exchange(config.events.exchange+".resource", 
            {autoDelete: false, durable: true, type: 'topic', confirm: true}, function(ex) {
            resource_ex = ex;
        });
        */
    });
    conn.on('error', function(err) {
        logger.error("amqp connection error");
        logger.error(err);
        connected = false;
    });
} else {
    logger.info("events configuration missing - won't publish to amqp");
}

function publish_or_log(ex, key, msg) {
    if(!ex || !connected) {
        //if not connected, output to stdout.. (that will be a lot of logs!)
        //logger.info(key);
        //logger.info(msg);
    } else {
        ex.publish(key, msg, {});
    }
}

exports.series = function(series) {
    var key = series.research_id+"."+series.exam_id+"."+series._id;
    //logger.debug("publishing or loggin: "+key);
    publish_or_log(series_ex, key, {
        //only publish critical stuff
        qc: series.qc,
        qc1_state: series.qc1_state,
        qc2_state: series.qc2_state,
    });
}

/*
exports.create = function(doc) {
    var key = "task.create."+task.instance_id+"."+task._id;
    publish(key, task);
}

exports.remove = function(doc) {
    var key = "task.remove."+task.instance_id+"."+task._id;
    publish(key, task);
}
*/
