#!/usr/bin/node
var mongoose = require('mongoose');
var config = require('../config');
var db = require('../api/models');
var async = require('async');
var fs = require('fs');
const os = require('os');
const { parse } = require('json2csv');

var iibis = process.argv.slice(2).toString();

db.init(function(err) {
    if(err) throw err; //will crash

    let output = [];
    db.Research.find({IIBISID: iibis}, function(err, _researches){
        async.each(_researches, function(_research, cb_r) {
            db.Exam.find({research_id: _research._id}, function(err, _exams) {
                if(err) return cb_r(err);
                let e_rows = [];
                let subjects = {};
                let series = [];
                async.each(_exams, function(_exam, cb_e) {
                    if(!(_exam.subject in subjects)) subjects[_exam.subject] = [];
                    let e_row = {
                        iibis: iibis,
                        StationName: _research.StationName,
                        subject: _exam.subject,
                        StudyTimestamp: _exam.StudyTimestamp,
                        ManufacturerModelName: '',
                        SoftwareVersions: ''
                    }

                    let sub_exam = {
                        StudyTimestamp: _exam.StudyTimestamp,
                        series: {}
                    }
                    db.Series.find({exam_id: _exam._id}, function(err, _serieses) {
                        if(err) return cb_e(err);
                        if(!_serieses) return cb_e();
                        if(!_serieses.length) return cb_e();
                        db.Image.findById(_serieses[0].primary_image).exec(function(err, _image) {
                            if(err) return cb_e(err);
                            let h = _image.headers
                            e_row.ManufacturerModelName = h.ManufacturerModelName;
                            e_row.SoftwareVersions = h.SoftwareVersions;
                            e_rows.push(e_row);
                        })
                        async.each(_serieses, function(_series, cb_s) {
                            db.Image.findById(_series.primary_image).exec(function(err, _image) {
                                let h = _image.headers
                                let sd = _series.series_desc;
                                // let sub = subjects[_exam.subject];

                                if(series.indexOf(sd) < 0) series.push(sd);
                                if(!(sd in sub_exam.series)) sub_exam.series[sd] = {
                                    p_CoilString: '',
                                    scan_count: 0,
                                    img_count: 0
                                }
                                db.Image.count({series_id: _series._id}, function(err, _c) {
                                    if(err) return cb_s(err);
                                    if(sub_exam.series[sd].p_CoilString !== '') sub_exam.series[sd].p_CoilString += ' | ';
                                    sub_exam.series[sd].p_CoilString += h.p_CoilString;
                                    sub_exam.series[sd].scan_count += 1;
                                    sub_exam.series[sd].img_count = Math.max(_c, sub_exam.series[sd].img_count);
                                    return cb_s()
                                })
                            })
                        }, function(err) {
                            if(err) return cb_e(err);
                            subjects[_exam.subject].push(sub_exam);
                            return cb_e();
                        });

                    })
                }, function(err) {
                    if(err) return cb_r(err);
                    let csv = parse(e_rows, {});
                    fs.writeFile(`${iibis}_${_research.StationName}.csv`, csv);

                    let s_rows = [];
                    let h_row = "Subject,StudyTimestamp,";
                    let h2_row = ",,"
                    series.forEach((s) => {
                        h_row += `${s},,,`;
                        h2_row += 'scan_count, img_count, p_CoilString,';
                    });
                    s_rows.push(h_row);
                    s_rows.push(h2_row);

                    Object.keys(subjects).forEach((sub) => {
                        const sub_exams = subjects[sub];
                        sub_exams.forEach( se => {
                            const row = [];
                            row.push(sub);
                            row.push(se.StudyTimestamp)
                            series.forEach((s) => {
                                if(s in se.series) {
                                    row.push(se.series[s].scan_count);
                                    row.push(se.series[s].img_count);
                                    row.push(`"${se.series[s].p_CoilString}"`);
                                } else {
                                    row.push('');
                                    row.push('');
                                    row.push('');
                                }
                            });
                            s_rows.push(row.join());
                        })
                    })

                    fs.writeFileSync(`${iibis}_${_research.StationName}_series.csv`, s_rows.join(os.EOL));
                    // fs.writeFile(`${iibis}_${_research.StationName}_series.json`, JSON.stringify(subjects, null, 4));
                    return cb_r()
                })
            })
        }, function(err) {
            if(err) console.log(err);
            console.log("all done");
        })
    });
});
