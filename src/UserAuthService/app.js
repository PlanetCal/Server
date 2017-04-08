'use strict'

var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var config = require('../common/config.js');

var app = express();

require('./userauthpassport.js')(passport);
var UserLogin = require('./routes/logincontroller.js')(passport);
var UserAuth = require('./routes/userauthcontroller.js')(passport);
var PasswordCrypto = require('./passwordcrypto.js').PasswordCrypto;
var helpers = require('../common/helpers.js');
var NotFoundException = require('../common/error.js').NotFoundException;
var UserAuthServiceException = require('../common/error.js').UserAuthServiceException;

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// TODO: do we need session?
app.use(session({
    secret : "PlanetCal",
    saveUninitialized: false,
    resave: false
}));

app.use(passport.initialize());
app.use(passport.session());

// login
app.use('/login', UserLogin);
app.use('/userauth', UserAuth);

// error handling for other routes
app.use(function(req, res, next) {
    next(new NotFoundException('Resource specified by URL cannot be located.'));
});

app.use(function(err, req, res, next) {
    err.serviceName = 'UserAuthService';
    err.activityId = req.headers['activityid'];
    res.status(err.code || 500).json(helpers.constructResponseJsonFromExceptionRecursive(err));
});

var port = process.env.PORT || config.userAuthServicePort;
var server = app.listen(port, function(){
    console.log('http://localhost:' + server.address().port + '/');
});
