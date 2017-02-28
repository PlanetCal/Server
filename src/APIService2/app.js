"use strict"

var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var passport = require('passport');

var app = express();

var userLogin = require('./model/userlogin.js');
require('./apiservicepassport.js')(passport, userLogin);
var login = require('./routes/login.js')(passport);
var events = require('./routes/events.js')();
var users = require('./routes/users.js')();

var PasswordCrypto = require('./passwordcrypto.js').PasswordCrypto;

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

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

// intercept just create user. This API is special since
// it doesn't require API token authentication
// so it has to be done before token authentication kicks in
app.post('/users', function(req, res) {
    if (!req.body || !req.body.email || !req.body.password){
        res.status(400);
        res.send({ 'message' : 'Invalid body'})        
    }
    else{
        var passwordCrypto = new PasswordCrypto();
        var passwordHash = passwordCrypto.generateHash(req.body.password);
        var userlogin = new userLogin({ email: req.body.email, passwordHash: passwordHash });
        userlogin.save(function (err) {
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

// all other urls - all APIs are subject to token authentication
app.use('/*', passport.authenticate('token-bearer', { session: false }),
    function(req, res, next){
        if (!req || !req.user){
            // token authentication fail.
            res.json( {'message': 'Token authentication failed.'});
            res.status(503);
        }
        else{
            // continue calling middleware in line
            next();
        }
    }
);

// events
app.use('/events', events);

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

var port = process.env.PORT || 1337;
var server = app.listen(port, function(){
    console.log('http://localhost:' + server.address().port + '/');
});
