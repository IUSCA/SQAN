'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');
var jwt = require('express-jwt');
const async = require('async');



//mine
var config = require('../../config');
const qc_funcs = require('../qc');
var db = require('../models');
var mongoose = require('mongoose');



router.get('/istemplate', jwt({secret: config.express.jwt.pub}),function(req,res,next) {
    db.Exam.aggregate([
        {$match: {
            istemplate:true
            }
         },{$group: {
             _id:"$research_id",
             StudyTimestamp: {$addToSet:"$StudyTimestamp"},
             exam_id: {$addToSet:"$_id"},
             }
         },{$lookup: {
                 from:"researches",
                 localField:"_id",
                 foreignField:"_id",
                 as:"fromResearch"
                 }
         },{ $project: {
                 StudyTimestamp: 1,
                 exam_id:1,
                 count: { $size: "$exam_id" },
                 IIBISID: "$fromResearch.IIBISID",
                 Modality: "$fromResearch.Modality",
                 StationName: "$fromResearch.StationName",
                 radio_tracer: "$fromResearch.radio_tracer"
                 }
         },{$unwind:"$IIBISID"},
         {$unwind:"$Modality"},
         {$unwind:"$StationName"},
         {$unwind:"$radio_tracer"}
        ], function (err, data) {
             if (err) {
                 next(err);
             } else {
                 res.json(data);
                 //console.log(`retrieved ${data.length} templates from exam db ...`);
             }
    });
});


// search template's by research_id and group them by exam_id:
router.get('/texams/:exam_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {

    var template_instance = {
        date: null,
        exam_id: null,
        converted_to_template:false,
        series: [],
        usedInQC:0,
        parent_exam: undefined,
    };

    db.Exam.findById(new mongoose.Types.ObjectId(req.params.exam_id), function(err,texam) {
        if (err) return next(err);
        template_instance.date = texam.StudyTimestamp;
        template_instance.exam_id = texam._id;
        template_instance.converted_to_template = texam.converted_to_template ? texam.converted_to_template : false;

        if (texam.converted_to_template) {
            console.log(texam)
            db.Exam.findById(texam.parent_exam_id, function(err,pexam){
                if(err) return next(err);
                console.log("INSIDE THE API CONTROLLER")
                console.log(pexam)
                template_instance.parent_exam = pexam.subject;
            })
        }

        db.Template.find({"exam_id":texam._id},function(err,templates){
            if (err) return next(err);

            templates.forEach(function(t,ind){

                db.Series.find({"qc.template_id":t._id}).count(function (err, usedInQC) {
                    if (err) return next(err);

                    template_instance.usedInQC = usedInQC==0 ? template_instance.usedInQC : template_instance.usedInQC+1;

                    db.TemplateHeader.find({"template_id":t._id}).count(function(err,imageCount){
                        if(err) return next(err);

                        var tobj = {
                            SeriesNumber: t.SeriesNumber,
                            series_desc: t.series_desc,
                            template_id: t._id,
                            imageCount: imageCount,
                            usedInQC: usedInQC
                        };

                        template_instance.series.push(tobj);

                        if(template_instance.series.length == templates.length) {
                            res.json(template_instance);
                        }
                    })
                });
            })
        })
     });
});


// get a list of Researches with no available templates
router.get('/notemplate', function(req, res, next) {
    db.Exam.find({istemplate: true}).distinct('research_id', function(err, has_templates) {
        if(err) return next(err);
        db.Research.find({_id: {$nin: has_templates}}).exec(function(err, no_templates) {
            if(err) return next(err);
            res.json(no_templates);
        })
    })
});

// delete a template series

// delete a template series
router.get('/deleteselected/:template_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {


    db.Template.findById(req.params.template_id)
    .populate({
        path: 'exam_id',
        populate: {
            path: 'research_id'
        }
    })
    .exec(function (err, template) {
        if (err) return next(err);
        if (!template) return res.status(404).json({message: "no such template:" + req.params.template_id});
        db.Acl.can(req.user, 'qc', template.exam_id.research_id.IIBISID, function (can) {
            if (!can) return res.status(401).json({message: "you are not authorized to modify this IIBISID:" + template.exam_id.research_id.IIBISID});

            console.log("Deleting Template-Series "+req.params.template_id);

            //console.log(req.user.sub);
            var user = req.user.sub;

            deleteTemplate(template._id,function(err){
                if (err) return next(err);
                //console.log("TEMPLATE DELETED")
                unQC_series(template._id, user, function(err,images_modified){
                    if (err) return next(err);
                    //console.log("RETURNED FROM UN_ QC_SERIES FUNCTION WITH "+images_modified+ "IMAGES MODIFIED")
                    // check if there are any template series remainging in this template exam.
                    db.Template.find({"exam_id":template.exam_id},function(err,templates){
                        if (err) return next(err);
                        //console.log("templates left "+templates.length)
                        if (!templates || templates.length == 0){
                            // this was the last template, so we delete the Template exam
                            //console.log("Empty template exam to delete "+template.exam_id)

                            // but first check if this template exam is a clone of an existing exam
                            if (template.exam_id.converted_to_template) {
                                db.Exam.update({_id:template.exam_id.parent_exam_id}, {converted_to_template:false}, function(err){
                                    if (err) return next(err);                            
                                })
                            }

                            db.Exam.deleteOne({_id: template.exam_id}, function(err){
                                if (err) return next(err);
                                res.send("Template series "+template.series_desc+"deleted successfully! Template exam has also been deleted as this was the only template in this exam")
                            })
                        } else {
                            res.send("Template series "+template.series_desc+"deleted successfully! There are "+templates.length+ " series in this template exam")
                        }
                    })
                });
            });


        })
    })

})



// delete a template exam
router.get('/deleteall/:exam_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {

    //console.log(req.user.sub);
    var user = req.user.sub;

    db.Exam.findById(req.params.exam_id)
    .populate({
        path: 'research_id',
    })
    .exec(function (err, texam) {
        if (err) return next(err);
        if (!texam) return res.status(404).json({message: "no such template exam:" + req.params.exam_id});
        db.Acl.can(req.user, 'qc', texam.research_id.IIBISID, function (can) {
            if (!can) return res.status(401).json({message: "you are not authorized to modify data in this IIBISID:" + texam.research_id.IIBISID});


            db.Template.find({"exam_id":new mongoose.Types.ObjectId(req.params.exam_id)},function(err,templates){
                if (err) return next(err);
        
                async.forEach(templates, function(temp, next_temp) {
        
                    deleteTemplate(temp._id,function(err){
                        if (err) return next(err);
                        unQC_series(temp._id, user, function(err,images_modified){
                            if (err) return next(err);
                            //console.log("images modified -- "+ images_modified);
                            //console.log(temp.series_desc+ " deleted!!");
                            next_temp();
                        });
                    });
                }, function(err){
                    //total_modified += images_modified;
                    console.log("Deleting Template-Exam "+req.params.exam_id);

                    // check if this template exam is a clone of an existing exam
                    if (texam.converted_to_template) {
                        db.Exam.update({_id:texam.parent_exam_id}, {converted_to_template:false}, function(err){
                            if (err) return next(err);                            
                        })
                    }
                    db.Exam.deleteOne({_id:new mongoose.Types.ObjectId(req.params.exam_id)}, function(err){
                        if(err) return next(err);
                        res.send("Template deleted successfully!")
                    })
                })
            })
        })        
    })

})


function deleteTemplate(template_id, cb){

    db.TemplateHeader.findOneAndRemove({"template_id":template_id,primary_image:null}).exec(function(err,h){
        if(err) return cb(err);

        // Move files from dicom-raw to dicom-deleted
        qc_funcs.series.deprecate_series(h.headers,'deleted',function(err){
             if (err) return cb(err);

             db.TemplateHeader.deleteMany({"template_id":template_id},function(err) {
                if (err) return cb(err);

                db.Template.deleteOne({_id:template_id},function(err){
                    if (err) return cb(err);
                    cb();
                })
            })
         })
    })
}


function unQC_series(template_id,user,cb){
    db.Series.find({"qc.template_id": template_id}).exec(function(err, serieses) {
        if(err) return cb(err);
        if (!serieses) return cb(null,0);

        var images_modified = 0;

        async.forEach(serieses, function(series, next_series) {

            db.Image.update({series_id: series._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
                if(err) return cb(err);

                images_modified += affected.nModified;
                // add event to each series
                var detail = {
                    qc1_state:series.qc1_state,
                    date_qced: series.qc ? series.qc.date : undefined,
                    template_id: series.qc ? series.qc.template_id : undefined,
                }
                var event = {
                    user_id: user,
                    title: "QC Template deleted",
                    date: new Date(), //should be set by default, but UI needs this right away
                    detail: detail,
                };
                db.Series.update({_id: series._id}, {$push: { events: event }, qc1_state:"re-qcing", $unset: {qc: 1}}, function(err){
                    if(err) return cb(err);
                    next_series();
                });
            });
        }, function(err){
            if(err) return cb(err);
            return cb(null,images_modified);
        });
    });
}

module.exports = router;
