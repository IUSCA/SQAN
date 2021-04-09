#!/usr/bin/node
var mongoose = require('mongoose');
var fs = require('fs');
var config = require('../config');
var db = require('../api/models');
var async = require('async');


db.init(function(err) {
  if(err) throw err; //will crash


  db.Exam.find({}).exec(function(err,exams){
      if(err) console.log(err);


      async.forEach(exams, function (exam, next_exam) {


        let query = {
          exam_id: exam._id
        };


        db.Series.find(query).exec(function(err, serieses) {

          async.each(serieses, function (series, cb) {

            db.Image.update({series_id: series._id}, {$unset: {qc: 1}}, {multi: true}, function (err, affected) {
              if (err) return next(err);

              let update = {
                qc1_state: "re-qcing",
                $unset: {qc: 1}
              };


              db.Series.update({_id: series._id}, update, function (err) {
                if (err) next(err);
                cb()
              });

            })
          }, function (err) {
            if (err) return next_exam(err);
            next_exam();
          })
        });
      }, function (err) {
        console.log("ALL DONE");
      })
    })
});

