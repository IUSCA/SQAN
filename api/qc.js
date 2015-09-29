#!/usr/bin/node
'use strict';

var server = require('./server');
server.start(function(err) {
    if(err) throw err;
    console.log("application started");
});

