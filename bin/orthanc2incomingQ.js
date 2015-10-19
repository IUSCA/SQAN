#!/usr/bin/node
'use strict';

/*
This script exits once it loada all orthanc images (orthan set done=true), so cron has to keep running it over and over
It might be a good idea to let cron restart the script, but to be consistent with other script
I think I should make it run continously
*/

//node
var fs = require('fs');
var request = require("request")

//contrib
var async = require('async');
var amqp = require('amqp');
var winston = require('winston');

//mine
var config = require('../api/config/config.js');
var logger = new winston.Logger(config.logger.winston);

logger.info("orthanc2incomingQ starting");

//start
var ex = null;
var conn = amqp.createConnection(config.amqp);
conn.on('ready', function () {
    conn.exchange(config.incoming.ex, {confirm: true, autoDelete: false, durable: true, type: 'topic'}, function(_ex) {
        ex = _ex;
        conn.queue(config.incoming.q, {autoDelete: false, durable: true}, function (q) {
            q.bind(config.incoming.ex, '#', function() {
                //var lastseq = parseInt(data);
                //var now = new Date();
                process(0);
            });
        });
    });
});

function process(since) {
    logger.info("processing "+'/changes?since='+since+'&limit=1000');
    request({ url: config.orthanc.url+'/changes?since='+since+'&limit=300', json: true }, function(error, response, json) {
        if (!error && response.statusCode === 200) {
            if(json.Changes) {
                async.eachSeries(json.Changes, function(change, next) {
                    if(change.ChangeType == 'NewInstance') {
                        process_instance(change, next, ex); 
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
                    if(json.Done) setTimeout(function() { process(json.Last)}, 1000*30);
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

function process_instance(change, next, ex) {
    /* sample change object
    { ChangeType: 'NewInstance',
      Date: '20150420T172053',
      ID: 'bb1b239d-a80d6649-44ea3fc5-b6527fc1-fe4ce7ed',
      Path: '/instances/bb1b239d-a80d6649-44ea3fc5-b6527fc1-fe4ce7ed',
      ResourceType: 'Instance',
      Seq: 110 }
    */
    var tagurl = config.orthanc.url+change.Path+'/simplified-tags';
    logger.debug("loading (seq:"+change.Seq+"):"+tagurl);
    request({ url: tagurl, json: true }, function(err, res, json){
        if(err) {
            logger.error(err);
            next(err);
        } else {
            ex.publish("orthanc", json, {}, function(err) {
                if(err) {
                    logger.error("failed to publish json to AMQP");
                    logger.error(json);
                    next(err);
                } else {
                    //remove the instance from orthanc
                    request.del(config.orthanc.url+change.Path).on('response', function(res) {
                        next();
                    });
                }
            }); 
        }
    });
}


