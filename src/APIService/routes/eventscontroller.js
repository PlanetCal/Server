'use strict'

var config = require('../../common/config.js');
var router = require('express').Router();
var request = require('request-promise');
var helpers = require('../../common/helpers.js');

module.exports = function(){

    var controllerName = 'events';
    var endpoint = config.eventsServiceEndpoint;

    router.get('/:id', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, endpoint + '/' + controllerName + '/' + req.params.id, 'GET'); 
        var results = yield request(options);
        res.status(200);
        res.json(JSON.parse(results));
    }));

    router.get('/', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, endpoint + '/' + controllerName + '?' + JSON.stringify(req.query), 'GET'); 
        var results = yield request(options);
        res.status(200);
        res.json(JSON.parse(results));
    }));

    router.post('/', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, endpoint + '/' + controllerName, 'POST'); 
        var results = yield request(options);
        res.status(200);
        res.json(JSON.parse(results));
    }));

    router.put('/:id', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req,  endpoint + '/' + controllerName + '/' + req.params.id, 'PUT'); 
        var results = yield request(options);
        res.status(200);
        res.json({id : id});
    }));

    router.delete('/:id', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req,  endpoint + '/' + controllerName + '/' + req.params.id, 'DELETE'); 
        var results = yield request(options);
        res.status(200);
        res.json({id : req.params.id});
    }));

    return router;  
}
