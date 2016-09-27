'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');
var jwt = require('express-jwt');
var async = require('async');

//mine
var config = require('../../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');
var qc = require('../qc');
var profile = require('../profile');

//should I store this somewhere common?
function compose_modalityid(research_detail) {
    return research_detail.Modality+"."+research_detail.StationName+"."+research_detail.radio_tracer;
}

/*
function load_related_info(serieses, cb) {

..

            //load comment profile
            var subs = [];
            exams.forEach(function(exam) {
                //if(exam.comments) exam.comments.map(subs.push);
                if(exam.comments) exam.comments.forEach(function(comment) {
                    subs.push(comment.user_id);
                });
            });
            var ps = profile.load_profiles(subs);
            //add profile infor for each comment
            exams.forEach(function(exam) {
                if(exam.comments) exam.comments.forEach(function(comment) {
                    comment._profile = ps[comment.user_id];
                });
            });

        });
    });
}
*/

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
    var org = {};
    //$scope.qcing = false; //will be reset to true if there is any series with no qc

    //just a quick count used commonly in UI
    //$scope.series_count = data.serieses.length;

    //for easy research detail lookup
    var researches = {}; 
    data.researches.forEach(function(research) {
        researches[research._id] = research;
    });
    
    //for easy exam lookup
    var exams = {};
    data.exams.forEach(function(exam) {
        exams[exam._id] = exam;  
    });
    
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
            org[research_detail.IIBISID][modality_id] = modality;
        }
        return modality;
    }

    //organize exams
    data.exams.forEach(function(exam) {
        var modality = get_modality(exam.research_id);
        if(modality.exams[exam.subject] === undefined) modality.exams[exam.subject] = {};
        modality.exams[exam.subject][exam._id] = exam; 
    });

    //organize series
    data.serieses.forEach(function(series) {
        var subject = series.subject;
        var series_desc = series.series_desc;
        var exam_id = series.exam_id;

        var modality = get_modality(series.research_id);

        //initialize datastructure to fill
        if(modality.subjects[subject] == undefined) modality.subjects[subject] = {
            serieses: {},
            missing_serieses: {},
            missing: 0,
        };
        if(modality.subjects[subject].serieses[series_desc] == undefined) 
            modality.subjects[subject].serieses[series_desc] = {exams: {}};
        if(modality.subjects[subject].serieses[series_desc].exams[exam_id] == undefined) 
            modality.subjects[subject].serieses[series_desc].exams[exam_id] = [];
        
        //unshift to put the latest one on the top - since serieses are sorted by studytime/-seriesnumber
        modality.subjects[subject].serieses[series_desc].exams[exam_id].unshift(series); 
        //if(series.qc == undefined) $scope.qcing = true;
        if(series.isexcluded) modality.subjects[subject].serieses[series_desc]._isexcluded = series.isexcluded;
    });

    //organize templates
    data.templates.forEach(function(template) {
        //templates[template._id] = template;

        var time = template.date.toISOString(); //TODO not exactly sure why I need to do this.
        var series_desc = template.series_desc;
        var modality = get_modality(template.research_id);
        if(!~modality.templates_times.indexOf(time)) modality.templates_times.push(time);
        if(modality.templates[series_desc] == undefined) modality.templates[series_desc] = {};
        if(modality.templates[series_desc][time] == undefined) modality.templates[series_desc][time] = [];
        modality.templates[series_desc][time].push(template);
    });
    
    /*
    //for each exam/template, find the min SeriesNumber so that UI can sort by it
    for(var research_id in org) {
        var modalities = org[research_id];
        for(var modality_id in modalities) {
            var modality = modalities[modality_id];

            for(var subject_id in modality.subjects) {
                var subject = modality.subjects[subject_id];
                for(var series_desc in modality.subjects[subject_id].serieses) {
                    var series_groups = modality.subjects[subject_id].serieses[series_desc];
                    var min = null;
                    for(var exam_id in series_groups.exams) {
                        var serieses = series_groups.exams[exam_id];
                        serieses.forEach(function(series) {
                            if(min == null || series.SeriesNumber < min) min = series.SeriesNumber;
                        });
                    }
                    series_groups.min_SeriesNumber = min;
                }
            }

            for(var series_desc in modality.templates) {
                var times = modality.templates[series_desc];
                var min = null;
                for(var time in times) {
                    //TODO this could be a list of serieses in the near future?
                    times[time].forEach(function(template) {
                        if(min == null || template.SeriesNumber < min) min = template.SeriesNumber;
                    });
                }
                times.min_SeriesNumber = min;
            }
        }
    }
    */

    //TODO - I should probably look for missing series when I do qc_series
    //find missing series
    for(var research_id in org) {
        var modalities = org[research_id];
        for(var modality_id in modalities) {
            var modality = modalities[modality_id];
            for(var subject_id in modality.subjects) {
                var subject = modality.subjects[subject_id];

                //contruct unique id to be used by anchor
                subject.uid = research_id+modality_id+subject_id;
                
                ///////////////////////////////////////////////////////////////////////
                //
                // finding missing
                //
                // first.. find latest template timestamp
                var latest = null;
                modality.templates_times.forEach(function(time) {   
                    if(latest == null || latest < time) latest = time;
                });
                // then create list of teamplate_series_desc that all exam should have
                var template_series_descs = {};
                for(var template_series_desc in modality.templates) {
                    var templates = modality.templates[template_series_desc][latest];
                    if(templates) template_series_descs[template_series_desc] = templates;
                }
                // finally find *missing* subject for each exam times (for this subject) using the latest set of template (tmeplate_series_descs)
                for(var exam_id in modality.exams[subject_id]) {
                    var time = modality.exams[subject_id][exam_id].date.toISOString(); //TODO not exactly sure why I need to convert to ISO string
                    subject.missing_serieses[time] = {};
                    for(var template_series_desc in template_series_descs) {
                        var found = false;
                        for(var series_desc in subject.serieses) {
                            if(subject.serieses[series_desc].exams[exam_id] == undefined) continue; //wrong time

                            //truncate number at the end of template name
                            var tdesc = template_series_desc.replace(/\d+$/, '');

                            if(series_desc.startsWith(tdesc)) {
                                found = true;
                                break;
                            }
                        }
                        if(!found) {
                            subject.missing_serieses[time][template_series_desc] = template_series_descs[template_series_desc];
                            subject.missing++;
                            //console.log(subject.uid + " missing "+template_series_desc + " "+subject.missing);
                        }
                    }
                };
                //
                ///////////////////////////////////////////////////////////////////////
            }
        }
    }

    return org;
}


//query against all serieses
router.get('/query', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    //lookup iibisids that user has access to (TODO - refactor this to aclSchema statics?)
    db.Acl.getCan(req.user, 'view', function(err, iibisids) {
        if(err) return next(err);

        //load various raw records
        var serieses = null;
        var researches = null;
        var exams = null;
        var templates = null;
        async.series([
            //first query series
            function(next) {
                //construct query for series record
                var query = db.Series.find().lean();
                query.where('IIBISID').in(iibisids);
                if(req.query.where) {
                    var where = JSON.parse(req.query.where);
                    for(var field in where) {
                        query.where(field, where[field]); //TODO is it safe to pass this from UI?
                    }
                }
                query.sort({StudyTimestamp: -1, SeriesNumber: 1});
                query.limit(req.query.limit || 50); 
                if(req.query.skip) {
                    query.skip(req.query.skip);
                }
                query.exec(function(err, _serieses) {
                    serieses = _serieses;
                    next(err);
                });
            },
        
            //query research records referenced by series
            function(next) {
                var rids = [];
                serieses.forEach(function(series) {
                    rids.push(series.research_id);
                });
                db.Research.find().lean()
                .where('_id')
                .in(rids)
                .exec(function(err, _researches) {
                    researches = _researches;
                    next(err);
                });
            },

            //query exams records referenced by series
            function(next) {
                var eids = [];
                serieses.forEach(function(series) {
                    eids.push(series.exam_id);
                });
                db.Exam.find().lean()
                .where('_id')
                .in(eids)
                .exec(function(err, _exams) {
                    exams = _exams;
                    next(err);
                });
            },

            //query all templates referenced also
            function(next) {
                var rids = [];
                serieses.forEach(function(series) {
                    rids.push(series.research_id);
                });
                db.Template.find().lean()
                .where('research_id')
                .sort({date: -1})
                .in(rids)
                .exec(function(err, _templates) {
                    templates = _templates;
                    next(err);
                });
            }
        ], function(err) {
            if(err) return next(err);
            res.json(reorg({
                serieses: serieses, 
                researches: researches,
                templates: templates,
                exams: exams,
            }));
        });

    });
});

//return all serieses that belongs to a given research_id
//TODO deprecate this in favor of /series/query?
router.get('/byresearchid/:research_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Research.findById(req.params.research_id).exec(function(err, research) {
        if(err) return next(err);
        //make sure user has access to this research/IIBISID
        //console.log(JSON.stringify(research, null, 4));
        db.Acl.can(req.user, 'view', research.IIBISID, function(can) {
            if(err) return next(err);
            db.Series.find({research_id: research._id})
            .sort('series_desc subject SeriesNumber') //mongoose does case-sensitive sorting - maybe I should try sorting it on ui..
            .exec(function(err, _serieses) {
                if(err) return next(err);
                var serieses = JSON.parse(JSON.stringify(_serieses)); //objectify

                //find all exams
                var eids = [];
                _serieses.forEach(function(series) { eids.push(series.exam_id); });
                //then load all exams referenced
                db.Exam.find().lean()
                .where('_id')
                .in(eids)
                .exec(function(err, exams) {
                    if(err) return cb(err);

                    db.Template.find({research_id: research._id})
                    .sort('series_desc SeriesNumber') //mongoose does case-sensitive sorting - maybe I should try sorting it on ui..
                    .exec(function(err, templates) {
                        if(err) return next(err);
                        res.json({
                            exams: exams, 
                            serieses: serieses, 
                            templates: templates, 
                            researches: [research]});
                    });
                });
            });
        });
    });
});

router.get('/id/:series_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    //first load the series
    db.Series.findById(req.params.series_id)
    .exec(function(err, series) {
        if(err) return next(err);
        if(!series) return res.status(404).json({message: "no such series:"+req.params.series_id});

        //make sure user has access to this series
        db.Acl.can(req.user, 'view', series.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to view this IIBISID:"+series.IIBISID});
            db.Acl.can(req.user, 'qc', series.IIBISID, function(canqc) {
                var ret = {
                    canqc: canqc,
                    series: series,
                };

                //load research detail
                db.Research.findById(series.research_id).exec(function(err, research) {
                    if(err) return next(err);
                    ret.research = research;

                    //load all template exams available for this research
                    db.Exam.find({research_id: research._id, istemplate: true}).exec(function(err, exams) {
                        if(err) return next(err);
                        ret.template_exams = exams;

                        //load image details
                        db.Image.find().lean()
                        .where('series_id').equals(series._id)
                        .sort('headers.InstanceNumber')
                        .select({qc: 1, 'headers.InstanceNumber': 1, 'headers.AcquisitionNumber': 1})
                        .exec(function(err, _images) {
                            if(err) return next(err);
                            
                            //don't return the qc.. just return counts of errors / warnings
                            ret.images = [];
                            _images.forEach(function(_image) {
                                var image = { 
                                    _id: _image._id, 
                                    inum: _image.headers.InstanceNumber,
                                    anum: _image.headers.AcquisitionNumber,
                                };
                                if(_image.qc) {
                                    image.errors = 0;
                                    image.warnings = 0;
                                    if(_image.qc.errors) image.errors = _image.qc.errors.length;
                                    if(_image.qc.warnings) image.warnings = _image.qc.warnings.length;
                                    image.notemp = _image.qc.notemp;
                                }
                                ret.images.push(image);
                            });

                            //load template used to QC
                            if(series.qc) {
                                db.Template.findById(series.qc.template_id).exec(function(err, template) {
                                    ret.qc_template = template;
                                    res.json(ret);
                                });
                            } else res.json(ret);
                        }); 
                    });
                });
            });
        });
    });
});

router.post('/comment/:series_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Series.findById(req.params.series_id).exec(function(err, series) {
        if(err) return next(err);
        if(!series) return res.status(404).json({message: "can't find specified series"});
        //make sure user has access to this series
        db.Acl.can(req.user, 'view', series.IIBISID, function(can) {
        //db.Acl.canAccessIIBISID(req.user, series.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to view this IIBISID:"+series.IIBISID});
            if(!series.comments) series.comments = [];
            var comment = {
                user_id: req.user.sub,
                comment: req.body.comment, //TODO - validate?
                date: new Date(), //should be set by default, but UI needs this right away
            };
            series.comments.push(comment);
            series.save(function(err) {
                if(err) return(err);
                res.json(comment);
            });
        });
    });
});

router.post('/qcstate/:series_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Series.findById(req.params.series_id).exec(function(err, series) {
        if(err) return next(err);
        if(!series) return res.status(404).json({message: "can't find specified series"});
        //make sure user has access to this series
        db.Acl.can(req.user, 'qc', series.IIBISID, function(can) {
        //db.Acl.canAccessIIBISID(req.user, series.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC this IIBISID:"+series.IIBISID});
            var event = {
                user_id: req.user.sub,
                title: "Updated QC "+req.body.level+" state to "+req.body.state,
                date: new Date(), //should be set by default, but UI needs this right away
                detail: req.body.comment,
            };
            series.events.push(event);
            if(req.body.level == "1") series.qc1_state = req.body.state; 
            if(req.body.level == "2") series.qc2_state = req.body.state; 
            series.save(function(err) {
                if(err) return(err);
                res.json({message: "State updated to "+req.body.state, event: event});
            });
        });
    });
});

//change template and invalidate QC
//TODO I haven't implemented unsetting of template yet..
router.post('/template/:series_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Series.findById(req.params.series_id).exec(function(err, series) {
        if(err) return next(err);
        if(!series) return res.status(404).json({message: "can't find specified series"});
        //make sure user has access to this series
        db.Acl.can(req.user, 'qc', series.IIBISID, function(can) {
        //db.Acl.canAccessIIBISID(req.user, series.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC this IIBISID:"+series.IIBISID});
            //make sure template_id belongs to this series (don't let user pick someone else's template)
            db.Exam.findById(req.body.exam_id).exec(function(err, exam) {
                if(err) return next(err);
                if(!exam.research_id.equals(series.research_id)) return next("invalid template_id");
                series.template_exam_id = exam._id;
                series.qc = undefined; //invalidate series qc
                var event = {
                    user_id: req.user.sub,
                    title: "Template override",
                    date: new Date(), //should be set by default, but UI needs this right away
                    detail: "Re-QCing with template: "+exam.date.toString(),
                };
                series.events.push(event);
                series.save(function(err) {
                    if(err) return(err);
                    //invalidate image QC.
                    db.Image.update({series_id: series._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
                        if(err) return next(err);
                        console.dir(affected);
                        res.json({message: "Template updated. Re-running QC on "+affected.nModified+" images."});
                    });
                });
            });
        });
    });
});

router.post('/reqc/:series_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Series.findById(req.params.series_id, function(err, series) {
        if(err) return next(err);
        if(!series) return res.status(404).json({message: "can't find specified series"});
        //make sure user has access to this research
        db.Acl.can(req.user, 'qc', series.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC IIBISID:"+series.IIBISID});
            series.qc = undefined;
            series.save(function(err) {
                if(err) next(err);
                //also invalidate image QC.
                db.Image.update({series_id: series._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
                    if(err) return next(err);
                    res.json({message: "Re-running QC on "+affected.nModified+" images."});
                });
            });
        });
    });
});

router.post('/reqcbyexamid/:exam_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Exam.findById(req.params.exam_id, function(err, exam) {
        if(err) return next(err);
        if(!exam) return res.status(404).json({message: "can't find specified exam"});
        //make sure user has access to this research
        db.Acl.can(req.user, 'qc', exam.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC IIBISID:"+exam.IIBISID});
            //find all serieses user specified
            db.Series.find({exam_id: req.params.exam_id}).exec(function(err, serieses) {
                if(err) return next(err);
                var total_modified = 0;
                async.forEach(serieses, function(series, next_series) {
                    //do unset
                    series.qc = undefined;
                    series.save(function(err) {
                        if(err) next(err);
                        //also invalidate image QC.
                        db.Image.update({series_id: series._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
                            if(err) return next(err);
                            total_modified += affected.nModified;
                            next_series();
                        });
                    });
                }, function(err) {
                    res.json({message: "Re-running QC on "+total_modified+" images."});
                });
            });
        });
    });
});

module.exports = router;

