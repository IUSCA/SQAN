#!/usr/bin/node
var mongoose = require('mongoose');
var fs = require('fs');
var config = require('../config');
var db = require('../api/models');


db.init(function(err) {
    if(err) throw err; //will crash

    // db.Image.distinct('series_id', function(err, series){
    //     if (err) console.log(err);
    //     series.forEach(function(_series) {
    //         db.Series.findById(_series, function(err, __series){
    //             if(err) console.log(err);
    //             if(!__series){
    //                 console.log("Found orphaned images with series_id "+_series);
    //             }
    //             db.Exam.findById(__series.exam_id, function(err, _exam){
    //                 if(!_exam) {
    //                     console.log("Series is orphaned!  "+__series.series_desc);
    //                     console.log("Deleting associated images");
    //                     db.Series.remove({_id: _series}, function(err, res) {
    //                         db.Image.deleteMany({series_id: _series}, function(err){
    //                             console.log("Deleted series and images for series "+__series);
    //                         });
    //                     });
    //                 }
    //             })
    //         })
    //     });
    // })

    db.TemplateHeader.distinct('template_id', function(err, series){
        if (err) console.log(err);
        series.forEach(function(_series) {
            db.Template.findById(_series, function(err, __series){
                if(err) console.log(err);
                if(!__series){
                    console.log("Found orphaned template headers with template_id "+_series);
                    db.TemplateHeader.deleteMany({template_id: _series}, function(err){
                        console.log("Deleted orpahned headers for template "+__series);
                    });
                } else {
                    db.Exam.findById(__series.exam_id, function (err, _exam) {
                        if (!_exam) {
                            console.log("Template is orphaned!  " + __series.series_desc);
                            console.log("Deleting associated images");
                            db.Template.remove({_id: _series}, function (err, res) {
                                db.TemplateHeader.deleteMany({template_id: _series}, function (err) {
                                    console.log("Deleted templates and headers for template " + __series);
                                });
                            });
                        }
                    })
                }
            })
        });
    })

})
