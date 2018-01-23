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
var qc_template = require('../api/qc/template');

//connect to db and start processing batch indefinitely
db.init(function(err) {
    if(err) throw err;
    var common_handlers = [];
    var mr_handlers = [];
    var ct_handlers = [];
    var pt_handlers = [];
    for (var k in qc_template.cc) {
        if(qc_template.cc[k] !== 'skip') {
            common_handlers.push({key: k, type: 'IGNORE'});
        }
    };

    for (var k in qc_template.c.MR) {
        if(qc_template.cc[k] === undefined){
            mr_handlers.push({key: k, type: 'IGNORE'});
        }
    };

    for (var k in qc_template.c.CT) {
        if(qc_template.cc[k] === undefined){
            ct_handlers.push({key: k, type: 'IGNORE'});
        }
    };

    for (var k in qc_template.c.PT) {
        if(qc_template.cc[k] === undefined){
            pt_handlers.push({key: k, type: 'IGNORE'});
        }
    };

    console.log(common_handlers);

    db.Handler.findOneAndUpdate({
        scope: 'Common',
        modality: null,
        series: null,
        notes: []
    }, {
        handlers: common_handlers
    }, {upsert:true, 'new': true}, function(err, _handler) {
        if(err) return err;
        handler = _handler;
        console.log(handler);
    });

    db.Handler.findOneAndUpdate({
        scope: 'Common',
        modality: 'MR',
        series: null,
        notes: []
    }, {
        handlers: mr_handlers
    }, {upsert:true, 'new': true}, function(err, _handler) {
        if(err) return err;
        handler = _handler;
        console.log(handler);
    });

    db.Handler.findOneAndUpdate({
        scope: 'Common',
        modality: 'CT',
        series: null,
        notes: []
    }, {
        handlers: ct_handlers
    }, {upsert:true, 'new': true}, function(err, _handler) {
        if(err) return err;
        handler = _handler;
        console.log(handler);
    });

    db.Handler.findOneAndUpdate({
        scope: 'Common',
        modality: 'PT',
        series: null,
        notes: []
    }, {
        handlers: pt_handlers
    }, {upsert:true, 'new': true}, function(err, _handler) {
        if(err) return err;
        handler = _handler;
        console.log(handler);
    });
});
