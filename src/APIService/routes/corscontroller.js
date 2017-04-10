'use strict'

var router = require('express').Router();
var config = require('../../common/config.js');
var helpers = require('../../common/helpers.js');
var cors = require('cors');

module.exports = function(){
    
    const origin = '*'; //TODO: For now
    const allowedHeaders = ['Content-Type', 'Authorization'];
    const exposedHeaders = ['Version'];

    var corsOptions = {
      origin : origin, 
      methods : ['POST'],
      allowedHeaders : allowedHeaders,
      exposedHeaders : exposedHeaders,
      optionsSuccessStatus : 200
    };

    router.all('/login', cors(corsOptions));

    corsOptions = {
      origin : origin, 
      methods : ['POST', 'PUT', 'DELETE'],
      allowedHeaders : allowedHeaders,
      exposedHeaders : exposedHeaders,
      optionsSuccessStatus : 200
    };

    router.all('/userauth', cors(corsOptions));

    corsOptions = {
      origin : origin, 
      methods : ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders : allowedHeaders,
      exposedHeaders : exposedHeaders,
      optionsSuccessStatus : 200
    };

    router.all('/userdetails', cors(corsOptions));

    router.all('/groups', cors(corsOptions));

    router.all('/events', cors(corsOptions));

    return router;  
}
