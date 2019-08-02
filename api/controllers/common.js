const jsonwt = require('jsonwebtoken');
var request = require('request');
var winston = require('winston');

var config = require('../../config');
var db = require('../models');
var logger = new winston.Logger(config.logger.winston);


/////////AUTH/////////////////
function issue_jwt(user, cb) {
    console.log("issuing!");
    //get group ids
    db.Group.getUserGroups(user, function(err, gids) {
        if(err) return cb(err, null);
        var claim = {
            iss: config.auth.iss,
            exp: (Date.now() + config.auth.ttl)/1000,
            //"iat": (Date.now())/1000, //this gets set automatically
            gids: gids,
            roles: user.roles,
            primary_role: user.primary_role,

            //can't use user.username which might not be set
            sub: user,  //TODO - toString() this!?

            profile: {
                username: user.username,
                email: user.email,
                fullname: user.fullname
            },
        };

        cb(null, jsonwt.sign(claim, config.express.jwt.key, config.express.sign_opt));
    })
};

function check_jwt(token) {
    console.log(token);
    try {
        var decoded = jsonwt.verify(token, config.express.jwt.pub);
        return decoded;
    } catch(err) {
        return undefined;
    }
};

exports.issue_jwt = issue_jwt;
exports.check_jwt = check_jwt;

exports.check_whitelist = function(req, res, next) {

    var token = req.query.jwt;
    var auth = check_jwt(token);
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;


    console.log('checking whitelist');

    if(config.auth.whitelist_ip.includes(ip)) return next();
    if(auth === undefined || !config.auth.whitelist.includes(auth.profile.username)){
        res.sendStatus("403");
        return;
    } else {
        next();
    }
};

exports.check_advanced = function(req, res, next) {

    var token = req.query.jwt;
    var auth = check_jwt(token);
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;


    console.log('checking whitelist');

    if(auth === undefined || (!config.auth.advanced.includes(auth.profile.username) && !config.auth.whitelist.includes(auth.profile.username))){
        res.sendStatus("403");
        return;
    } else {
        next();
    }
};



exports.check_external_whitelist = function(req, res, next) {
    var token = req.query.jwt;
    var auth = check_jwt(token);
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    console.log('Whitelist IP check is set to: ',ip);
    if(config.auth.external_whitelist_ip.includes(ip)) return next();
    if(config.auth.whitelist_ip.includes(ip)) return next();
    console.log('Whitelist auth is set to: ',auth);
    console.log('Auth check: ',config.auth.whitelist.includes(auth.profile.username));
    if(auth === undefined || !config.auth.whitelist.includes(auth.profile.username)){
        res.sendStatus("403");
        return;
    } else {
        next();
    }
};


exports.create_user = function(username, cb) {
    console.log("creating user");
    console.log(username);
    var new_user = new db.User({
        username: username,
        roles: ['user'],
        primary_role: 'guest',
        email: username + '@iu.edu'
    });

    new_user.save();
    cb(null, new_user);
};

//middleware
exports.has_role = function(role) {
    return function(req, res, next) {
        logger.info(req.user.roles);
        logger.info(role);
        logger.info(req.user.roles.indexOf(role));
        if(~req.user.roles.indexOf(role)) next();
        else res.status(401).send(role+" role required");
    }
}


//return true if user can do action on iibisid
function isUserAllowed(user, action, research_id, cb) {

    getUserCan(user,action,function(err, researchids){
        if (err) return cb(err);
        // console.log(researchids);
        // console.log(research_id);
        // console.log(researchids.indexOf(research_id));
        for (var i=0;i<=researchids.length;i++){
            if(researchids[i] == research_id) return cb(null,true);
        }
        cb(null,false);
    })
}


function getUserCan(user,action,cb) {

    db.Acl.getCan(user, action, function(err, iibisids) {
        if(err) return cb(err);

        db.Research.find({"IIBISID":{$in:iibisids}},function(err,rr){
            if(err) return cb(err);
            var researchids = [];
            rr.forEach(function(r){
                researchids.push(r._id);
            });
            //console.log(researchids);
            cb(null,researchids);
        });
    })
}


exports.getUserCan = getUserCan;
exports.isUserAllowed = isUserAllowed;
