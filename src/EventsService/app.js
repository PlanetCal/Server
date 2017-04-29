'use strict'

var express = require('express');
var app = express();

var constants = require('../common/constants.json')['serviceNames'];
var Logger = require('../common/logger.js').Logger;
var logger = new Logger(constants.eventsServiceName, null, app.get('env') === 'development');
var accesslogger = require('../common/accesslogger.js');

logger.get().debug('Starting %s.....', constants.eventsServiceName);

app.use(accesslogger.getAccessLogger(logger));

var bodyParser = require('body-parser');
var config = require('../common/config.json')[app.get('env')];
var helpers = require('../common/helpers.js');
var eventsController = require('./routes/eventscontroller.js')(config, logger);
var BadRequestException = require('../common/error.js').BadRequestException;
var ForbiddenException = require('../common/error.js').ForbiddenException;
var NotFoundException = require('../common/error.js').NotFoundException;

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/events', eventsController);

// error handling for other routes
app.use(function(req, res, next) {
    next(new NotFoundException('Resource specified by URL cannot be located.'));
});

app.use(function(err, req, res, next) {
    err.serviceName = constants.eventsServiceName;
    err.activityId = req.headers['activityid'];

    if (err && err.code < 500){
        logger.get().info({exception : err});
    }
    else{        
        logger.get().error({exception : err});
    }

    res.status(err.code || 500).json(helpers.constructResponseJsonFromExceptionRecursive(err, true));
});

var port = process.env.PORT || config.eventsServicePort;
var server = app.listen(port, function(){
    console.log('http://localhost:' + server.address().port + '/');
});
