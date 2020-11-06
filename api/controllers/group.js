'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');
var jwt = require('express-jwt');
var async = require('async');

//mine
var config = require('../../config');
var common = require('./common');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');


//return list of all groups - no ACL
router.get('/all', jwt({secret: config.express.jwt.pub, algorithms: ['RS256']}), function(req, res, next) {
    db.Group.find({}).populate('members').exec(function(err, groups) {
        if(err) return next(err);
        logger.info(`Fetched list of ${groups.length} groups`);
        res.json(groups);
    });
});

//create group
router.post('/', jwt({secret: config.express.jwt.pub, algorithms: ['RS256']}), common.has_role("admin"), function(req, res, next) {
    db.Group.create(req.body, function(err, _group) {
        if(err) return next(err);
        res.json(_group);
    })
});

//add user to group
router.get('/adduser/:id/:uid', common.has_role("admin"), function(req, res, next) {
    db.Group.findById(req.params.id).exec(function(err, _group) {
        if(err) return next(err);
        if(!_group) res.status(404).json({message: "no such group_id"});
        db.User.findById(req.params.uid).exec(function(err, _user) {
            if(err) return next(err);
            if(!_user) res.status(404).json({message: "no such user_id"});
            if(_group.members.indexOf(req.params.uid) < 0) {
                _group.members.push(req.params.uid);
                _group.save();
                res.json(_group);
            } else {
                res.status(409).json({message: "user already belongs to that group"});
            }
        })
    });
});


//get single group
router.get('/:id', jwt({secret: config.express.jwt.pub, algorithms: ['RS256']}), common.has_role("admin"), function(req, res, next) {
    db.Group.findById(req.params.id).populate('members').exec(function(err, _group) {
        if(err) return next(err);
        if(!_group) res.sendStatus(404);
        res.json(_group);
    });
});

//update group
router.patch('/:id', jwt({secret: config.express.jwt.pub, algorithms: ['RS256']}), common.has_role("admin"), function(req, res, next) {
    db.Group.findById(req.params.id).exec(function(err, _group) {
        if(err) return next(err);
        if(!_group) res.sendStatus(404);

        for( let b in req.body ){
            _group[b] = req.body[b];
        }
        _group.save();
        res.json(_group);
    });
});

//delete group
router.delete('/:id', jwt({secret: config.express.jwt.pub, algorithms: ['RS256']}), common.has_role("admin"), function(req, res, next) {
    db.Group.findByIdAndRemove(req.params.id).exec(function(err, _group) {
        if(err) return next(err);
        if(!_group) res.sendStatus(404);
        logger.info(`Group ${_group.groupname} has been deleted`);
        logger.info("Cleaning up orphaned ACLs");

        db.Acl.find({}).exec(function(err, _acls) {
            if(err) return next(err);
            async.eachSeries(_acls, function(acl, cb) {

                acl.qc.groups.forEach(function (value, i) {
                    if(value == _group._id) {
                        acl.qc.groups.splice(i, 1);
                        acl.markModified('qc');
                        console.log(`Updating QC ACLs for IIBIS ${acl.IIBISID}`);
                    }
                })

                acl.view.groups.forEach(function (value, i) {
                    if(value == _group._id) {
                        acl.view.groups.splice(i, 1);
                        acl.markModified('view');
                        console.log(`Updating View ACLs for IIBIS ${acl.IIBISID}`);
                    }
                })
                acl.save();
                cb()

            }, function(err) {
                if(err) return next(err);
                res.json(_group);
            })
        })
    });
});



module.exports = router;
