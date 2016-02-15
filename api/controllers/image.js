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

router.get('/:image_id', jwt({secret: config.express.jwt.pub}), function(req, res, next) {
    //limit to admin for now (in the future allow normal user with iibisid auth)
    //if(!~req.user.scopes.dicom.indexOf('admin')) return res.status(401).end();

    db.Image.findById(req.params.image_id, function(err, image) {
        //make sure user has access to this IIBISID
        db.Acl.can(req.user, 'view', image.IIBISID, function(can) {
        //db.Acl.canAccessIIBISID(req.user, image.IIBISID, function(can) {
            if(!can) return res.status(401).json({message: "you are not authorized to access this IIBISID:"+image.IIBISID});
            res.json(image);
        });
    }); 
});

module.exports = router;

