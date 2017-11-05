'use strict'

var express = require('express');
var app = express();
var argv = require('minimist')(process.argv.slice(2));
var env = argv['env'] || 'production';
app.set('env', env);
console.log("environment = %s", app.get('env'));

var constants = require('./common/constants.json')['serviceNames'];
var Logger = require('./common/logger.js').Logger;
var logger = new Logger(constants.userDetailsServiceName, null, true);
var accesslogger = require('./common/accesslogger.js');

logger.get().debug('Starting %s.....', constants.userDetailsServiceName);

app.use(accesslogger.getAccessLogger(logger));

var bodyParser = require('body-parser');

var config = require('./common/config.json')[app.get('env') || 'production'];
var userDetailsController = require('./routes/userdetailscontroller.js')(config, logger);
var helpers = require('./common/helpers.js');
var BadRequestException = require('./common/error.js').BadRequestException;
var ForbiddenException = require('./common/error.js').ForbiddenException;
var NotFoundException = require('./common/error.js').NotFoundException;
var errorcode = require('./common/errorcode.json');

var constants = require('./common/constants.json')['serviceNames'];
var Logger = require('./common/logger.js').Logger;
var logger = new Logger(constants.userDetailsServiceName, null, true);
var accesslogger = require('./common/accesslogger.js');

app.use(accesslogger.getAccessLogger(logger));

app.set('view engine', 'ejs');

app.use(bodyParser.json());

app.use('/userdetails', userDetailsController);

// error handling for other routes
app.use(function (req, res, next) {
    next(new NotFoundException('Resource specified by URL cannot be located.', errorcode.GenericNotFoundException));
});

app.use(function (err, req, res, next) {
    helpers.handleServiceException(err, req, res, constants.userDetailsServiceName, logger, true);
});

var port = process.env.PORT || config.userDetailsServicePort;
var server = app.listen(port, function () {
    logger.get().debug('%s started at http://localhost:%d/', constants.userDetailsServiceName, server.address().port);
});
