'use strict'

var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var request = require('request-promise');
var uuid = require('node-uuid');
var app = express();

var config = require('../common/config.json')[app.get('env')];
require('./apiservicepassport.js')(passport, config);
var login = require('./routes/logincontroller.js')(config);
var userAuthController = require('./routes/userauthcontroller.js')(config);
var userDetailsController = require('./routes/userdetailscontroller.js')(config);
var eventsController = require('./routes/eventscontroller.js')(config);
var groupsController = require('./routes/groupscontroller.js')(config);
var corsController = require('./routes/corscontroller.js')(config);
var cors = require('cors');
var helpers = require('../common/helpers.js');
var BadRequestException = require('../common/error.js').BadRequestException;
var NotFoundException = require('../common/error.js').NotFoundException;
var ForbiddenException = require('../common/error.js').ForbiddenException;
var UnauthorizedException = require('../common/error.js').UnauthorizedException;
var VersionNotFoundException = require('../common/error.js').VersionNotFoundException;
var HttpRequestException = require('../common/error.js').HttpRequestException;

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

// enable CORS for all requests first
app.use('/', corsController);


// then, all requests are subject to version header check
app.use('/', function (req, res, next){
    console.log('[APIService]: ');
    if (!req.headers['version']){
        throw new VersionNotFoundException('Cannot find version in header.');
    }
    else{
        req.headers['activityid'] = uuid.v4();;
        next();
    }
});

app.get('/', function(req, res){
    res.render('index', { isAuthenticated: req.isAuthenticated(), user: req.user });
});

// login
app.use('/login', login);

var corsOptions = {
    origin : '*', 
    methods : ['POST', 'PUT', 'DELETE'],
    allowedHeaders : ['Content-Type'],
    exposedHeaders : ['Version'],
    optionsSuccessStatus : 200,
    preflightContinue : true,
    credentials : true
};

// forward this to userAuth service before token authenication
// kicks in because this is userAuth creation
app.post('/userauth', cors(corsOptions), helpers.wrap(function *(req, res){
    var options = helpers.getRequestOption(req, config.userAuthServiceEndpoint + '/userauth', 'POST'); 
    var results = yield *helpers.forwardHttpRequest(options, 'UserAuthService');
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
app.use('/userauth', userAuthController);
app.use('/userdetails', userDetailsController);
app.use('/events', eventsController);
app.use('/groups', groupsController);

// error handling for other routes
app.use(function(req, res, next) {
    next(new NotFoundException('Resource specified by URL cannot be located.'));
});

app.use(function(err, req, res, next) {
    err.serviceName = 'APIService';
    err.activityId = req.headers['activityid'];

    res.status(err.code || 500).json(helpers.constructResponseJsonFromExceptionRecursive(
        err, 
        //app.get('env' === 'development')));
        true));
});

var port = process.env.PORT || config.apiServicePort;
var server = app.listen(port, function(){
    console.log('http://localhost:' + server.address().port + '/');
});
