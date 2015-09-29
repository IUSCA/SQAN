'use strict';

//contrib
var express = require('express');
var router = express.Router();
var jwt = require('express-jwt');

//mine
var config = require('./config/config');

/*
router.get('/health', function(req, res) {
    res.json({status: 'ok'});
});
*/
router.use('/test', require('./controllers/test'));

module.exports = router;


