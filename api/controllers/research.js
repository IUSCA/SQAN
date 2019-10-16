'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');
var jwt = require('express-jwt');
var async = require('async');
var mongoose = require('mongoose');


//mine
var config = require('../../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');
var qc = require('../qc');

//get all researches that user can view
router.get('/', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    var query = db.Research.find();
    query.sort('-IIBISID');
    query.exec(function(err, rs) {
        if(err) return next(err);
        //if admin parameter is set and if user is admin, return all (used to list all iibisid on admin page)
        if(req.query.admin && ~req.user.roles.indexOf('admin')) {
            return res.json(rs);
        }
        db.Acl.getCan(req.user, 'view', function(err, iibisids) {
            //only show iibisids that user has access to
            var researches = [];
            rs.forEach(function(r) {
                if(~iibisids.indexOf(r.IIBISID)) researches.push(r);
            });
            res.json(researches);
        });
    });
});

router.get('/summary/:id', function(req, res, next) {
    var subjects = [];
    var exams = {};
    var series_desc = [];
    db.Exam.find({'research_id': req.params.id, 'istemplate' : false}).sort({ StudyTimestamp:-1 }).exec(function(err, _exams){
        if(err) return next(err);
        //console.log(_exams);

        async.each(_exams, function(exam, callback) {
            subjects.indexOf(exam.subject) === -1 && subjects.push(exam.subject);
            db.Series.find({exam_id: exam._id}).populate('exam_id').sort({ SeriesNumber:1 }).exec(function(err, _series){
                var exam_series = {};
                _series.forEach(function(ser){
                    series_desc.indexOf(ser.series_desc) === -1 && series_desc.push(ser.series_desc);
                    exam_series[ser.series_desc] = ser;
                });
                exams[exam.subject] === undefined ? exams[exam.subject] = [exam_series] : exams[exam.subject].push(exam_series);
                callback();
            });
        }, function(err) {
            if(err) return next(err);
            res.json({series_desc: series_desc, subjects: subjects, exams: exams});
        });


    });


});

//rerun QC1 on the entire "research"
router.post('/reqcall/:research_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {

    console.log("ReQC-All research id "+req.params.research_id)
    db.Research.findById(req.params.research_id)
    .exec(function(err, research) {
        if(err) return next(err);
        if(!research) return res.status(404).json({message: "can't find specified research"});
        //make sure user has access to this research
        db.Acl.can(req.user, 'qc', research.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC IIBISID:"+research.IIBISID});

            db.Exam.find({research_id:research._id})  //new mongoose.Types.ObjectId(req.params.research_id))
            .exec(function(err, exams) {
                if(err) return next(err);
                if(!exams) return res.status(404).json({message: "can't find specified exams"});

                async.forEach(exams,function(exam,next_exam){

                    //find all serieses user specified
                    db.Series.find({exam_id: exam._id}).exec(function(err, serieses) {
                        if(err) return next_exam(err);
                        serieses.forEach(function(series) {
                            db.Image.update({series_id: series._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
                                if(err) return next_exam(err);
                                //events.series(series);
                                // add event to each series
                                var detail = {
                                    qc1_state:series.qc1_state,
                                    date_qced:  series.qc ? series.qc.date : undefined,
                                    template_id: series.qc ? series.qc.template_id : undefined,
                                }
                                var event = {
                                    user_id: req.user.sub,
                                    title: "Research-level ReQC all",
                                    date: new Date(), //should be set by default, but UI needs this right away
                                    detail: detail,
                                };
                                db.Series.update({_id: series._id}, {$push: { events: event }, qc1_state:"re-qcing", $unset: {qc: 1}}, function(err){
                                    if(err) return next_exam(err);
                                });
                            });
                        });
                        next_exam()
                    });

                }, function(err) {
                    res.json({message: "Re-running QC on "+exams.length+ " exams"});
                })
            });

        });
    })

});

//rerun QC1 on the entire "research"
router.post('/reqcfailed/:research_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {

    console.log("ReQC-failed research id "+req.params.research_id)
    db.Research.findById(req.params.research_id)
    .exec(function(err, research) {
        if(err) return next(err);
        if(!research) return res.status(404).json({message: "can't find specified research"});
        //make sure user has access to this research
        db.Acl.can(req.user, 'qc', research.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC IIBISID:"+research.IIBISID});

            db.Exam.find({research_id:research._id})  //new mongoose.Types.ObjectId(req.params.research_id))
            .exec(function(err, exams) {
                if(err) return next(err);
                if(!exams) return res.status(404).json({message: "can't find specified exams"});

                var qced_series = 0;
                async.forEach(exams,function(exam,next_exam){

                    //find all serieses user specified
                    db.Series.find({exam_id: exam._id, qc1_state:{$ne:"autopass"}}).exec(function(err, serieses) {
                        if(err) return next_exam(err);
                        qced_series = qced_series+serieses.length;
                        serieses.forEach(function(series) {
                            db.Image.update({series_id: series._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
                                if(err) return next_exam(err);
                                //events.series(series);
                                // add event to each series
                                var detail = {
                                    qc1_state:series.qc1_state,
                                    date_qced: series.qc ? series.qc.date : undefined,
                                    template_id: series.qc ? series.qc.template_id : undefined,
                                }
                                var event = {
                                    user_id: req.user.sub,
                                    title: "Research-level ReQC failures",
                                    date: new Date(), //should be set by default, but UI needs this right away
                                    detail: detail,
                                };
                                db.Series.update({_id: series._id}, {$push: { events: event }, qc1_state:"re-qcing", $unset: {qc: 1}}, function(err){
                                    if(err) return next_exam(err);
                                });
                            });
                        });
                        next_exam()
                    });

                }, function(err) {
                    res.json({message: "Re-running QC on "+qced_series+ " series with QC1 state failed"});
                })
            });

        });
    })

});


//get research detail, exams and series for a given research
router.get('/:id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {

    db.Research.findById(req.params.id).lean().exec(function(err, research) {

        //make sure user has access to this IIBISID
        db.Acl.can(req.user, 'view', research.IIBISID, function(can) {
            //db.Acl.canAccessIIBISID(req.user, image.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to access IIBISID: "+research.IIBISID});
            //get all exams in this research

            research['exams'] = {};
            research['templates'] = {};
            //console.log(research);
            async.series([

                //get subject exams
                function(next) {
                    var query = db.Exam.find().lean()
                    query.where('research_id', research._id);
                    query.where('istemplate', false);
                    query.sort({StudyTimestamp: -1});

                    query.exec(function(err, _exams) {
                        if(err) return next(err);
                        async.each(_exams, function(exam, callback) {
                            //console.log("looking up exam "+exam._id);
                            var query = db.Series.find().lean();
                            query.where('exam_id', exam._id);
                            query.sort({SeriesNumber: 1});
                            query.exec(function(err, exam_series) {
                                if(err) return next(err);
                                exam['series'] = exam_series;
                                callback();
                            });
                        }, function(err) {
                            //console.log('done getting series');
                            if(err) return next(err);
                            research.exams = _exams;
                            next();
                        });
                    });
                },

                //get template exams
                function(next) {
                    var query = db.Exam.find().lean()
                    query.where('research_id', research._id);
                    query.where('istemplate', true);
                    query.sort({StudyTimestamp: -1});

                    query.exec(function(err, _exams) {
                        if(err) return next(err);
                        async.each(_exams, function(exam, callback) {
                            var query = db.Template.find().lean();
                            query.where('exam_id', exam._id);
                            query.sort({SeriesNumber: 1});
                            query.exec(function(err, exam_series) {
                                if(err) return next(err);
                                exam['series'] = exam_series;
                                callback();
                            });
                        }, function(err) {
                            if(err) return next(err);
                            research.templates = _exams;
                            next();
                        });
                    });
                }
            ], function(err) {
                if(err) return next(err);
                res.json(research);
            });

        });
    });
});


router.post('/report/:iibis', function(req, res, next) {
    let iibis = req.params.iibis;

    let keywords = req.body.keywords;
    console.log(keywords);
    let output = {};
    db.Research.find({IIBISID: iibis}, function(err, _researches){
        async.each(_researches, function(_research, cb_r) {
            let res_id = `${iibis}_${_research.Modality}_${_research.StationName}`;
            if(_research.radio_tracer) res_id += `_${_research.radio_tracer}`;
            output[res_id] = {
                summary: [],
                subjects: []
            }
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
                                if(!(sd in sub_exam.series)) {
                                    sub_exam.series[sd] = {
                                        scan_count: 0,
                                        img_count: 0
                                    };

                                    keywords.forEach(function(key) {
                                        sub_exam.series[sd][key] = '';
                                    })
                                };

                                db.Image.count({series_id: _series._id}, function(err, _c) {
                                    if(err) return cb_s(err);
                                    keywords.forEach(function(key) {
                                        if(sub_exam.series[sd][key] !== '') sub_exam.series[sd][key] += ' | ';
                                        sub_exam.series[sd][key] += h[key];
                                    })
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
                    output[res_id] = {
                        summary: e_rows,
                        subjects: subjects,
                        series: series,
                        keywords: keywords
                    }
                    // let csv = parse(e_rows, {});
                    // fs.writeFile(`${iibis}_${_research.StationName}.csv`, csv);
                    //
                    // let s_rows = [];
                    // let h_row = "Subject,StudyTimestamp,";
                    // let h2_row = ",,"
                    // series.forEach((s) => {
                    //     h_row += `${s},,,`;
                    //     h2_row += 'scan_count, img_count, p_CoilString,';
                    // });
                    // s_rows.push(h_row);
                    // s_rows.push(h2_row);
                    //
                    // Object.keys(subjects).forEach((sub) => {
                    //     const sub_exams = subjects[sub];
                    //     sub_exams.forEach( se => {
                    //         const row = [];
                    //         row.push(sub);
                    //         row.push(se.StudyTimestamp)
                    //         series.forEach((s) => {
                    //             if(s in se.series) {
                    //                 row.push(se.series[s].scan_count);
                    //                 row.push(se.series[s].img_count);
                    //                 row.push(`"${se.series[s].p_CoilString}"`);
                    //             } else {
                    //                 row.push('');
                    //                 row.push('');
                    //                 row.push('');
                    //             }
                    //         });
                    //         s_rows.push(row.join());
                    //     })
                    // })
                    //
                    // fs.writeFileSync(`${iibis}_${_research.StationName}_series.csv`, s_rows.join(os.EOL));
                    // fs.writeFile(`${iibis}_${_research.StationName}_series.json`, JSON.stringify(subjects, null, 4));
                    return cb_r()
                })
            })
        }, function(err) {
            if(err) next(err)
            res.json(output);
        })
    });

});


module.exports = router;
