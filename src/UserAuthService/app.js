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
var NotFoundError = require('../common/error.js').NotFoundError;

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

app.use(function(err, req, res, next) {
    return helpers.handleError(res, err, next);
});

// error handling for other routes
app.use(function(req, res, next) {
    next(new NotFoundError('Resource specified by URL cannot be located.'));
});

app.use(function(err, req, res, next) {
    res.status(err.code || 500);

    var body;
    try{
        body = JSON.parse(err.body);
    }
    catch(e){            
        body = err.body;
    }

    var message = err.message || 'Unknown error';
    if (body && body.message){
        message = body.message;
    }

    if (app.get('env') === 'development') {
        res.json({ message : message, stack : err.stack });
    }
    else{
        res.json({ message : message });
    }
});

var port = process.env.PORT || config.userAuthServicePort;
var server = app.listen(port, function(){
    console.log('http://localhost:' + server.address().port + '/');
});
