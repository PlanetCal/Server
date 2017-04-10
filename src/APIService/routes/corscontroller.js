'use strict'

var router = require('express').Router();
var config = require('../../common/config.js');
var helpers = require('../../common/helpers.js');
var cors = require('cors');

module.exports = function(){
    
    const origin = '*'; //TODO: For now

    var corsOptions = {
      origin : '*', 
      methods : ['GET', 'POST'],
      optionsSuccessStatus : 200
    };

    router.options('/login', cors(corsOptions));

    corsOptions = {
      origin : '*', 
      methods : ['POST', 'PUT', 'DELETE'],
      optionsSuccessStatus : 200
    };

    router.options('/userauth', cors(corsOptions));

    corsOptions = {
      origin : '*', 
      methods : ['GET', 'POST', 'PUT', 'DELETE'],
      optionsSuccessStatus : 200
    };

    router.options('/userdetails', cors(corsOptions));

    router.options('/groups', cors(corsOptions));

    router.options('/events', cors(corsOptions));

    return router;  
}
