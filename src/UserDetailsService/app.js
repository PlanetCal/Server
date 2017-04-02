'use strict'

var express = require('express');
var bodyParser = require('body-parser');
var config = require('../common/config.js');
var UserDetails = require('./routes/userdetailscontroller.js');
var helpers = require('../common/helpers.js');
var BadRequestException = require('../common/error.js').BadRequestException;
var ForbiddenException = require('../common/error.js').ForbiddenException;
var NotFoundException = require('../common/error.js').NotFoundException;
var UserDetailsServiceException = require('../common/error.js').UserDetailsServiceException;

var app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/userdetails', UserDetails);

// error handling for other routes
app.use(function(req, res, next) {
    next(new NotFoundException('Resource specified by URL cannot be located.'));
});

app.use(function(err, req, res, next) {
    var wrappedException = new UserDetailsServiceException(req, 'Unable to process request from UserDetailsService.', err.code, err);
    res.status(err.code || 500).json(wrappedException);
});

var port = process.env.PORT || config.userDetailsServicePort;
var server = app.listen(port, function(){
    console.log('http://localhost:' + server.address().port + '/');
});
