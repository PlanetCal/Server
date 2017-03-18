"use strict"

var express = require('express');
var bodyParser = require('body-parser');
var Groups = require('./routes/groupscontroller.js');
var config = require('../common/config.js');
var Helpers = require('../common/helpers.js').Helpers;
var helpers = new Helpers();

var app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/groups', Groups);

// error handling for other routes
app.use(function(req, res, next) {
    var err = helpers.createError(404, 'ResourceNotFound', 'Resource specified by URL cannot be located.');
    next(err);
});

// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.send(helpers.convertErrorToJson(err, true));
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send(helpers.convertErrorToJson(err, false));
});

var port = process.env.PORT || config.groupsServicePort;
var server = app.listen(port, function(){
    console.log('http://localhost:' + server.address().port + '/');
});
