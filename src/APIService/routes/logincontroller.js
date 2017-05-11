'use strict'

module.exports = function(config, logger){
    var router = require('express').Router();
    var request = require('request-promise');
    var cors = require('cors');

    var constants = require('../../common/constants.json')['serviceNames'];
    var helpers = require('../../common/helpers.js');

    var corsOptions = {
      origin : '*', 
      methods : ['POST'],
      allowedHeaders : ['Content-Type'],
      exposedHeaders : ['Version'],
      optionsSuccessStatus : 200,
      preflightContinue : true,
      credentials : true
    };
    
    router.post('/', cors(corsOptions), helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, config.userAuthServiceEndpoint + constants.loginServiceUrlRoot, 'POST');
        var results = yield *helpers.forwardHttpRequest(options, constants.userAuthServiceName);
        res.status(200).json(JSON.parse(results));
    }));

    return router;  
}
