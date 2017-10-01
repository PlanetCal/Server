'use strict'

var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var request = require('request-promise');
var uuid = require('node-uuid');
var path = require('path');
var qs = require('qs');

var app = express();

var serviceNames = require('../common/constants.json')['serviceNames'];
var urlNames = require('../common/constants.json')['urlNames'];
var Logger = require('../common/logger.js').Logger;
var logger = new Logger(serviceNames.apiServiceName, null, app.get('env') === 'development');
var accesslogger = require('../common/accesslogger.js');
var etag = require('etag');
app.use(accesslogger.getAccessLogger(logger));

var config = require('../common/config.json')[app.get('env') || 'production'];
require('./apiservicepassport.js')(passport, config, logger);
var cors = require('cors');
var loginController = require('./routes/logincontroller.js')(config, logger);
var userAuthController = require('./routes/userauthcontroller.js')(config, logger);
var userDetailsController = require('./routes/userdetailscontroller.js')(config, logger);
var blobController = require('./routes/blobcontroller.js')(config, logger);
var eventsController = require('./routes/eventscontroller.js')(config, logger);
var groupsController = require('./routes/groupscontroller.js')(config, logger);
var grouplinksController = require('./routes/grouplinkscontroller.js')(config, logger);
var corsController = require('./routes/corscontroller.js')(config, logger);
var helpers = require('../common/helpers.js');
var BadRequestException = require('../common/error.js').BadRequestException;
var NotFoundException = require('../common/error.js').NotFoundException;
var ForbiddenException = require('../common/error.js').ForbiddenException;
var UnauthorizedException = require('../common/error.js').UnauthorizedException;
var HttpRequestException = require('../common/error.js').HttpRequestException;
var errorcode = require('../common/errorcode.json');
var util = require('util');

logger.get().debug('Starting %s.....', serviceNames.apiServiceName);

app.set('view engine', 'ejs');

app.use(passport.initialize());

// enable CORS for all requests first
app.use('/', corsController);

// attach activity id to all requests and use bodyparser to parse body
app.use('/', bodyParser.json(), function (req, res, err, next) {
    if (err) {
        throw new BadRequestException('Invalid Body', errorcode.InvalidBody);
    }
    else {
        var activityid = uuid.v4();
        req.headers['activityid'] = activityid;
        logger.get().debug({ req: req }, 'Attach ActivityId %s to request.', activityid);
        next();
    }
});

var defaultCorsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
    exposedHeaders: ['Version'],
    optionsSuccessStatus: 200,
    preflightContinue: true,
    credentials: true
};


// all requests are subject to version header check
app.use('/', cors(defaultCorsOptions), function (req, res, next) {
    if (!req.headers['version'] && !req.query.version) {
        throw new BadRequestException('Cannot find version.', errorcode.VersionNotFound);
    }
    else {
        next();
    }
});

var getEventsCorsOptions = {
    origin: '*',
    methods: ['GET'],
    allowedHeaders: ['Content-Type'],
    exposedHeaders: ['Version'],
    optionsSuccessStatus: 200,
    preflightContinue: true,
    credentials: true
};

// anonymous events retrieval
app.get('/eventsanonymous', cors(getEventsCorsOptions), helpers.wrap(function* (req, res, next) {
    var queryString = qs.stringify(req.query);


    var url = config.eventsServiceEndpoint + '/' + urlNames.events;
    if (queryString && queryString.length > 0) {
        url += '?' + queryString;
    }
    var options = helpers.getRequestOption(req, url, 'GET');
    var results = yield* helpers.forwardHttpRequest(options, serviceNames.eventsServiceName);
    res.setHeader('Etag', etag(results));
    res.status(200).json(JSON.parse(results));
}));

app.use('/login', loginController);

var userAuthCorsOptions = {
    origin: '*',
    methods: ['POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
    exposedHeaders: ['Version'],
    optionsSuccessStatus: 200,
    preflightContinue: true,
    credentials: true
};

// forward this to userAuth service before token authenication
// kicks in because this is userAuth creation
app.post('/userauth', cors(userAuthCorsOptions), helpers.wrap(function* (req, res) {
    var options = helpers.getRequestOption(req, config.userAuthServiceEndpoint + '/userauth', 'POST');
    var results = yield* helpers.forwardHttpRequest(options, serviceNames.userAuthServiceName);
    res.status(200).json(JSON.parse(results));
}));

// forward this to userAuth service before token authenication
// kicks in because this is userAuth get. IT is to validate the email id.
app.get('/userauth/:id', cors(userAuthCorsOptions), helpers.wrap(function* (req, res) {
    var options = helpers.getRequestOption(req, config.userAuthServiceEndpoint + '/userauth/' + req.params.id, 'GET');
    var results = yield* helpers.forwardHttpRequest(options, serviceNames.userAuthServiceName);
    res.status(200).json(JSON.parse(results));
}));

app.put('/userauth', cors(userAuthCorsOptions), helpers.wrap(function* (req, res) {
    var options = helpers.getRequestOption(req, config.userAuthServiceEndpoint + '/userauth', 'PUT');
    var results = yield* helpers.forwardHttpRequest(options, serviceNames.userAuthServiceName);
    res.status(200).json(JSON.parse(results));
}));

// all other urls - all APIs are subject to token authentication
app.use('/*', cors(defaultCorsOptions), passport.authenticate('token-bearer', { session: false }),
    function (req, res, next) {
        if (!req || !req.user) {
            // token authentication fail.
            return new UnauthorizedException('Token authentication failed.', errorcode.LoginFailed);
        }
        else {
            // set auth-identity header so that internal services
            // know the caller's identity
            req.headers['auth-identity'] = req.user.id;
            req.headers['auth-email'] = req.user.email;
            req.headers['auth-name'] = req.user.name;
            logger.get().debug({ req: req }, 'Attach auth-identity %s to request header.', req.user);
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
app.use('/grouplinks', grouplinksController);
app.use('/blob', blobController);

// error handling for other routes
app.use(function (req, res, next) {
    next(new NotFoundException('Resource specified by URL cannot be located.', errorcode.GenericNotFoundException));
});

app.use(function (err, req, res, next) {
    helpers.handleServiceException(err, req, res, serviceNames.apiServiceName, logger, app.get('env') === 'development');
});

var port = process.env.PORT || config.apiServicePort;
var server = app.listen(port, function () {
    logger.get().debug('%s started at http://localhost:%d/', serviceNames.apiServiceName, server.address().port);
});
