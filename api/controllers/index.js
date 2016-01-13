'use strict';

//contrib
var express = require('express');
var router = express.Router();
var jwt = require('express-jwt');

//mine
var config = require('../../config');

router.use('/', require('./root'));
router.use('/study', require('./study'));
router.use('/image', require('./image'));
router.use('/template', require('./template'));

module.exports = router;


