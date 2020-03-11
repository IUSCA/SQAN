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


//return list of all qc-keywords
router.get('/allkeys', function(req, res, next) {
    db.QCkeyword.find({}).exec(function(err, keys) {
        if(err) return next(err);
        logger.info(`Fetched list of ${keys.length} qc-keywords`);
        res.json(keys);
    });
});

router.get('/scandb', function(req, res, next) {
    db.QCkeyword.find({}).distinct('key').exec(function(err, keys) {
        if(err) return next(err);
        logger.info(`Fetched list of ${keys.length} qc-keywords`);

        db.Image.find({primary_image: null}).exec(function(err, _images) {
            if(err) return next(err);

            let new_keys = [];

            async.each(_images, function(img, cb_i) {
                async.eachOf(img.headers, function(val, key, cb_h){
                    if(key.includes('qc_')) return cb_h();
                    if(key === undefined || key === 'undefined') return cb_h();
                    if(!keys.includes(key) && !new_keys.includes(key)) new_keys.push(key);
                    cb_h();
                }, function(err) {
                    if(err) return cb_i(err);
                    cb_i();
                } )
            }, function(err) {
                if(err) return next(err);
                res.json(new_keys);
            })
        })
    });

});

//return a joined list of common and modality-specific QC keyword settings
router.get('/modality/:modality', function(req, res,next) {
   db.QCkeyword.find({modality: 'common'}).exec(function(err, c_keys) {
       if(err) return next(err);
       db.QCkeyword.find({modality: req.params.modality}).exec(function(err, m_keys) {
           if(err) return next(err);

           async.each(m_keys, function(mk, cb){
               let res = c_keys.findIndex(ck => ck.key === mk.key);
               if(res > -1) {
                    c_keys[res] = mk;
               } else {
                   c_keys.push(mk);
               }
               cb();
           }, function(err){
                res.json(c_keys);
           })
       })
   })

});


//add a new keyword
router.post('/', jwt({secret: config.express.jwt.pub}), common.has_role("admin"), function(req, res, next) {


    console.log(req.body);
    db.QCkeyword.findOneAndUpdate({
        key: req.body.key,
        modality: req.body.modality,
    },
    {
        skip: req.body.skip ? req.body.skip : true,
        custom: req.body.custom ? req.body.custom : false,
    },
    {upsert:true, 'new': true}, function(err, _qckeyword) {
        if(err) return next(err);
        res.json(_qckeyword);
    });

});



//get single keyword
router.get('/:qckeyword', jwt({secret: config.express.jwt.pub}), common.has_role("admin"), function(req, res, next) {

    db.QCkeyword.find(req.params.qckeyword).exec(function(err, _qckeyword) {
        if(err) return next(err);
        if(!_qckeyword) res.sendStatus(404);
        res.json(_qckeyword);
    });

});


//bulk update
router.patch('/', jwt({secret: config.express.jwt.pub}), common.has_role("admin"), function(req, res, next) {
    async.each(req.body, function(kk, callback) {
        //console.log(iibisid);
        //console.log(acl);
        db.QCkeyword.findById(kk._id).exec(function(err, doc){
            console.log(doc);
            if(err) return callback(err);
            doc.modality = kk.modality;
            doc.skip = kk.skip;
            doc.custom = kk.custom;
            doc.save();
            callback()
        });
    }, function(err) {
        if (err) return next(err);
        res.json({status: "ok", msg: "Keywords updated"});
    });

});


//delete keyword
router.delete('/:id', jwt({secret: config.express.jwt.pub}), common.has_role("admin"), function(req, res, next) {
    db.QCkeyword.findByIdAndRemove(req.params.id).exec(function(err, _qckeyword) {
        if(err) return next(err);
        if(!_qckeyword) res.sendStatus(404);
        logger.info(`QC-Keyword ${_qckeyword.key} has been deleted`);
        res.json(_qckeyword);
    });
});


module.exports = router;
