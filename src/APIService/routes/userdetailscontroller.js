'use strict'

var config = require('../../common/config.js');
var router = require('express').Router();
var request = require('request-promise');
var helpers = require('../../common/helpers.js');
var cors = require('cors');

module.exports = function(){

    var corsOptions = {
      origin: '*',
      method: ['GET', 'POST', 'PUT', 'DELETE']
    };

    router.options('/*', cors(corsOptions));

    router.get('/:id', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + '/userdetails/' + req.params.id, 'GET'); 
        var results = yield *callUserDetailsService(options);
        res.status(200).json(JSON.parse(results));
    }));

    router.get('/:id/events', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + '/userdetails/' + req.params.id + '/events', 'GET'); 
        var results = yield *callUserDetailsService(options);
        res.status(200).json(JSON.parse(results));
    }));

    router.post('/', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + '/userdetails', 'POST'); 
        var results = yield *callUserDetailsService(options);
        res.status(201).json(JSON.parse(results));
    }));

    router.put('/:id', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req,  config.userDetailsServiceEndpoint + '/userdetails/' + req.params.id, 'PUT'); 
        var results = yield *callUserDetailsService(options);
        res.status(200).json({id : req.params.id});
    }));

    router.delete('/:id', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req,  config.userDetailsServiceEndpoint + '/userdetails/' + req.params.id, 'DELETE'); 
        var results = yield *callUserDetailsService(options);
        res.status(200).json({id : req.params.id});
    }));

    return router;  
}

function *callUserDetailsService (options){
    return yield request(options).catch(function(err){
        throw new APIServiceException(req, 'Request to UserDetailsService failed.', 503, JSON.parse(err.error));
    });
}
