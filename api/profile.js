'use strict';

//contgib
var winston = require('winston');
var request = require('request');
var Promise = require('promise');

//mine
var config = require('./config');
var logger = new winston.Logger(config.logger.winston);
var db = require('./models');

var profiles = {};
/*
[
 '1': { public:
     { fullname: 'Soichi Hayashi (@iu.edu)',
       bio: 'Working at Indiana University as a Software Engineer',
       email: 'hayashis@iu.edu' },
    private: null,
    sub: '1' },
  '2': { public:
     { fullname: 'Soichi Hayashi (gmail)',
       email: 'soichih@gmail.com',
       bio: 'Test account' },
    private: null,
    sub: '2' } 
}
*/

exports.cache = function(cb) {
    logger.debug("caching user public profiles");
    request({
        url: config.dicom.profile_api+"/users",
        json: true,
        headers: { 'Authorization': 'Bearer '+config.dicom.profile_jwt }
    }, function (err, res, body) {
        if(err) return cb(err);
        if (res.statusCode != 200) {
            return cb({message: "couldn't load user profiles from profile service:"+res.body, code: res.statusCode});
        }
        //update cache (let's assume user never disappears)
        body.forEach(function(user) {
            profiles[user.sub] = user.public;
            profiles[user.sub].sub = user.sub; 
        });
        logger.debug("cached "+body.length+" profiles");
        //console.dir(profiles);
        if(cb) cb(null);
    });
}

exports.getall = function() { return profiles };

//synchronous.. because it loads from the cache
exports.load_profiles = function(subs) {
    var ps = [];
    subs.forEach(function(sub) {
        if(profiles[sub] === undefined) {
            logger.warn("couldn't find user with sub:"+sub+" in profiles cache");
        } else {
            ps.push(profiles[sub]);
        } 
    });
    return ps;
}

/*
//start caching profile
exports.start = function(cb) {
    logger.debug("starting profile cache");
    setInterval(function() {
        exports.cache(function(err) {
            if(err) logger.error(err); //continue..
        });
    }, 1000*300); //every 5 minutes enough?
    exports.cache(cb);
}
*/

