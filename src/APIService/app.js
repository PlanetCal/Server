'use strict'

var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var request = require('request-promise');
var uuid = require('node-uuid');
var app = express();

var config = require('../common/config.js');
var login = require('./routes/logincontroller.js')();
require('./apiservicepassport.js')(passport);
var userAuth = require('./routes/userauthcontroller.js')();
var userDetails = require('./routes/userdetailscontroller.js')();
var events = require('./routes/eventscontroller.js')();
var groups = require('./routes/groupscontroller.js')();

var helpers = require('../common/helpers.js');
var BadRequestException = require('../common/error.js').BadRequestException;
var NotFoundException = require('../common/error.js').NotFoundException;
var ForbiddenException = require('../common/error.js').ForbiddenException;
var UnauthorizedException = require('../common/error.js').UnauthorizedException;
var VersionNotFoundException = require('../common/error.js').VersionNotFoundException;
var APIServiceException = require('../common/error.js').APIServiceException;
var cors = require('cors');

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

app.use('/*', function (req, res, next){
    if (!req.headers['version']){
        console.log('version: ' + req.headers.version);
        throw new VersionNotFoundException('Cannot find version in header.');
    }
    else{
        req.headers['activityid'] = uuid.v4();;
        next();
    }
});

// router set up
// root
app.get('/', function(req, res){
    res.render('index', { isAuthenticated: req.isAuthenticated(), user: req.user });
});

// login
app.use('/login', login);

var corsOptions = {
    origin: '*'
};

// forward this to userAuth service before token authenication
// kicks in because this is userAuth creation
app.post('/userauth', cors(corsOptions), helpers.wrap(function *(req, res){
    var options = helpers.getRequestOption(req, config.userAuthServiceEndpoint + '/userauth', 'POST'); 
    var results = yield request(options);

    res.status(200).json(JSON.parse(results));
}));

// all other urls - all APIs are subject to token authentication
app.use('/*', passport.authenticate('token-bearer', { session: false }),
    function (req, res, next){
        if (!req || !req.user){
            // token authentication fail.
            return new UnauthorizedException('Token authentication failed.');
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
    next(new NotFoundException('Resource specified by URL cannot be located.'));
});

app.use(function(err, req, res, next) {
    var wrappedException = new APIServiceException(req, 'Unable to process request from APIService.', err.code, err);
    res.status(err.code || 500).json(helpers.constructResponseJsonFromExceptionRecursive(app, err));
});

var port = process.env.PORT || config.apiServicePort;
var server = app.listen(port, function(){
    console.log('http://localhost:' + server.address().port + '/');
});
