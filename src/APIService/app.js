"use strict"

var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var request = require('request');

var app = express();

var config = require('../common/config.js');
var login = require('./routes/logincontroller.js')();
require('./apiservicepassport.js')(passport);
var userAuth = require('./routes/userauthcontroller.js')();
var userDetails = require('./routes/userdetailscontroller.js')();
var events = require('./routes/eventscontroller.js')();
var groups = require('./routes/groupscontroller.js')();

var Helpers = require('../common/helpers.js').Helpers;
var helpers = new Helpers();

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Do we actually need session?
app.use(session({
    secret : "PlanetCal",
    saveUninitialized: false,
    resave: false
}));

app.use(passport.initialize());
app.use(passport.session());

// router set up
// root
app.get('/', function(req, res){
    res.render('index', { isAuthenticated: req.isAuthenticated(), user: req.user });
});

// login
app.use('/login', login);

// forward this to userAuth service before token authenication
// kicks in because this is userAuth creation
app.post('/userauth', function(req, res){
    request.post({
        headers: {'content-type' : 'application/json; charset=utf-8' },
        url:     config.userAuthServiceEndpoint + '/userauth',
        body:    JSON.stringify(req.body)},
        function(error, response, body){
            helpers.handleHttpForwardedResponse(error, response, body, res);
        });    
});

// all other urls - all APIs are subject to token authentication
app.use('/*', passport.authenticate('token-bearer', { session: false }),
    function(req, res, next){
        if (!req || !req.user){
            // token authentication fail.
            res.json( {'message': 'Token authentication failed.'});
            res.status(503);
        }
        else{
            // set auth-identity header so that internal services
            // know the caller's identity
            req.headers['auth-identity'] = req.user;
            // continue calling middleware in line
            next();
        }
    }
);


// other routes
app.use('/userauth', userAuth);
app.use('/userdetails', userDetails);
app.use('/events', events);
app.use('/groups', groups);

// error handling for other routes
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

var port = process.env.PORT || config.apiServicePort;
var server = app.listen(port, function(){
    console.log('http://localhost:' + server.address().port + '/');
});
