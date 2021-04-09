#!/usr/bin/node
var mongoose = require('mongoose');
var fs = require('fs');
var config = require('../config');
var db = require('../api/models');
var async = require('async');


db.init(function(err) {
  if(err) throw err; //will crash


  let qc_count = 0
  let no_qc = 0
  db.Series.find({}).exec(function(err,serieses) {
    if (err) console.log(err);


    async.forEach(serieses, function (series, next_series) {
      if (series.qc !== undefined) {
        qc_count += 1;
      } else {
        no_qc += 1;
      }
      next_series()
    }, function (err) {
      console.log("ALL DONE");
      console.log(`QC Done: ${qc_count}, QC_Pending: ${no_qc}`);
    })
  });
});

