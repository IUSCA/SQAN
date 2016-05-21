'use strict';

//contrib
var express = require('express');
var router = express.Router();
var jwt = require('express-jwt');

//mine
var config = require('../../config');

router.use('/', require('./root'));
router.use('/research', require('./research'));
router.use('/series', require('./series'));
router.use('/image', require('./image'));
router.use('/template', require('./template'));

//deprecated .. use /series
router.use('/study', require('./series'));

module.exports = router;


