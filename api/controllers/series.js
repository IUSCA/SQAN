'use strict';

//contrib
const express = require('express');
const router = express.Router();
const winston = require('winston');
const jwt = require('express-jwt');
const async = require('async');

//mine
const config = require('../../config');
const logger = new winston.Logger(config.logger.winston);
const db = require('../models');
const qc = require('../qc');
const profile = require('../profile');
const events = require('../events');

//should I store this somewhere common?
function compose_modalityid(research_detail) {
    return research_detail.Modality+"."+research_detail.StationName+"."+research_detail.radio_tracer;
}


//organize flat data received from server into hierarchical data structure
//  org: {
//      "<IIBISID>": {
//          "<modality_id>": {
//              _detail: <ressearch_detail>,
//              exams: { //exams for subjects only..
//                  "<subject>": {
//                      <exam_id>: <exam>
//                  }
//              }
//              subjects: {
//                  "<subject>": {
//                      serieses: {
//                          <series_desc>: { //here is the sticky part... I am organizing exams under each series_desc!
//                              exams: {
//                                  <exam_id>: [ <series> ]
//                              }
//                          }
//                      },
//                      missing_serieses: {},
//                      missing: 0, //counter.. should I move the counting logic from recent to here?
//                  }
//              },
//              templates_times: [template_date1, template_date2, template_date3 ],
//              templates: {
//                  <series_desc>: {
//                      <time>: [ template1, template2 ]
//                  }
//              }
//          }
//      }        
//  }

function reorg(data) {
    console.log("----------------beginning of reorg ----------------")

    var org = {};

    var researches = {}; 
    researches[data.research._id] = data.research;

    function get_modality(research_id) {
        var research_detail = researches[research_id];
        if(org[research_detail.IIBISID] == undefined) org[research_detail.IIBISID] = {};
        var modality_id = compose_modalityid(research_detail);
        var modality = org[research_detail.IIBISID][modality_id];
        if(modality === undefined) {
            modality = {
                _detail: research_detail,
                exams: {},
                subjects: {}, 
                templates_times: [], //array - because not grouped by subjects like subjects_times
                templates: {},
            };
            modality._detail.modality_id = modality_id; //to help UI
            org[research_detail.IIBISID][modality_id] = modality;
        }
        return modality;
    }
    


    //organize exams
    data.subject_exams.forEach(function(exam) {

        var modality = get_modality(exam.research_id);

        if(modality.exams[exam.subject] === undefined) modality.exams[exam.subject] = {};
        modality.exams[exam.subject][exam._id] = exam; 

        //organize series
        data.serieses.forEach(function(series) {

            if (new String(series.exam_id).valueOf() == new String(exam._id).valueOf()){
            //if (series.exam_id == exam._id) {

                console.log('INSIDE THE SERIES LOOP -- series.exam_id: '+series.exam_id+ ' exam._id ' + exam._id);

                var subject = exam.subject;
                var series_desc = series.series_desc;
                var exam_id = series.exam_id;
                
                var mod = get_modality(exam.research_id);
    
                //initialize datastructure to fill
                if(mod.subjects[subject] == undefined) mod.subjects[subject] = {
                    serieses: {},
                    all_serieses: {},
                    missing_serieses: {},
                    missing: 0,
                };
                if(mod.subjects[subject].serieses[series_desc] == undefined)
                mod.subjects[subject].serieses[series_desc] = {exams: {}};
                if(mod.subjects[subject].serieses[series_desc].exams[exam_id] == undefined)
                mod.subjects[subject].serieses[series_desc].exams[exam_id] = [];
    
                //unshift to put the latest one on the top - since serieses are sorted by studytime/-seriesnumber
                mod.subjects[subject].serieses[series_desc].exams[exam_id].unshift(series);
                //if(series.qc == undefined) $scope.qcing = true;
                if(series.isexcluded) mod.subjects[subject].serieses[series_desc]._isexcluded = series.isexcluded;

                //console.log(mod.subject[subject])
            }            
        });
    });


    //organize templates
    data.template_exams.forEach(function(texam) {                  

        data.templates.forEach(function(template) {
            if (new String(template.exam_id).valueOf() == new String(texam._id).valueOf()) {
                
                var modality = get_modality(texam.research_id);
                var time = texam.StudyTimestamp.toISOString(); //TODO not exactly sure why I need to do this.
                var series_desc = template.series_desc;
                if(!~modality.templates_times.indexOf(time)) modality.templates_times.push(time);
                if(modality.templates[series_desc] == undefined) modality.templates[series_desc] = {};
                if(modality.templates[series_desc][time] == undefined) modality.templates[series_desc][time] = [];
                modality.templates[series_desc][time].push(template);
            }
        });
    });



    console.log(org);
    return org;
}

//query against all serieses
router.get('/query', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    //lookup iibisids that user has access to (TODO - refactor this to aclSchema statics?)
    
    var where = JSON.parse(req.query.where);
    console.log(where);
    var r_id = where.research_id;
    console.log(r_id);
    var timerange = where.StudyTimestamp ? where.StudyTimestamp : null;

    profile.isUserAllowed(req.user,'view', r_id, function(err, isallowed) {
        if (err) return res.status(404).json({message:"there was an error during authorization - please contact SCA team"})
        if(!isallowed) return res.status(401).json({message: "you are not authorized to view this study"});               
        
        //load various raw records
        var serieses = null;
        //var all_serieses = null;
        var research = null;
        var subject_exams = null;
        var template_exams = null;
        var eids = [];
        var teids = [];
        var templates = null;

        async.series([

            //query exams records for the selected research
            function(next) {
                var query = db.Exam.find().lean()
                query.where('research_id', r_id);
                query.where('istemplate', false);
                query.sort({StudyTimestamp: -1});

                query.exec(function(err, _exams) {
                    subject_exams = _exams;
                    _exams.forEach(function(subject_exams) {
                        eids.push(subject_exams._id);
                    });
                    next(err);
                });
            },

            //now query serie documents that belong to the exams in the selected research
            function(next) {                

                var query = db.Series.find().lean();
                query.where('exam_id').in(eids);
                query.sort({SeriesNumber: 1});
                query.exec(function(err, _serieses) {
                    serieses = _serieses;
                    next(err);
                });
            },
        
            //retrieve the research document 
            function(next) {
                //var where = JSON.parse(req.query.where);
                //var r_id = where.research_id;
                db.Research.findById(r_id).lean()
                .exec(function(err, _research) {
                    research = _research;
                    next(err);
                });
            },

            //query all exams for the templates in this research
            function(next) {

                var query = db.Exam.find().lean()
                query.where('research_id',r_id);
                query.where('istemplate', true);
                query.sort({StudyTimestamp: -1});

                query.exec(function(err, _texams) {  
                    template_exams = _texams;                  
                    template_exams.forEach(function(te) {
                        teids.push(te._id);
                    });
                    next(err);
                });
            },

            //now query template documents that belong to the exams in the selected research
            function(next) {                

                var query = db.Template.find().lean();
                query.where('exam_id').in(teids);
                query.sort({SeriesNumber: 1});
                query.exec(function(err, _templates) {
                    templates = _templates;
                    next(err);
                });
            },

        ], function(err) {
            if(err) return next(err);
            //res.json(exams)
            res.json(reorg({
                serieses: serieses,
                //all_serieses: all_serieses,
                research: research,
                templates: templates,
                subject_exams: subject_exams,
                template_exams: template_exams,
            }));
        });

    });
});



router.get('/id/:series_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    //first load the series
    db.Series.findById(req.params.series_id)
    .populate({
        path: 'exam_id',
        populate: {
            path: 'research_id'
        }
    })
    .exec(function (err, series) {
        if (err) return next(err);
        if (!series) return res.status(404).json({message: "no such series:" + req.params.series_id});
        db.Acl.can(req.user, 'view', series.exam_id.research_id.IIBISID, function (can) {
            if (!can) return res.status(401).json({message: "you are not authorized to access this IIBISID:" + series.exam_id.research_id.IIBISID});

            var ret = {
                canqc: false,
                series: series
            }

            db.Acl.can(req.user, 'qc', series.exam_id.research_id.IIBISID, function (can) {
                if (can) ret.canqc = true;

                db.Exam.find({
                    research_id: series.exam_id.research_id._id,
                    istemplate: true
                }).exec(function (err, t_exams) {
                    if (err) return next(err);
                    var t_ids = t_exams.map(function(doc) { return doc._id; });
                    db.Template.find({
                        exam_id: {$in : t_ids},
                        series_desc: series.series_desc
                    }).populate('exam_id').exec(function (err, templates) {
                        ret.templates = templates;
                        db.Image.find().lean()
                            .where('series_id').equals(series._id)
                            .sort('headers.InstanceNumber')
                            .select({qc: 1, 'headers.InstanceNumber': 1})//, 'headers.AcquisitionNumber': 1})
                            .exec(function (err, _images) {
                                if (err) return next(err)
                                ret.images = _images;
                                res.json(ret);
                            })
                    })
                })
            })
        })
    })
});


router.post('/comment/:series_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Series.findById(req.params.series_id)
        .populate({
            path: 'exam_id',
            populate: {
                path: 'research_id'
            }
        })
        .exec(function(err, series) {
        if(err) return next(err);
        if(!series) return res.status(404).json({message: "can't find specified series"});
        //make sure user has access to this series
        db.Acl.can(req.user, 'view', series.exam_id.research_id.IIBISID, function(can) {            
            if(!can) return res.status(401).json({message: "you are not authorized to view this IIBISID:"+series.exam_id.research_id.IIBISID});
            if(!series.comments) series.comments = [];
            var comment = {
                user_id: req.user.sub,
                comment: req.body.comment, //TODO - validate?
                date: new Date(), //should be set by default, but UI needs this right away
            };
            db.Series.update({_id: series._id}, {$push: { comments: comment }}, function(err){
                if(err) return(err);
                res.json(comment); 
            });
        });
    });
});

router.post('/qcstate/:series_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Series.findById(req.params.series_id)
        .populate({
            path: 'exam_id',
            populate: {
                path: 'research_id'
            }
        })
        .exec(function(err, series) {
        if(err) return next(err);
        if(!series) return res.status(404).json({message: "can't find specified series"});
        //make sure user has access to this series
        db.Acl.can(req.user, 'qc', series.exam_id.research_id.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC this IIBISID:"+series.exam_id.research_id.IIBISID});

            var detail = {
                qc1_state:series.qc1_state,
                date_qced: series.qc ? series.qc.date : undefined,
                template_id: series.qc ? series.qc.template_id : undefined,
                comment:req.body.comment,
            }

            var event = {
                user_id: req.user.sub,
                title: "Updated QC"+req.body.level+" state to "+req.body.state,
                date: new Date(), //should be set by default, but UI needs this right away
                detail: detail,
            };

            if(req.body.level == "1") {
                db.Series.update({_id: series._id}, {$push: { events: event }, qc1_state:req.body.state}, function(err){
                    if(err) next(err);
                    res.json({message: "State updated to "+req.body.state, event: event});
                });
            } //series.qc1_state = req.body.state; 
            if(req.body.level == "2") {
                db.Series.update({_id: series._id}, {$push: { events: event }, qc2_state:req.body.state}, function(err){
                    if(err) next(err);
                    res.json({message: "State updated to "+req.body.state, event: event});
                });
            }
        });
    });
});
 

router.post('/template/:series_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    console.log("INSIDE API/SERIES/ change template")
    db.Series.findById(req.params.series_id)
        .populate({
            path: 'exam_id',
            populate: {
                path: 'research_id'
            }
        })
        .exec(function(err, series) {
        if(err) return next(err);
        if(!series) return res.status(404).json({message: "can't find specified series"});
        //make sure user has access to this series
        db.Acl.can(req.user, 'qc', series.exam_id.research_id.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC this IIBISID:"+series.exam_id.research_id.IIBISID});

            db.Template.findById(req.body.template_id).exec(function(err, template) {
                if(err) return next(err);
                if(!template) return res.status(404).json({message: "can't find specified template"});

                db.Exam.findById(template.exam_id)
                .populate('research_id')
                .exec(function(err,texam){
                    if(err) return next(err);
                    console.log(texam);
                    // make sure this template and subject series belong to the same research
                    if(!series.exam_id.research_id.equals(texam.research_id)) return next("invalid template_id");

                    var override_template_id = template._id;

                    var detail = {
                        qc1_state:series.qc1_state,
                        date_qced: series.qc ? series.qc.date : undefined,
                        template_id: series.qc ? series.qc.template_id : undefined,
                        comment:"Re-QCing with template: "+texam.StudyTimestamp.toString()+" and Series Number "+template.SeriesNumber,
                    }
    
                    var event = {
                        user_id: req.user.sub,
                        title: "Template override",
                        date: new Date(), //should be set by default, but UI needs this right away
                        detail:detail,
                    };

                    db.Image.update({series_id: series._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
                        if(err) return next(err);
                        db.Series.update({_id: series._id}, {$push: { events: event }, qc1_state:"re-qcing", override_template_id:override_template_id, $unset: {qc: 1}}, function(err){
                            if(err) next(err);
                            res.json({message: "Template updated. Re-running QC on "+affected.nModified+" images from series "+series.series_desc, event:event});
                        });
                    });

                })

            });
        });
    });
});

router.post('/reqc/:series_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Series.findById(req.params.series_id)
        .populate({
            path: 'exam_id',
            populate: {
                path: 'research_id'
            }
        })
        .exec(function(err, series) {
        if(err) return next(err + " THIS IS THE ERROR");
        if(!series) return res.status(404).json({message: "can't find specified series"});
        var detail = {
            qc1_state:series.qc1_state,
            date_qced: series.qc ? series.qc.date : undefined,
            template_id: series.qc ? series.qc.template_id : undefined,
        }
        var event = {
            user_id: req.user.sub,
            title: "Series-level ReQC",
            date: new Date(), //should be set by default, but UI needs this right away
            detail: detail,
        };       
        //make sure user has access to this research 
        db.Acl.can(req.user, 'qc', series.exam_id.research_id.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC IIBISID:"+series.exam_id.research_id.IIBISID});
            //events.series(series);
            console.log(event);
            //also invalidate image QC.
            db.Image.update({series_id: series._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
                if(err) return next(err);
                db.Series.update({_id: series._id}, {$push: { events: event }, qc1_state:"re-qcing", $unset: {qc: 1}}, function(err){
                    if(err) next(err);
                    res.json({message: "Re-running QC on "+affected.nModified+" images from series "+series.series_desc, event:event});
                });
            });
        });
    });
});

router.post('/reqcallseries/:exam_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    console.log("Exam-level ReQC all");
    db.Exam.findById(req.params.exam_id)
        .populate('research_id')
        .exec(function(err, exam) {
        if(err) return next(err);
        if(!exam) return res.status(404).json({message: "can't find specified exam"});
        //make sure user has access to this research
        db.Acl.can(req.user, 'qc', exam.research_id.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC IIBISID:"+exam.research_id.IIBISID});
            //find all serieses user specified
            db.Series.find({exam_id: req.params.exam_id}).exec(function(err, serieses) {
                if(err) return next(err);
                var total_modified = 0;
                async.forEach(serieses, function(series, next_series) {
                    db.Image.update({series_id: series._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
                        if(err) return next(err);

                        total_modified += affected.nModified;
                        //events.series(series);
                        // add event to each series
                        var detail = {
                            qc1_state:series.qc1_state,
                            date_qced: series.qc ? series.qc.date : undefined,
                            template_id: series.qc ? series.qc.template_id : undefined,
                        }
                        var event = {
                            user_id: req.user.sub,
                            title: "Exam-level ReQC all",
                            date: new Date(), //should be set by default, but UI needs this right away
                            detail: detail,
                        }; 
                        db.Series.update({_id: series._id}, {$push: { events: event }, qc1_state:"re-qcing", $unset: {qc: 1}}, function(err){
                            if(err) next(err);
                            next_series();
                        });
                    });
                }, function(err) {
                    res.json({message: "Re-running QC on "+serieses.length+ " series and "  +total_modified+" images "});
                });
            });
        });
    });
});

router.post('/reqcerroredseries/:exam_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    console.log("Exam-level ReQC errored series");
    db.Exam.findById(req.params.exam_id)
        .populate('research_id')
        .exec(function(err, exam) {
        if(err) return next(err);
        if(!exam) return res.status(404).json({message: "can't find specified exam"});
        //make sure user has access to this research
        db.Acl.can(req.user, 'qc', exam.research_id.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC IIBISID:"+exam.research_id.IIBISID});
            //find all serieses user specified
            db.Series.find({exam_id: req.params.exam_id,qc1_state:{$ne:"autopass"}}).exec(function(err, serieses) {
                if(err) return next(err);
                var total_modified = 0;
                async.forEach(serieses, function(series, next_series) {
                    db.Image.update({series_id: series._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
                        if(err) return next(err);

                        total_modified += affected.nModified;
                        //events.series(series);
                        // add event to each series
                        var detail = {
                            qc1_state:series.qc1_state,
                            date_qced: series.qc ? series.qc.date : undefined,
                            template_id: series.qc ? series.qc.template_id : undefined,
                        }
                        var event = {
                            user_id: req.user.sub,
                            title: "Exam-level ReQC failures",
                            date: new Date(), //should be set by default, but UI needs this right away
                            detail: detail,
                        }; 
                        db.Series.update({_id: series._id}, {$push: { events: event }, qc1_state:"re-qcing", $unset: {qc: 1}}, function(err){
                            if(err) next(err);
                            next_series();
                        });
                    });
                }, function(err) {
                    res.json({message: "Re-running QC on "+serieses.length+ " errored series and "  +total_modified+" images "});
                });
            });
        });
    });
});

module.exports = router;

