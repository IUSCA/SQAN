'use strict';

//contrib
var express = require('express');
var router = express.Router();
var jwt = require('express-jwt');

//mine
var config = require('./config/config');

router.use('/', require('./controllers/root'));
router.use('/study', require('./controllers/study'));

module.exports = router;


