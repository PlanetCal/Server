'use strict'

var config = require('../../common/config.js');
var router = require('express').Router();
var request = require('request-promise');
var helpers = require('../../common/helpers.js');

module.exports = function(){

    router.get('/:id', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + '/userdetails/' + req.params.id, 'GET'); 
        var results = yield request(options);
        res.status(200);
        res.json(JSON.parse(results));
    }));

    router.get('/:id/events', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + '/userdetails/' + req.params.id + '/events', 'GET'); 
        var results = yield request(options);
        res.status(200);
        res.json(JSON.parse(results));
    }));

    router.post('/', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + '/userdetails', 'POST'); 
        var results = yield request(options);
        res.status(201);
        res.json(JSON.parse(results));
    }));

    router.put('/:id', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req,  config.userDetailsServiceEndpoint + '/userdetails/' + req.params.id, 'PUT'); 
        var results = yield request(options);
        res.status(200);
        res.json({id : req.params.id});
    }));

    router.delete('/:id', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req,  config.userDetailsServiceEndpoint + '/userdetails/' + req.params.id, 'DELETE'); 
        var results = yield request(options);
        res.status(200);
        res.json({id : req.params.id});
    }));

    return router;  
}
