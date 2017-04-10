'use strict'

var router = require('express').Router();
var request = require('request-promise');
var config = require('../../common/config.js');
var bodyParser = require('body-parser');
var helpers = require('../../common/helpers.js');
var cors = require('cors');

module.exports = function(){

    var serviceName = 'UserAuthService';

    var corsOptions = {
      origin : '*', 
      methods : ['GET', 'POST'],
      allowedHeaders : ['Content-Type'],
      exposedHeaders : ['Version'],
      optionsSuccessStatus : 200,
      preflightContinue : true,
      credentials : true
    };
    
    router.get('/', cors(corsOptions), helpers.wrap(function *(req, res){
        res.render('login');
    }));

    router.post('/', cors(corsOptions), helpers.wrap(function *(req, res){
        console.log('[APIService|logincontroller]: ');
        var options = helpers.getRequestOption(req, config.userAuthServiceEndpoint + '/login', 'POST');
        var results = yield *helpers.forwardHttpRequest(options, serviceName);
        res.status(200).json(JSON.parse(results));
    }));

    return router;  
}
