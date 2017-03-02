"use strict"

var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var passport = require('passport');

var app = express();

var UserAuth = require('./model/userauth.js');
require('./userauthpassport.js')(passport, UserAuth);
var UserLogin = require('./routes/login.js')(passport);

var PasswordCrypto = require('./passwordcrypto.js').PasswordCrypto;

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

// intercept just create user. This API is special since
// it doesn't require API token authentication
// so it has to be done before token authentication kicks in
app.post('/userauth', function(req, res) {
    if (!req.body || !req.body.email || !req.body.password){
        res.status(400);
        res.send({ 'message' : 'Invalid body'})        
    }
    else{
        var passwordCrypto = new PasswordCrypto();
        var passwordHash = passwordCrypto.generateHash(req.body.password);
        var Userauth = new UserAuth({ email: req.body.email, passwordHash: passwordHash });
        Userauth.save(function (err) {
            if (err){
                // TODO: Is it really 409? What else?
                res.status(409);
                res.send({ 'err': err.message });
            }
            else{
                res.status(201);
                res.send({ 'email' : req.body.email });
            }
        });
    }
});

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
        error: err
    });
});

var port = process.env.PORT || 1338;
var server = app.listen(port, function(){
    console.log('http://localhost:' + server.address().port + '/');
});
