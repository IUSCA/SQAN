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

//get template head record
router.get('/head/:template_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    //console.log("inside template controller")
    db.Template.findById(req.params.template_id)
    .populate({
        path: 'exam_id',
        populate: {
            path: 'research_id'
        }
    })
    .exec(function(err, template) {            
        if(err) return next(err);
        if (!template) return res.status(404).json({message: "no such template:" + req.params.template_id});
        //console.log(template);
        db.Acl.can(req.user, 'view', template.exam_id.research_id.IIBISID, function (can) {
            if (!can) return res.status(401).json({message: "you are not authorized to access this IIBISID:" + template.exam_id.research_id.IIBISID});

            //finally, load the template headers
            db.TemplateHeader.find({template_id: template.id})
            .select('AcquisitionNumber InstanceNumber')
            .sort('AcquisitionNumber InstanceNumber')
            .exec(function(err, templates) {
                if(err) return next(err);
                res.json({                    
                    template: template,
                    templates: templates,
                });
            });
        });
    });
});

//get one template header intance
router.get('/inst/:inst_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {

    db.TemplateHeader.findById(req.params.inst_id)
        .populate('primary_image')
        .exec(function(err, templateheaders) {
            //console.log(templateheaders);
            res.json(templateheaders);
    });
});

module.exports = router;

