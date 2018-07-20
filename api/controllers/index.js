'use strict';

//contrib
var express = require('express');
var router = express.Router();
var jwt = require('express-jwt');

//mine
var config = require('../../config');

router.use('/', require('./root'));
router.use('/research', require('./research'));
router.use('/exam', require('./exam'));
router.use('/series', require('./series'));
router.use('/image', require('./image'));
router.use('/template', require('./template'));
router.use('/event', require('./event'));
router.use('/handler', require('./handler'));
router.use('/dataflow', require('./dataflow'));
router.use('/templatesummary', require('./templatesummary'));
//router.use('/study', require('./series')); //deprecated .. use /series

module.exports = router;


