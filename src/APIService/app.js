'use strict'

var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var request = require('request-promise');

var app = express();

var config = require('../common/config.js');
var login = require('./routes/logincontroller.js')();
require('./apiservicepassport.js')(passport);
var userAuth = require('./routes/userauthcontroller.js')();
var userDetails = require('./routes/userdetailscontroller.js')();
var events = require('./routes/eventscontroller.js')();
var groups = require('./routes/groupscontroller.js')();

var helpers = require('../common/helpers.js');
var BadRequestError = require('../common/error.js').BadRequestError;
var NotFoundError = require('../common/error.js').NotFoundError;
var ForbiddenError = require('../common/error.js').ForbiddenError;
var UnauthorizedError = require('../common/error.js').UnauthorizedError;

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
app.post('/userauth', helpers.wrap(function *(req, res){
    var options = {
        method : 'POST',
        headers: {'content-type' : 'application/json; charset=utf-8' },
        url:     config.userAuthServiceEndpoint + '/userauth',
        body:    JSON.stringify(req.body)};

    var results = yield request(options);

    res.status(200);
    res.send(JSON.parse(results));
}));

// all other urls - all APIs are subject to token authentication
app.use('/*', passport.authenticate('token-bearer', { session: false }),
    function (req, res, next){
        if (!req || !req.user){
            // token authentication fail.
            throw new UnauthorizedError('Token authentication failed.');
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

app.use(function(err, req, res, next) {
    return helpers.handleError(res, err, next);
});

// error handling for other routes
app.use(function(req, res, next) {
    var err = helpers.createError(404, 'Resource specified by URL cannot be located.');
    next(err);
});

app.use(function(err, req, res, next) {
    res.status(err.statusCode || 500);
    res.send(err.error);
});

var port = process.env.PORT || config.apiServicePort;
var server = app.listen(port, function(){
    console.log('http://localhost:' + server.address().port + '/');
});
