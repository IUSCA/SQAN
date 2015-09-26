#!/usr/bin/node

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

//mine
var config = require('../config/config.js');

//start
var ex = null;
var conn = amqp.createConnection(config.amqp);
conn.on('ready', function () {
    console.log("amqp ready");
    conn.exchange(config.incoming.ex, {confirm: true, autoDelete: false, durable: true, type: 'topic'}, function(_ex) {
        ex = _ex;
        conn.queue(config.incoming.q, {autoDelete: false, durable: true}, function (q) {
            q.bind(config.incoming.ex, '#', function() {
                //var lastseq = parseInt(data);
                //var now = new Date();
                //console.log("Process start at "+now.toString()+ " from lastseq:"+lastseq);
                process();
            });
        });
    });
});

function process() {
    console.log("processing "+config.orthanc.url+'/changes?limit=300');
    //console.log("downloading changed since url:"+config.orthanc.url+'/changes?since='+since+'&limit='+limit);
    request({ url: config.orthanc.url+'/changes?limit=300', json: true }, function(error, response, json) {
        if (!error && response.statusCode === 200) {
            if(json.Changes) {
                async.eachSeries(json.Changes, function(change, next) {
                    if(change.ChangeType == 'NewInstance') {
                        process_instance(change, next, ex); 
                    } else {
                        //console.log("ignoring "+change.ChangeType);
                        next();
                    }
                }, function(err) {
                    if(err) throw err;
                    /*
                    var done = json.Done; //true / false
                    var last = json.Last; //Seq id of last change event receieved
                    if(done) {
                        cb();
                    } else {
                        process(last, limit, ex, cb);
                    }
                    */
                    if(json.Done) setTimeout(process, 1000*30);
                    else setTimeout(process, 0);
                });
            }
        } else {
            //failed to load
            console.dir(error);
            console.dir(response);
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
    console.log("loading (seq:"+change.Seq+"):"+tagurl);
    request({ url: tagurl, json: true }, function(err, res, json){
        if(err) {
            console.dir(err);
            next(err);
        } else {
            ex.publish("orthanc", json, {}, function(err) {
                if(err) {
                    console.log("failed to publish json to AMQP");
                    console.dir(jbon);
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


