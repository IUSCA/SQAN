'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');
var jwt = require('express-jwt');

//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');

//get template head record
router.get('/head/:template_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    //limit to admin for now (in the future allow normal user with iibisid auth)
    if(!~req.user.scopes.dicom.indexOf('admin')) return res.status(401).end();

    db.Template.findById(req.params.template_id, function(err, template) {
        if(err) return next(err);
        db.Research.findById(template.research_id, function(err, research) {
            if(err) return next(err);

            //make sure user has access to this IIBISID
            db.Acl.canAccessIIBISID(req.user, research.IIBISID, function(can) {
                if(!can) return res.status(401).json({message: "you are not authorized to access this IIBISID:"+research.IIBISID});

                //finally, load the template headers
                db.TemplateHeader.find({template_id: template.id})
                .select('AcquisitionNumber InstanceNumber')
                .sort('AcquisitionNumber InstanceNumber')
                .exec(function(err, templates) {
                    if(err) return next(err);
                    res.json({
                        research: research,
                        template: template,
                        templates: templates,
                    });
                });
            });
        });
    });
});

//get one template header intance
router.get('/inst/:inst_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    //limit to admin for now (in the future allow normal user with iibisid auth)
    if(!~req.user.scopes.dicom.indexOf('admin')) return res.status(401).end();

    db.TemplateHeader.findById(req.params.inst_id, function(err, templateheaders) {
        if(err) return next(err);

        //make sure user has access to this IIBISID
        db.Acl.canAccessIIBISID(req.user, templateheaders.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to access this IIBISID:"+templateheaders.IIBISID});
            res.json(templateheaders);
        });
    }); 
});

module.exports = router;

