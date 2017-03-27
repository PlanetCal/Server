'use strict'

var express = require('express');
var bodyParser = require('body-parser');
var Groups = require('./routes/groupscontroller.js');
var config = require('../common/config.js');
var helpers = require('../common/helpers.js');
var BadRequestError = require('../common/error.js').BadRequestError;
var ForbiddenError = require('../common/error.js').ForbiddenError;
var NotFoundError = require('../common/error.js').NotFoundError;

var app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/groups', Groups);

app.use(function(err, req, res, next) {
    return helpers.handleError(res, err, next);
});

// error handling for other routes
app.use(function(req, res, next) {
    var err = helpers.createError(404, 'Resource specified by URL cannot be located.');
    next(err);
});

app.use(function(err, req, res, next) {
    res.status(err.code || 500);

    var body;
    try{
        body = JSON.parse(err.body);
    }
    catch(e){            
        body = err.body;
    }

    var message = err.message || 'Unknown error';
    if (body && body.message){
        message = body.message;
    }

    if (app.get('env') === 'development') {
        res.json({ message : message, stack : err.stack });
    }
    else{
        res.json({ message : message });
    }
});

var port = process.env.PORT || config.groupsServicePort;
var server = app.listen(port, function(){
    console.log('http://localhost:' + server.address().port + '/');
});
