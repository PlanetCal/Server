"use strict"

var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var BasicHttpStrategy = require('passport-http').Strategy;
var config = require('./config.js');
var userDetails = require('./model/user.js');

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

passport.use('local', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },    
    function(req, email, password, done){

        userDetails.findOne({'email': email}, function(err, user) {
            if (err){
                return done(err, null);
            }

            if (user && user.password === password){
                return done(null, user);
            }

            return done(null, null);
    });
}));


app.get('/', function(req, res){
    res.render('index', { isAuthenticated: req.isAuthenticated(), user: req.user });
});

app.get('/login', function(req, res){
    res.render('login');
});


app.post('/login', passport.authenticate('local'), function(req, res){
    res.redirect('/');
});

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
  userDetails.findById(id, function(err, user) {
    done(err, user);
  });
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
