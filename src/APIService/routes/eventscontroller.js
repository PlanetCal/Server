'use strict'

var config = require('../../common/config.js');
var router = require('express').Router();
var request = require('request-promise');
var helpers = require('../../common/helpers.js');
var qs = require('qs');
var BadRequestError = require('../../common/error.js').BadRequestError;

module.exports = function(){

    var controllerName = 'events';
    var endpoint = config.eventsServiceEndpoint;

    router.get('/:id', helpers.wrap(function *(req, res){
        var url = endpoint + '/' + controllerName + '/' + req.params.id;
        if (req.query){
            url += '?' + qs.stringify(req.query);
        }
        console.log('url: ' + url);
        var options = helpers.getRequestOption(req, url, 'GET'); 
        var results = yield request(options);
        res.status(200);
        res.json(JSON.parse(results));
    }));

    router.get('/', helpers.wrap(function *(req, res){
        if (!req.query){
            throw new BadRequestError('Query string must be provided.');
        }
        var url = endpoint + '/' + controllerName + '?' + qs.stringify(req.query);
        var options = helpers.getRequestOption(req, url, 'GET'); 
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
