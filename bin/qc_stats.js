#!/usr/bin/node
var mongoose = require('mongoose');
var fs = require('fs');
var config = require('../config');
var db = require('../api/models');
var async = require('async');


db.init(function(err) {
  if(err) throw err; //will crash


  let passed = 0
  let failed = 0
  let total_images = 0
  let total_errors = 0

  db.Series.find({}).exec(function(err,serieses) {
    if (err) console.log(err);


    async.forEach(serieses, function (series, next_series) {
      if (series.qc !== undefined) {
        if (series.qc1_state === 'autopass') {
          passed += 1
        } else {
          failed += 1
        }

        total_images += series.qc.series_image_count;
        total_errors += series.qc.errored_images;

      }
      next_series()
    }, function (err) {
      console.log("ALL DONE");
      console.log(`Series Passed: ${passed * 100.0 / (passed + failed)}%`);
      console.log(`Error Rate: ${total_errors * 1.0 / total_images} per image`);
    })
  });
});

