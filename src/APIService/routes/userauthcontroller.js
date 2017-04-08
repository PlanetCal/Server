'use strict'

var config = require('../../common/config.js');
var router = require('express').Router();
var request = require('request-promise');
var helpers = require('../../common/helpers.js');
var cors = require('cors');
var HttpRequestException = require('../../common/error.js').HttpRequestException;

module.exports = function(){

    var serviceName = 'UserAuthService';
    
    var corsOptions = {
      origin: '*',
      method: ['POST', 'PUT', 'DELETE']
    };

    router.options('*', cors(corsOptions));

    router.put('/:id', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, config.userAuthServiceEndpoint + '/userauth/' + req.params.id, 'PUT'); 
        var results = yield *helpers.forwardHttpRequest(options, serviceName);
        res.status(200).json(JSON.parse(results));
    }));

    router.delete('/:id', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req,  config.userAuthServiceEndpoint + '/userauth/' + req.params.id, 'DELETE'); 
        var results = yield *helpers.forwardHttpRequest(options, serviceName);
        res.status(200).json({id : req.params.id});
    }));

    return router;  
}