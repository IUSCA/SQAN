'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');
var jwt = require('express-jwt');
var jsonwt = require('jsonwebtoken');
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
        db.Group.find({members: _user._id}, function(err, _groups) {
          if(err) return next(err, null);
          let groups = _groups.map(g => {
            return {name: g.name, _id: g._id}
          })
          res.json({'user':_user, 'groups': groups});
        });
    });
});

//update self
router.patch('/self', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    db.User.findOne({username: req.user.profile.username}).exec(function(err, _user) {
        if(err) return next(err);
        if(!_user) res.sendStatus(404);

        console.log(req.body);
        //users are only allowed to edit fullname, email, and primary_role
        let valid_keys = ['fullname','email','primary_role'];
        for( let b in req.body ){
            if(valid_keys.includes(b)){
                _user[b] = req.body[b];
                console.log(`Update ${b} to ${req.body[b]}`);
            }
        }

        _user.save();
        res.json(_user);
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
router.patch('/:id', jwt({secret: config.express.jwt.pub}), common.has_role("god"), function(req, res, next) {
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
router.delete('/:id', jwt({secret: config.express.jwt.pub}), common.has_role("god"), function(req, res, next) {
    db.User.findByIdAndRemove(req.params.id).exec(function(err, _user) {
        if(err) return next(err);
        if(!_user) res.sendStatus(404);
        logger.info(`User ${_user.username} has been deleted`);
        res.json(_user);
    });
});


//sudo as user
router.get('/spoof/:id', jwt({secret: config.express.jwt.pub}), common.has_role('god'), function(req, res, next) {
  db.User.findById(req.params.id).exec(function(err, _user) {
    if(err) return next(err);
    if(!_user) return res.status('404').json({"msg":"Requested user not found"});

    common.issue_jwt(_user, function (err, jwt) {
      if (err) return next(err);
      var decoded = jsonwt.verify(jwt, config.express.jwt.pub);
      return res.json({jwt: jwt, uid: _user.username, role: _user.primary_role, jwt_exp: decoded.exp, roles: _user.roles});
    });
  })
})



module.exports = router;
