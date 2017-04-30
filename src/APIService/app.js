'use strict'

var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var request = require('request-promise');
var uuid = require('node-uuid');
var path = require('path');

var app = express();

var constants = require('../common/constants.json')['serviceNames'];
var Logger = require('../common/logger.js').Logger;
var logger = new Logger(constants.apiServiceName, null, app.get('env') === 'development');
var accesslogger = require('../common/accesslogger.js');

app.use(accesslogger.getAccessLogger(logger));

var config = require('../common/config.json')[app.get('env')];
require('./apiservicepassport.js')(passport, config, logger);
var loginController = require('./routes/logincontroller.js')(config, logger);
var userAuthController = require('./routes/userauthcontroller.js')(config, logger);
var userDetailsController = require('./routes/userdetailscontroller.js')(config, logger);
var eventsController = require('./routes/eventscontroller.js')(config, logger);
var groupsController = require('./routes/groupscontroller.js')(config, logger);
var corsController = require('./routes/corscontroller.js')(config, logger);
var cors = require('cors');
var helpers = require('../common/helpers.js');
var BadRequestException = require('../common/error.js').BadRequestException;
var NotFoundException = require('../common/error.js').NotFoundException;
var ForbiddenException = require('../common/error.js').ForbiddenException;
var UnauthorizedException = require('../common/error.js').UnauthorizedException;
var HttpRequestException = require('../common/error.js').HttpRequestException;

logger.get().debug('Starting %s.....', constants.apiServiceName);

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(passport.initialize());

/*
app.use('/',  function(req, res, next){
    logger.get().debug({req : req}); 
    next();  
});
*/

// enable CORS for all requests first
app.use('/', corsController);

var defaultCorsOptions = {
    origin : '*', 
    methods : ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders : ['Content-Type'],
    exposedHeaders : ['Version'],
    optionsSuccessStatus : 200,
    preflightContinue : true,
    credentials : true
};

// then, all requests are subject to version header check
app.use('/', cors(defaultCorsOptions), function (req, res, next){
    if (!req.headers['version']){
        throw new BadRequestException('Cannot find version in header.');
    }
    else{
        var activityid = uuid.v4();
        req.headers['activityid'] = activityid;
        logger.get().debug({req : req}, 'Attach ActivityId %s to request.', activityid);
        next();
    }
});

app.use('/login', loginController);

var userAuthCorsOptions = {
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
app.post('/userauth', cors(userAuthCorsOptions), helpers.wrap(function *(req, res){
    var options = helpers.getRequestOption(req, config.userAuthServiceEndpoint + '/userauth', 'POST'); 
    var results = yield *helpers.forwardHttpRequest(options, constants.userAuthServiceName);
    res.status(200).json(JSON.parse(results));
}));

// all other urls - all APIs are subject to token authentication
app.use('/*', cors(defaultCorsOptions), passport.authenticate('token-bearer', { session: false }),
    function (req, res, next){
        if (!req || !req.user){
            // token authentication fail.
            return new UnauthorizedException('Token authentication failed.');
        }
        else{
            // set auth-identity header so that internal services
            // know the caller's identity
            req.headers['auth-identity'] = req.user;
            logger.get().debug({req : req}, 'Attach auth-identity %s to request header.', req.user);
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
    err.serviceName = constants.apiServiceName;
    err.activityId = req.headers['activityid'];

    if (err && err.code < 500){
        logger.get().info({exception : err});
    }
    else{        
        logger.get().error({exception : err});
    }

    res.status(err.code || 500).json(helpers.constructResponseJsonFromExceptionRecursive(
        err, 
        app.get('env') === 'development'));
});

var port = process.env.PORT || config.apiServicePort;
var server = app.listen(port, function(){
    logger.get().debug('%s started at http://localhost:%d/', constants.apiServiceName, server.address().port);
});
