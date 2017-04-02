'use strict'

var config = require('../../common/config.js');
var router = require('express').Router();
var request = require('request-promise');
var helpers = require('../../common/helpers.js');

module.exports = function(){
    router.put('/:id', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, config.userAuthServiceEndpoint + '/userauth/' + req.params.id, 'PUT'); 
        var results = yield *callUserAuthService(options);
        res.status(200).json(JSON.parse(results));
    }));

    router.delete('/:id', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req,  config.userAuthServiceEndpoint + '/userauth/' + req.params.id, 'DELETE'); 
        var results = yield *callUserAuthService(options);
        res.status(200).json({id : req.params.id});
    }));

    return router;  
}

function *callUserAuthService (options){
    return yield request(options).catch(function(err){
        throw new APIServiceException(req, 'Request to UserAuthService failed.', 503, JSON.parse(err.error));
    });
}
