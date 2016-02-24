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

//get all researches that user can view
router.get('/', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    var query = db.Research.find();
    query.sort('-IIBISID');
    query.exec(function(err, rs) {
        if(err) return next(err);
        if(~req.user.scopes.dicom.indexOf('admin')) {
            //admin needs to be able to see all iibisid - so that they can update the acl for all iibisids
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

//rerun QC1 on the entire "research"
router.post('/reqc', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.Research.find(req.body).exec(function(err, researches) {
        if(err) return next(err);
        var total_modified = 0;
        async.forEach(researches, function(research, done) {
            //make sure user has access to this research
            db.Acl.can(req.user, 'qc', research.IIBISID, function(can) {
                if(!can) return res.status(401).json({message: "you are not authorized to QC this IIBISID:"+research.IIBISID});
                //invalidate series QC (although not exactly necessary..)
                db.Series.update({research_id: research._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected) {
                    if(err) return next(err);
                    //invalidate image QC.
                    db.Image.update({research_id: research._id}, {$unset: {qc: 1}}, {multi: true}, function(err, affected){
                        if(err) return next(err);
                        total_modified += affected.nModified;
                        done();
                    });
                });
            });
        }, function(err) {
            res.json({message: "Template updated. Re-running QC on "+total_modified+" images."});
        });
    });
});
module.exports = router;

