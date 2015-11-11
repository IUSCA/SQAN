#!/usr/bin/node

//post headers to amqp

//os
var fs = require('fs');

//contrib
var amqp = require('amqp');
var concat = require('concat-stream');
var split = require('split');
var throttle = require('stream-throttle');

//mine
var config = require('../api/config');

var conn = amqp.createConnection(config.amqp);

conn.on('ready', function () {
    conn.exchange(config.incoming.ex, {autoDelete: false, durable: true, type: 'topic'}, function(ex) {
        process.stdin.pipe(new throttle.Throttle({rate: 40000})).pipe(split('\n')).on('data', function(filename) {
            if(!filename) {
                return conn.disconnect();
            }
            console.log(filename);
            var json = fs.readFileSync(filename, {encoding: 'utf8'});

            //post it!
            var msg = JSON.parse(json.toString());
            
            //unless I use type:'direct', confirm:'true' and publish it with deliveryMode:2, 
            //I don't get callback called
            console.dir(msg);
            ex.publish("reindex", msg); 
        });
    });
});

conn.on('error', function(err) {
    console.error(err);
    process.exit(1);
});

