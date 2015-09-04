#!/usr/bin/node

//transfer messages in failed queue back to incoming

//os
var fs = require('fs');

//contrib
var amqp = require('amqp');
var winston = require('winston');

//mine
var config = require('../config/config');
var logger = new winston.Logger(config.logger.winston);

var conn = amqp.createConnection(config.amqp);
var ex = null;

conn.on('ready', function () {
    logger.info("connected");
    conn.exchange(config.incoming.ex, {confirm: true, autoDelete: false, durable: true, type: 'topic'}, function(_ex) {
        ex = _ex;
        logger.info("got incoming ex");
        conn.queue(config.cleaner.failed_q, {autoDelete: false, durable: true}, function(failed_q) {
            logger.info("subscribing to failed queue");
            failed_q.subscribe({ack: true, prefetchCount: 1}, handle_message);
        });
    });
});

function handle_message(h, msg, info, ack) {
    logger.dir(msg);
    ex.publish("retry", msg, {}, function(err) {
        logger.info(err);
        if(err) throw err;
        logger.info("published");
        ack.acknowledge(); 
    }); 
}
