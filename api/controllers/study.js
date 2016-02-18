'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');
var jwt = require('express-jwt');

//mine
var config = require('../../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');
var qc = require('../qc');

function load_related_info(studies, cb) {
    //pull unique serieses and see if it's excluded or not
    //load all researches referenced by studies
    var rids = [];
    studies.forEach(function(study) {
        rids.push(study.research_id);
    });
    db.Research.find().lean()
    .where('_id')
    .in(rids)
    .exec(function(err, researches) {
        if(err) return cb(err);

        //load all templates referenced also
        db.Template.find().lean()
        .where('research_id')
        .sort({date: -1})
        .in(rids)
        .exec(function(err, templates) {
            if(err) return cb(err);
            cb(null, {
                studies: studies,
                researches: researches,
                templates: templates,
            });
        });
    });
}

//query against all studies
router.get('/query', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    //lookup iibisids that user has access to (TODO - refactor this to aclSchema statics?)
    db.Acl.getCan(req.user, 'view', function(err, iibisids) {
        if(err) return next(err);
        var query = db.Study.find().lean();

        query.where('IIBISID').in(iibisids);
        if(req.query.where) {
            var where = JSON.parse(req.query.where);
            for(var field in where) {
                //console.log(field);
                //console.dir(where[field]);
                query.where(field, where[field]); //TODO is it safe to pass this from UI?
            }
        }

        query.sort({StudyTimestamp: -1, SeriesNumber: 1});
        query.limit(req.query.limit || 50); 

        if(req.query.skip) {
            query.skip(req.query.skip);
        }
        query.exec(function(err, studies) {
            if(err) return next(err);

            studies.forEach(function(study) {
                study._excluded = qc.series.isExcluded(study.Modality, study.series_desc)
            });

            load_related_info(studies, function(err, details){
                if(err) return next(err);
                res.json(details); 
            });
        });
    });
});

//return all studies that belongs to a given research_id
router.get('/byresearchid/:research_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Research.findById(req.params.research_id).exec(function(err, research) {
        if(err) return next(err);
        //make sure user has access to this research/IIBISID
        db.Acl.can(req.user, 'view', research.IIBISID, function(can) {
            if(err) return next(err);
            db.Study.find({research_id: research._id})
            .sort('series_desc subject SeriesNumber') //mongoose does case-sensitive sorting - maybe I should try sorting it on ui..
            .exec(function(err, _studies) {
                if(err) return next(err);
                var studies = JSON.parse(JSON.stringify(_studies)); //objectify
                /* not used yet
                studies.forEach(function(study) {
                    study._excluded = qc.series.isExcluded(study.Modality, study.series_desc)
                });
                */
                /*
                load_related_info(studies, function(err, details){
                    if(err) return next(err);
                    res.json(details); 
                });
                */
                db.Template.find({research_id: research._id})
                .sort('series_desc SeriesNumber') //mongoose does case-sensitive sorting - maybe I should try sorting it on ui..
                .exec(function(err, templates) {
                    if(err) return next(err);
                    /* not used yet
                    var templates = JSON.parse(JSON.stringify(_studies)); //objectify
                    studies.forEach(function(study) {
                        study._excluded = qc.series.isExcluded(study.Modality, study.series_desc)
                    });
                    */
                    res.json({studies:studies, templates: templates}); 
                    /*
                    load_related_info(studies, function(err, details){
                        if(err) return next(err);
                        res.json(details); 
                    });
                    */
                });
            });
        });
    });
});

router.get('/id/:study_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Study.findById(req.params.study_id).exec(function(err, study) {
        if(err) return next(err);

        //make sure user has access to this study
        db.Acl.can(req.user, 'view', study.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to view this IIBISID:"+study.IIBISID});
            db.Acl.can(req.user, 'qc', study.IIBISID, function(canqc) {
                var ret = {canqc: canqc};
                ret.study = study;
                db.Research.findById(study.research_id).exec(function(err, research) {
                    if(err) return next(err);
                    ret.research = research;

                    //load all templates available for this research
                    db.Template.find({research_id: research._id}).exec(function(err, templates) {
                        if(err) return next(err);
                        ret.templates = templates;

                        db.Image.find().lean()
                        .where('study_id').equals(study._id)
                        .sort('headers.InstanceNumber')
                        .select({qc: 1, 'headers.InstanceNumber': 1, 'headers.AcquisitionNumber': 1})
                        .exec(function(err, _images) {
                            if(err) return next(err);
                            //don't return the qc.. just return counts of errors / warnings
                            ret.images = [];
                            _images.forEach(function(_image) {
                                //count number of errors / warnings
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
                            res.json(ret);
                        }); 
                    });
                });
            });
        });
    });
});

/*
//invalidate qc on all images for this study
router.put('/qc/invalidate/:study_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    //TODO - I am not sure how to do access control this yet..
    //for now limit to admin
    if(!~req.user.scopes.dicom.indexOf('admin')) return res.status(401).end();

    var study_id = req.params.study_id;
    db.Image.update({study_id: study_id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
        if(err) return next(err);
        res.json({status: "ok", affected: affected});
    });
});
*/

router.post('/comment/:study_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Study.findById(req.params.study_id).exec(function(err, study) {
        if(err) return next(err);
        //make sure user has access to this study
        db.Acl.can(req.user, 'view', study.IIBISID, function(can) {
        //db.Acl.canAccessIIBISID(req.user, study.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to view this IIBISID:"+study.IIBISID});
            if(!study.comments) study.comments = [];
            var comment = {
                user_id: req.user.sub,
                comment: req.body.comment, //TODO - validate?
                date: new Date(), //should be set by default, but UI needs this right away
            };
            study.comments.push(comment);
            study.save(function(err) {
                if(err) return(err);
                res.json(comment);
            });
        });
    });
});

router.post('/qcstate/:study_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Study.findById(req.params.study_id).exec(function(err, study) {
        if(err) return next(err);
        //make sure user has access to this study
        db.Acl.can(req.user, 'qc', study.IIBISID, function(can) {
        //db.Acl.canAccessIIBISID(req.user, study.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC this IIBISID:"+study.IIBISID});
            var event = {
                user_id: req.user.sub,
                title: "Updated QC "+req.body.level+" state to "+req.body.state,
                date: new Date(), //should be set by default, but UI needs this right away
                detail: req.body.comment,
            };
            study.events.push(event);
            if(req.body.level == "1") study.qc1_state = req.body.state; 
            if(req.body.level == "2") study.qc2_state = req.body.state; 
            study.save(function(err) {
                if(err) return(err);
                res.json({message: "State updated to "+req.body.state, event: event});
            });
        });
    });
});

//change template and invalidate QC
//TODO I haven't implemented unsetting of template yet..
router.post('/template/:study_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Study.findById(req.params.study_id).exec(function(err, study) {
        if(err) return next(err);
        //make sure user has access to this study
        db.Acl.can(req.user, 'qc', study.IIBISID, function(can) {
        //db.Acl.canAccessIIBISID(req.user, study.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC this IIBISID:"+study.IIBISID});
            //make sure template_id belongs to this study (don't let user pick someone else's template)
            db.Template.findById(req.body.template_id).exec(function(err, template) {
                if(err) return next(err);
                if(!template.research_id.equals(study.research_id)) return next("invalid template_id");
                study.template_id = template._id;
                study.qc = undefined; //invalidate study qc
                study.save(function(err) {
                //db.Study.update({_id: study._id}, {$unset: {qc: 1}}, function(err) {
                    if(err) return(err);
                    //invalidate image QC.
                    db.Image.update({study_id: study._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
                        if(err) return next(err);
                        console.dir(affected);
                        res.json({message: "Template updated. Re-running QC on "+affected.nModified+" images."});
                    });
                });
            });
        });
    });
});

router.post('/reqc/bystudyid/:study_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Study.findById(req.params.study_id).exec(function(err, study) {
        if(err) return next(err);
        //make sure user has access to this study
        db.Acl.can(req.user, 'qc', study.IIBISID, function(can) {
        //db.Acl.canAccessIIBISID(req.user, study.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC this IIBISID:"+study.IIBISID});
            study.qc = undefined; //invalidate study qc
            study.save(function(err) {
                if(err) return next(err);
                //invalidate image QC.
                db.Image.update({study_id: study._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
                    if(err) return next(err);
                    console.dir(affected);
                    res.json({message: "Re-running QC on "+affected.nModified+" images."});
                });
            });
        });
    });
});

//rerun QC1 on the entire "research"
router.post('/reqc/byresearchid/:research_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Research.findById(req.params.research_id).exec(function(err, research) {
        if(err) return next(err);
        //make sure user has access to this research
        db.Acl.can(req.user, 'qc', research.IIBISID, function(can) {
        //db.Acl.canAccessIIBISID(req.user, research.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to QC this IIBISID:"+research.IIBISID});
            //invalidate study QC (although not exactly necessary..)
            db.Study.update({research_id: research._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected) {
                if(err) return next(err);
                //invalidate image QC.
                db.Image.update({research_id: research._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
                    if(err) return next(err);
                    console.dir(affected);
                    res.json({message: "Template updated. Re-running QC on "+affected.nModified+" images."});
                });
            });
        });
    });
});
module.exports = router;

