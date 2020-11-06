#!/usr/bin/node
var mongoose = require('mongoose');
var fs = require('fs');
var config = require('../config');
var db = require('../api/models');
var async = require('async');


db.init(function(err) {
  if(err) throw err; //will crash

  let needs_templates = new Set();
  let has_templates = new Set();

  db.Exam
    .find({
      'qc.series_no_template': { $exists: true, $not: {$size: 0} },
      'qc.series_failed': 0,
      'qc.series_passed': 0,
      istemplate: false
    })
    .populate('research_id')
    .exec(function(err,exams){
      if(err) console.log(err);
      console.log(`Found ${exams.length} with no_template errors`);

      async.each(exams, function(exam, cb_e){
        // console.log("Working on exam "+ exam.subject);
        if(exam.qc.all_series !== exam.qc.series_no_template.length) {
          // console.log(`Some series had QC done, bad template, not missing`)
          return cb_e();
        }


        // console.log("Looking for templates for exam " + exam.subject);
        db.Exam.find({'research_id': exam.research_id._id, istemplate: true}, function(err, _templates) {
          if (err) cb_e(err);
          if (!_templates.length) {
            needs_templates.add(exam.research_id.IIBISID);
            return cb_e();
          }

          has_templates.add(exam.research_id.IIBISID);

          // console.log(`Found ${_templates.length} templates for exam ${exam.subject}, resetting QC`);
          db.Series.find({exam_id: exam._id}).exec(function (err, _series) {

            async.each(_series, function (series, cb_s) {
              // console.log("Working on series "+ series.series_desc);
              // return cb_s()
              db.Image.update({series_id: series._id}, {$unset: {qc: 1}}, {multi: true}, function (err, affected) {

                if (err) return cb_s(err);

                db.Series.update({_id: series._id}, {qc1_state: "re-qcing", $unset: {qc: 1}}, function (err) {
                  if (err) cb_s(err);
                  cb_s()
                });

              });
            }, function (err) {
              if (err) console.log(err)
              cb_e();
            })
          })
        });

      }, function(err) {
        if (err) console.log(err)
        console.log("All done!");
        needs_templates.forEach(nt => {
          console.log(`${nt} still needs a template`)
        });

        has_templates.forEach(ht => {
          console.log(`${ht} now has templates`)
        })

        db.disconnect();
        return;
      });
  })
})
