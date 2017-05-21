'use strict'

module.exports = function(config, loggger){
    var router = require('express').Router();
    var request = require('request-promise');
    var cors = require('cors');
    var serviceNames = require('../../common/constants.json')['serviceNames'];
    var urlNames = require('../../common/constants.json')['urlNames'];
    var helpers = require('../../common/helpers.js');
    var HttpRequestException = require('../../common/error.js').HttpRequestException;

    var corsOptions = {
      origin : '*', 
      methods : ['POST', 'PUT', 'DELETE'],
      allowedHeaders : ['Content-Type', 'Authorization'],
      exposedHeaders : ['Version'],
      optionsSuccessStatus : 200,
      preflightContinue : true,
      credentials : true
    };

    router.put('/:id', cors(corsOptions), helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, config.userAuthServiceEndpoint + '/' + urlNames.userauth + '/' + req.params.id, 'PUT'); 
        var results = yield *helpers.forwardHttpRequest(options, serviceNames.userAuthServiceName);
        res.status(200).json(JSON.parse(results));
    }));

    router.delete('/:id', cors(corsOptions), helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req,  config.userAuthServiceEndpoint + '/' + urlNames.userauth + '/' + req.params.id, 'DELETE'); 
        var results = yield *helpers.forwardHttpRequest(options, serviceNames.userAuthServiceName);
        res.status(200).json({id : req.params.id});
    }));

    return router;  
}