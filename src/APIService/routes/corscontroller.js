'use strict'

var router = require('express').Router();
var config = require('../../common/config.js');
var helpers = require('../../common/helpers.js');
var cors = require('cors');

module.exports = function(){
    
    var corsOptions = {
      origin: '*',
      allowedHeaders : ['Content-Type', 'Authorization'],
      exposedHeaders : ['Version']
    };

    corsOptions.method = ['POST'];

    router.all('/login/*', cors(corsOptions));

    corsOptions.method = ['POST', 'PUT', 'DELETE'];

    router.all('/userauth/*', cors(corsOptions));

    corsOptions.method = ['GET', 'POST', 'PUT', 'DELETE'];

    router.all('/userdetails/*', cors(corsOptions));

    router.all('/groups/*', cors(corsOptions));

    router.all('/events/*', cors(corsOptions));

    return router;  
}
