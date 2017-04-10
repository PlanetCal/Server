'use strict'

var config = require('../../common/config.js');
var router = require('express').Router();
var request = require('request-promise');
var helpers = require('../../common/helpers.js');
var cors = require('cors');

module.exports = function(){

    var serviceName = 'UserDetailsService';
    
    var corsOptions = {
      origin : '*', 
      methods : ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders : ['Content-Type', 'Authorization'],
      exposedHeaders : ['Version'],
      optionsSuccessStatus : 200,
      preflightContinue : true,
      credentials : true
    };

    router.get('/:id', cors(corsOptions), helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + '/userdetails/' + req.params.id, 'GET'); 
        var results = yield *helpers.forwardHttpRequest(options, serviceName);
        res.status(200).json(JSON.parse(results));
    }));

    router.get('/:id/events', cors(corsOptions),helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + '/userdetails/' + req.params.id + '/events', 'GET'); 
        var results = yield *helpers.forwardHttpRequest(options, serviceName);
        res.status(200).json(JSON.parse(results));
    }));

    router.post('/', cors(corsOptions),helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + '/userdetails', 'POST'); 
        var results = yield *helpers.forwardHttpRequest(options, serviceName);
        res.status(201).json(JSON.parse(results));
    }));

    router.put('/:id', cors(corsOptions), helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req,  config.userDetailsServiceEndpoint + '/userdetails/' + req.params.id, 'PUT'); 
        var results = yield *helpers.forwardHttpRequest(options, serviceName);
        res.status(200).json({id : req.params.id});
    }));

    router.delete('/:id', cors(corsOptions),helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req,  config.userDetailsServiceEndpoint + '/userdetails/' + req.params.id, 'DELETE'); 
        var results = yield *helpers.forwardHttpRequest(options, serviceName);
        res.status(200).json({id : req.params.id});
    }));

    return router;  
}