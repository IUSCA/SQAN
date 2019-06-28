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


//return list of all users - no ACL
router.get('/all', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.User.find({}).exec(function(err, users) {
        if(err) return next(err);
        logger.info(`Fetched list of ${users.length} users`);
        res.json(users);
    });
});

//create user
router.post('/', jwt({secret: config.express.jwt.pub}), common.has_role("admin"), function(req, res, next) {
    common.create_user(req.body.username, function(err, _user) {
        if(err) return next(err);
        if(!_user) res.sendStatus(404);

        for( let b in req.body ){
            _user[b] = req.body[b];
        }
        _user.save();
        res.json(_user);
    });
});

//get self
router.get('/self', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.User.findOne({username: req.user.profile.username}).exec(function(err, _user) {
        if(err) return next(err);
        if(!_user) res.sendStatus(404);
        db.Group.getUserGroups(_user, function(err, gids) {
            console.log(gids);
            res.json({'user':_user, 'groups': gids});
        });
    });
});

//get single user
router.get('/:id', jwt({secret: config.express.jwt.pub}), common.has_role("admin"), function(req, res, next) {
    db.User.findById(req.params.id).exec(function(err, _user) {
        if(err) return next(err);
        if(!_user) res.sendStatus(404);
        res.json(_user);
    });
});


//update user
router.patch('/:id', jwt({secret: config.express.jwt.pub}), common.has_role("admin"), function(req, res, next) {
    db.User.findById(req.params.id).exec(function(err, _user) {
        if(err) return next(err);
        if(!_user) res.sendStatus(404);

        for( let b in req.body ){
            _user[b] = req.body[b];
            console.log(`Update ${b} to ${req.body[b]}`);
        }

        _user.save();
        res.json(_user);
    });

});

//delete user
router.delete('/:id', jwt({secret: config.express.jwt.pub}), common.has_role("admin"), function(req, res, next) {
    db.User.findByIdAndRemove(req.params.id).exec(function(err, _user) {
        if(err) return next(err);
        if(!_user) res.sendStatus(404);
        logger.info(`User ${_user.username} has been deleted`);
        res.json(_user);
    });
});


module.exports = router;
