"use strict"

var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var apiServicePassport = require('./apiservicepassport.js')(passport);

var app = express();

var events = require('./routes/events.js');

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

app.get('/', function(req, res){
    res.render('index', { isAuthenticated: req.isAuthenticated(), user: req.user });
});

app.get('/login', function(req, res){
    res.render('login');
});

app.post('/login', passport.authenticate('local'), function(req, res){
    res.redirect('/');
});

app.use('/events',  events);

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

var port = process.env.PORT || 1337;
app.listen(port, function(){
    console.log('http://127.0.0.1:' + port + '/');
});
