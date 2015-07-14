#!/usr/bin/node

var express = require('express');
var jwt = require('express-jwt');
var path = require('path');
var logger = require('morgan');
var async = require('async');
//var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var compress = require('compression');
var fs = require('fs');

//var passport = require('passport');

/*
var local = require('./routes/local'); //local user/pass
var iucas = require('./routes/iucas');
var register = require('./routes/register');
var user = require('./routes/user');
var User = require('./models/user').User;
*/


//var route_iucas = require('./routes/iucas');

//var saml = require('passport-saml');

var config = require('./config/config').config;

var app = express();
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');
//app.set('env', config.environment || process.env.env);

//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger(app.get('DEBUG'))); //TODO - pull it from config or app.get('env')?

//app.use(require('less-middleware')(path.join(__dirname, 'public')));
//app.use(express.static(path.join(__dirname, 'public')));
//app.use('/bower', express.static(path.join(__dirname, 'bower_components')));

app.use(bodyParser.json()); //parse application/json
app.use(bodyParser.urlencoded({ extended: false})); //parse application/x-www-form-urlencoded
app.use(compress());
//app.use(expressValidator());

//app.use(cookieParser());
//app.use(jwt_helper.tokenParser());

/*
//pass url_base from nginx to view to be used as url_base
app.use(function(req, res, next) {
    //console.dir(req.headers);
    res.locals.url_base = config.path_prefix;
    next();
});
*/

//TODO - I need to make this not throw 401 if I don't have token set yet..
/*
app.use(jwt({
    secret: fs.readFileSync('./config/auth.pub'),
    requestProperty: 'jwt',
    getToken: function(req) {
        if(req.cookies && req.cookies.token) {
            //console.log("token set to "+req.cookies.token);
            return req.cookies.token;
        }
        return null;
    }
}));
*/

//app.use(passport.initialize());//needed for express-based application

/*
app.use('/local', local);
app.use('/iucas', iucas);
app.use('/register', register);
app.use('/user', user);
*/

//cache result info
var results_analysis = [];
function cache_analysis() {
    console.log("caching analysis");
    fs.readdir(config.analyzed_headers, function(err, dates) {
        var new_cache = [];
        async.eachSeries(dates, function(date, next) {
            //console.log(config.analyzed_headers+'/'+date+'/analysis.json');
            try {
                var json = fs.readFileSync(config.analyzed_headers+'/'+date+'/analysis.json', {encoding: 'utf8'});
                //console.log("size:"+json.length);
                var analysis = JSON.parse(json);
                analysis.error_count = 0;
                analysis.warning_count = 0;
                //bubble up ok/error status and remove unnecessary bits
                for(var studyid in analysis.studies) {
                    var study = analysis.studies[studyid];
                    study.error_count = 0;
                    study.warning_count = 0;
                    for(var seriesid in study.serieses) {
                        var series = study.serieses[seriesid];
                       
                        series.error_count  = 0;
                        series.warning_count  = 0;
                        for(var instid in series.instances) {
                            var instance = series.instances[instid];
                            //var errors = instance.errors;
                            series.error_count += instance.errors.length;
                            series.warning_count += instance.warnings.length;

                            //instance._error_count = instance.errors.length;
                            //instance._warning_count = instance.warnings.length;
                            //save memory
                            //delete instance.errors;
                            //delete instance.warnings;
                        }
                        study.error_count += series.error_count;
                        study.warning_count += series.warning_count;
                        
                        //don't store memory hogging stuff (let client load this individually)
                        delete series.stats; 
                     };
                    analysis.error_count += study.error_count;
                    analysis.warning_count += study.warning_count;
                }
            } catch (e) {
                console.error(e, e.stack.split("\n"));
            }
            new_cache.push({date: date, analysis: analysis});
            next(null);
        }, function(){
            new_cache.sort(function(a,b){return b.date-a.date});
            console.dir(new_cache[0]);
            results_analysis = new_cache;
            console.log("updated result_analysis.. count:"+results_analysis.length);
        });
    });
}
cache_analysis(); //initial run
setInterval(cache_analysis, 1000*3600); //cache entire results list every hour

var publicKey = fs.readFileSync('config/auth.pub');
app.get('/results', jwt({secret: publicKey}), function(req, res) {
    //TODO - check req.user.scopes?
    var start = req.query.start?req.query.start:0;
    var end = req.query.end?req.query.end:5;
    res.json(results_analysis.slice(start, end));
});

app.get('/series', jwt({secret: publicKey}), function(req, res) {
    //TODO - check req.user.scopes?

    var date = req.query.date.replace(/[^0-9]/, "");
    var studyid = req.query.studyid.replace(/[^\.0-9]/, "");
    var seriesid = req.query.seriesid.replace(/[^\.0-9]/, "");

    console.log("loading "+config.analyzed_headers+'/'+date+'/analysis.json');
    var json = fs.readFileSync(config.analyzed_headers+'/'+date+'/analysis.json', {encoding: 'utf8'});
    var analysis = JSON.parse(json);
    res.json(analysis.studies[studyid].serieses[seriesid]);

    //var json = fs.readFileSync(config.analyzed_headers+'/'+date+'/'+studyid+'/'+seriesid+'/analysis.json', {encoding: 'utf8'});
    //var series = JSON.parse(json);
    //res.json({series: series, analysis: analysis.studies[studyid].serieses[seriesid]}); 
});

/*
//by default express-jwt loads jwt from headers.
//but I want to make some API accessible via URL params so that browser can access it directly
function alsoFromParam(name) {
    return function(req) {
        if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
            //load from headers by default
            return req.headers.authorization.split(' ')[1];
        } else if (req.query && req.query[name]) {
            //but also from the query
            return req.query[name];
        }
    }
}
*/

app.get('/instance', jwt({secret: publicKey/*, getToken: alsoFromParam('ac')*/}), function(req, res) {
    var date = req.query.date.replace(/[^0-9]/, "");
    var studyid = req.query.studyid.replace(/[^\.0-9]/, "");
    var seriesid = req.query.seriesid.replace(/[^\.0-9]/, "");
    var instid = req.query.instid.replace(/[^\.0-9]/, "");

    //console.log("loading "+config.analyzed_headers+'/'+date+'/analysis.json');
    //console.log(config.analyzed_headers+'/'+date+'/'+studyid+'/'+seriesid+'/'+instid);
    var json = fs.readFileSync(config.analyzed_headers+'/'+date+'/'+studyid+'/'+seriesid+'/'+instid, {encoding: 'utf8'});
    var inst = JSON.parse(json);
    res.json(inst);
});

//auth routes (main login form, registeration, confirmation, etc..)
//app.use(config.path_prefix+'/', route_index);

//start of all the auth handlers
//app.use(config.path_prefix+'/iucas', route_iucas);

/*
var spcert = fs.readFileSync('/etc/grid-security/http/cert.pem', 'utf-8');
var spkey = fs.readFileSync('/etc/grid-security/http/key.pem', 'utf-8');
var idpcert = fs.readFileSync('static/incommon.pem', 'utf-8');

var samlStrategy = new saml.Strategy({
    callbackUrl: 'https://trident.soichi.us/auth/login/callback',
    //entryPoint: 'https://openidp.feide.no/simplesaml/saml2/idp/SSOService.php',
    entryPoint: 'https://cas-reg.uits.iu.edu/cas-sp',
    issuer: 'passport-saml', 
    entityID: 'urn:mace:incommon:iu.edu',
    cert: idpcert, //to validate the incommin gSAML responses
    decryptionCert: spcert,
    decryptionPvk: spkey,
    identifierFormat: 'urn:mace:dir:attribute-def:cn' 
}, function(profile, done) {
    console.log("profile %j", profile);
    var user = {
        name: profile.cn,
        email: profile.email
    };
    return done(null, user);
});
passport.use(samlStrategy);
*/


/* for session
passport.serializeUser(function(user, done){
    done(null, user);
});

passport.deserializeUser(function(user, done){
    done(null, user);
});
*/

/*
app.get('/login', 
    passport.authenticate('saml', {failureRedirect: '/login/fail'}),
    function(req, res) {
        console.log("here is get /login");
        res.send('hello');
    }     
);

app.get('/login/fail', 
    function(req, res) {
        res.send(401, 'Login failed');
    }
);

app.get('/Shibboleth.sso/Metadata', 
    function(req, res) {
        res.type('application/xml');
        res.send(200, samlStrategy.generateServiceProviderMetadata(spcert));
    }
);

app.post('/login/callback',
    passport.authenticate('saml', { failureRedirect: '/login/fail', failureFlash: true }),
    function(req, res) {
        console.log("posting /login/callback");
        res.redirect('/auth');
    }
);
*/

/*
passport.serializeUser(function(user, done) {
  done(null, user.username);
});
*/
/*
passport.deserializeUser(function(username, done) {
    console.log("deserializing "+username);
});
*/
/*
app.use('/auth/iucas/logout', function(req, res, next) {
    req.logout();
    res.redirect('/iucas');
});
app.use('/auth/iucas/login', passport.authenticate('iucas', { failureRedirect: '/login/iucas-fail' }), function(req, res, next) {
    console.log("successfully logged in as "+req.user.username);
    res.redirect('/iucas');
});
*/
/*
app.use('/auth/iucas', function(req, res, next) {
    console.dir(req.user);
    res.json(req.user);
});
app.use('/', function(req, res, next) {
    res.redirect('/auth/incas');
});
*/

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use(function(err, req, res, next) {
    console.dir(req.headers.authorization);
    console.dir(err);
    res.status(err.status || 500);
    res.json(err);
});

module.exports = app;

