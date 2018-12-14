#!/usr/bin/node
'use strict';

const _ = require('underscore'); 
var async = require('async');

//const config = require('../../config');
const db = require('../models');
const events = require('../events');

//connect to db and start processing batch indefinitely
db.init(function(err) {
    if(err) throw err;
});



function qc_exam(exam_id,cb) {

    console.log("function qc_exam -- exam_id "+exam_id)
   
    var exam = {};
    var template_series = [];
    var exam_series = [];
    // create qc object for exam 
    var qc = {
        qced_series:0,
        all_series: 0,
        template_series: 0, 
        series_passed: 0,
        series_failed: 0,
        series_missing: [],
        series_no_template: [],
        image_count:0,
        images_errored: 0,
        images_clean:0,
        images_no_template:0,
        fields_errored:0                
    } 

    async.series([   
             

        function(next){

            console.log("function 1")        
        
            db.Exam.findById(exam_id, function(err,_exam) {
                if (err) return next(err);
                exam = _exam;   
                next();                            
            });

        },
            
        function(next) { 
            
            console.log("function 2")
            // find the most recent template for this research 
            db.Exam.find({"research_id":exam.research_id, "istemplate":true})
            .sort({"StudyTimestamp":-1})  
            .exec(function(err,texams) {
                if (err) return next(err);
                console.log(texams.length + " template exams retrieved for research_id "+exam.research_id);
                if (!texams || texams.length == 0) {
                    console.log("couldn't find template for research_id:"+exam.research_id);
                    return next();
                } else {
                    var texam = texams[0]; // select the template exams with most recent timestamp

                    db.Template.find().lean()  // find all template series for this exam
                    .where('exam_id',texam._id)
                    .select({'_id': 1, 'series_desc': 1})
                    .exec(function(err, _templates) {
                        if(err) return next(err); 
        
                        qc.template_series = _templates.length;
        
                        // create array with all template series descriptions (for this template exam)                
                        _templates.forEach(function(t){
                            if (template_series.indexOf(t.series_desc) == -1) 
                                template_series.push(t.series_desc);
                        });
        
                        next();
                    })
                }                                      
            })            

        },

        function(next) { 

            console.log("function 3")
            // create array with all qc-ed series (for this exam)
            db.Series.find({'exam_id': exam._id}).lean()
            .exec(function(err, _series) {                    
                if(err) return next(err); 

                qc.all_series = _series.length;
                                
                _series.forEach(function(s){
                    if (exam_series.indexOf(s.series_desc) == -1) {
                        exam_series.push(s.series_desc);
                    }
                    if (s.qc1_state == "no template") {
                        qc.series_no_template.push(s.series_desc);
                    }
                    if (typeof s.qc === 'object' && s.qc !== null) {
                        
                        if (s.qc1_state == "fail") {
                            qc.series_failed++;
                        }
                        if (s.qc1_state == "autopass") {
                            qc.series_passed++;
                        }
                                        
                        qc.qced_series++; 

                        // count images
                        qc.image_count += s.qc.series_image_count;
                        qc.images_errored += s.qc.errored_images;
                        qc.images_clean += s.qc.clean;
                        qc.images_no_template += s.qc.notemps;

                        qc.fields_errored += s.qc.series_fields_errored;

                    }
                });

                next(); 

            }); 
        },

        function(next){

            console.log("function 4")
            if (template_series.length == 0) {
                console.log("function 4 -- there are no templates for this exam")
                return next() // if there are no templates
            }
            // check if any template series are missing in this exam
            template_series.forEach(function(t){
                if (exam_series.indexOf(t) == -1){
                    qc.series_missing.push(t);
                }
            })            
            
            next(); 
        },

        
        function(next){
            
            console.log("function 5")
            // if nothing changed since last exam qc
            if(typeof exam.qc === 'object' && exam.qc !== null) {
                if(_.isEqual(exam.qc,qc)) {
                    console.log("no changes since last exam qc for exam "+exam._id);
                    console.log(exam.qc);
                    return next();
                }
            } 

            console.log("updating exam qc for exam "+exam._id);                
            //exam.qc = qc;
            console.log(qc);
            db.Exam.findOneAndUpdate({_id: exam._id},{qc:qc},function(err) {
                if (err) return next(err);
                return next();
            })  

        }

    ], function(err) {
        if(err) {
            console.log(err);
            cb(err);
        } 
        cb();
    });
}




exports.qc_exam = qc_exam;
