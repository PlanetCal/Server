'use strict'

var express = require('express');
var app = express();
var argv = require('minimist')(process.argv.slice(2));
var env = argv['env'] || 'production';
app.set('env', env);
console.log("environment = %s", app.get('env'));

var constants = require('./common/constants.json')['serviceNames'];
var Logger = require('./common/logger.js').Logger;
var logger = new Logger(constants.groupsServiceName, null, true);
var accesslogger = require('./common/accesslogger.js');

logger.get().debug('Starting %s.....', constants.groupsServiceName);

app.use(accesslogger.getAccessLogger(logger));

var bodyParser = require('body-parser');
var config = require('./common/config.json')[app.get('env') || 'production'];
var helpers = require('./common/helpers.js');
var groupsController = require('./routes/groupscontroller.js')(config, logger);
var BadRequestException = require('./common/error.js').BadRequestException;
var ForbiddenException = require('./common/error.js').ForbiddenException;
var NotFoundException = require('./common/error.js').NotFoundException;
var errorcode = require('./common/errorcode.json');

app.set('view engine', 'ejs');

app.use(bodyParser.json());

app.use('/groups', groupsController);

// error handling for other routes
app.use(function (req, res, next) {
    next(new NotFoundException('Resource specified by URL cannot be located.', errorcode.GenericNotFoundException));
});

app.use(function (err, req, res, next) {
    helpers.handleServiceException(err, req, res, constants.groupsServiceName, logger, true);
});

var port = process.env.PORT || config.groupsServicePort;
var server = app.listen(port, function () {
    logger.get().debug('%s started at http://localhost:%d/', constants.groupsServiceName, server.address().port);
});
