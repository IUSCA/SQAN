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
    
    
    // //for easy exam lookup
    // var exams = {};
    // data.subject_exams.forEach(function(exam) {
    //     exams[exam._id] = exam;  
    // });

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


    // //TODO - I should probably look for missing series when I do qc_series
    // //find missing series
    // for(var research_id in org) {
    //     var modalities = org[research_id];
    //     for(var modality_id in modalities) {
    //         var modality = modalities[modality_id];
    //         for(var subject_id in modality.subjects) {
    //             var subject = modality.subjects[subject_id];

    //             //contruct unique id to be used by anchor
    //             subject.uid = research_id+modality_id+subject_id;
                
    //             ///////////////////////////////////////////////////////////////////////
    //             //
    //             // finding missing
    //             //
    //             // first.. find latest template timestamp
    //             var latest = null;
    //             modality.templates_times.forEach(function(time) {   
    //                 if(latest == null || latest < time) latest = time;
    //             });
    //             // then create list of teamplate_series_desc that all exam should have
    //             var template_series_descs = {};
    //             for(var template_series_desc in modality.templates) {
    //                 var templates = modality.templates[template_series_desc][latest];
    //                 if(templates) template_series_descs[template_series_desc] = templates;
    //             }
    //             // finally find *missing* subject for each exam times (for this subject) using the latest set of template (tmeplate_series_descs)
    //             for(var exam_id in modality.exams[subject_id]) {
    //                 var time = modality.exams[subject_id][exam_id].StudyTimestamp.toISOString(); //TODO not exactly sure why I need to convert to ISO string
    //                 subject.missing_serieses[time] = {};
    //                 for(var template_series_desc in template_series_descs) {
    //                     var found = false;
    //                     for(var series_desc in subject.all_serieses) {
    //                         if(subject.all_serieses[series_desc].exams[exam_id] == undefined) continue; //wrong time

    //                         //truncate number at the end of template name
    //                         var tdesc = template_series_desc.replace(/\d+$/, '');

    //                         if(series_desc.startsWith(tdesc)) {
    //                             found = true;
    //                             break;
    //                         }
    //                     }
    //                     if(!found) {
    //                         subject.missing_serieses[time][template_series_desc] = template_series_descs[template_series_desc];
    //                         subject.missing++;
    //                         //console.log(subject.uid + " missing "+template_series_desc + " "+subject.missing);
    //                     }
    //                 }
    //             };
    //             //
    //             ///////////////////////////////////////////////////////////////////////
    //         }
    //     }
    // }

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
        console.log('isAllowed '+isallowed)
        if (err) return res.status(404).json({message:"there was an error during authorization - please contact SCA team"})
        if(!isallowed) return res.status(401).json({message: "you are not authorized to view this study"});               

        console.log('inside series controller in api!!')
        
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
                    console.log(subject_exams);
                    console.log(eids);
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
                    console.log(serieses);
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
                    console.log(research);
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
                    console.log(template_exams);
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
                    console.log(templates);
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

/*
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
*/

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
        
//         //make sure user has access to this series
//         db.Exam.findOne().lean()
//         .where('_id').equals(series.exam_id)
//         .select({_id: 1,'research_id':1})
//         .exec(function(err, exam) {
//             if(err) return next(err);
//             console.log(exam);
//             //load research detail
//             db.Research.findById(exam.research_id).exec(function(err, research) {
//                 if(err) return next(err);
//
//
//                 //db.Acl.can(req.user, 'view', research.IIBISID, function(can) {
//                     //console.log("user can view: " +can)
//                     //if(!can) return res.status(401).json({message: "you are not authorized to view this research: "+research.IIBISID});
//                     //db.Acl.can(req.user, 'qc', research.IIBISID, function(canqc) {
//                         //console.log("user can qc: "+ canqc);
//                         var ret = {
//                             canqc: true, //canqc,
//                             series: series,
//                             research: research,
//                         };
//                         //load all template exams available for this research
//                         db.Exam.find({research_id: research._id, istemplate: true}).exec(function(err, exams) {
//                             if(err) return next(err);
//                             ret.template_exams = exams;
//
//                             //load image details
//                             db.Image.find().lean()
//                             .where('series_id').equals(series._id)
//                             .sort('headers.InstanceNumber')
//                             .select({qc: 1, 'headers.InstanceNumber': 1})//, 'headers.AcquisitionNumber': 1})
//                             .exec(function(err, _images) {
//                                 if(err) return next(err);
//
//                                 //don't return the qc.. just return counts of errors / warnings
//                                 ret.images = [];
//                                 _images.forEach(function(_image) {
//                                     var image = {
//                                         _id: _image._id,
//                                         inum: _image.headers.InstanceNumber,
//                                         //anum: _image.headers.AcquisitionNumber,
//                                     };
//                                     if(_image.qc) {
//                                         image.errors = 0;
//                                         image.warnings = 0;
//                                         if(_image.qc.errors) image.errors = _image.qc.errors.length;
//                                         if(_image.qc.warnings) image.warnings = _image.qc.warnings.length;
//                                         image.notemp = _image.qc.notemp;
//                                     }
//                                     ret.images.push(image);
//                                 });
//
//                                 //load template used to QC
//                                 if(series.qc) {
//                                     db.Template.findById(series.qc.template_id).exec(function(err, template) {
//                                         ret.qc_template = template;
//                                         console.log(ret);
//                                         res.json(ret);
//                                     });
//                                 } else {
//                                     console.log(ret);
//                                     res.json(ret);
//                                 }
//                             });
//                         });
//                     //});
//                 //});
//             });
//         })
//
//     });
// });

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
        //db.Acl.canAccessIIBISID(req.user, series.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to view this IIBISID:"+series.exam_id.research_id.IIBISID});
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
        //db.Acl.canAccessIIBISID(req.user, series.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC this IIBISID:"+series.exam_id.research_id.IIBISID});
            var event = {
                user_id: req.user.sub,
                title: "Updated QC "+req.body.level+" state to "+req.body.state,
                date: new Date(), //should be set by default, but UI needs this right away
                detail: req.body.comment,
            };
            series.events.push(event);
            if(req.body.level == "1") series.qc1_state = req.body.state; 
            if(req.body.level == "2") series.qc2_state = req.body.state; 
            events.series(series);
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
        //db.Acl.canAccessIIBISID(req.user, series.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC this IIBISID:"+series.exam_id.research_id.IIBISID});
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
                events.series(series);
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
        //make sure user has access to this research
        var event = {
            user_id: req.user.sub,
            title: "Series-level ReQC",
            date: new Date(), //should be set by default, but UI needs this right away
            detail: "",
        };
        db.Acl.can(req.user, 'qc', series.exam_id.research_id.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC IIBISID:"+series.exam_id.research_id.IIBISID});
            series.qc = undefined;
            series.events.push(event);
            events.series(series);
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
                    //do unset
                    series.qc = undefined;
                    events.series(series);
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

