#!/usr/bin/node

//transfer messages in failed queue back to incoming

//os
var fs = require('fs');

//contrib
var amqp = require('amqp');
var winston = require('winston');

//mine
var config = require('../api/config');
var logger = new winston.Logger(config.logger.winston);

var ex = null;
var conn = amqp.createConnection(config.amqp);
conn.on('ready', function () {
    logger.info("connected to amqp");
    conn.exchange(config.incoming.ex, {confirm: true, autoDelete: false, durable: true, type: 'topic'}, function(_ex) {
        ex = _ex;
        logger.info("got incoming ex:"+config.incoming.ex);
        conn.queue(config.cleaner.failed_q, {autoDelete: false, durable: true}, function(failed_q) {
            logger.info("subscribing to failed queue:"+config.cleaner.failed_q);
            failed_q.subscribe({ack: true, prefetchCount: 1}, handle_message);
        });
    });
});

function handle_message(h, msg_h, info, ack) {
    //always warp with try/catch for amqp handler (amqp eats exception!)
    try {
        //var h = JSON.parse(h.data); //WHY do I have do this here - but not cleanAndStore?

        //increament number of times this images is sent back to incoming queue
        if(!h.qc_failed2incoming) h.qc_failed2incoming=1;
        else h.qc_failed2incoming++;

        console.dir(h);

        ex.publish("retry", h, {}, function(err) {
            if(err) {
                logger.error(err);
            } else {
                logger.info("published");
                setTimeout(ack.acknowledge, 100); //give a bit of delay to prevent busy looping of bad images
            }
        }); 
    } catch(e) {
        logger.error(e);
    }
}
