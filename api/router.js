'use strict';

//contrib
var express = require('express');
var router = express.Router();
var jwt = require('express-jwt');

//mine
var config = require('./config/config');

router.use('/', require('./controllers/root'));
router.use('/study', require('./controllers/study'));
router.use('/image', require('./controllers/image'));
router.use('/template', require('./controllers/template'));

module.exports = router;


