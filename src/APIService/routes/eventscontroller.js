'use strict'

module.exports = function(config, logger, app){
    var router = require('express').Router();
    var request = require('request-promise');
    var qs = require('qs');
    var cors = require('cors');
    var constants = require('../../common/constants.json')['serviceNames'];

    var helpers = require('../../common/helpers.js');
    var BadRequestException = require('../../common/error.js').BadRequestException;

    var corsOptions = {
      origin : '*', 
      methods : ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders : ['Content-Type', 'Authorization'],
      exposedHeaders : ['Version'],
      optionsSuccessStatus : 200,
      preflightContinue : true,
      credentials : true
    };

    var controllerName = 'events';
    var endpoint = config.eventsServiceEndpoint;

    router.get('/:id', cors(corsOptions), helpers.wrap(function *(req, res){
        var url = endpoint + '/' + controllerName + '/' + req.params.id;
        if (req.query){
            url += '?' + qs.stringify(req.query);
        }
        var options = helpers.getRequestOption(req, url, 'GET'); 
        var results = yield *helpers.forwardHttpRequest(options, constants.eventsServiceName);
        res.status(200).json(JSON.parse(results));
    }));

    router.get('/', cors(corsOptions), helpers.wrap(function *(req, res){

        if (!app || app.get('env') !== 'development'){
            if (!req.query) {
                throw new BadRequestException('Query string is invalid.');
            }

            if (!req.query.groupids) {
                throw new BadRequestException('GroupIds not found in query string.');
            }
        }

        var url;
        var queryString = qs.stringify(req.query);

        if (!queryString || queryString === ''){
            url = endpoint + '/' + controllerName; 
        }
        else{
            url = endpoint + '/' + controllerName + '?' + queryString;             
        }

        var options = helpers.getRequestOption(req, url, 'GET'); 
        var results = yield *helpers.forwardHttpRequest(options, constants.eventsServiceName);
        res.status(200).json(JSON.parse(results));
    }));

    router.post('/', cors(corsOptions), helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, endpoint + '/' + controllerName, 'POST'); 
        var results = yield *helpers.forwardHttpRequest(options, constants.eventsServiceName);
        res.status(200).json(JSON.parse(results));
    }));

    router.put('/:id', cors(corsOptions), helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req,  endpoint + '/' + controllerName + '/' + req.params.id, 'PUT'); 
        var results = yield *helpers.forwardHttpRequest(options, constants.eventsServiceName);
        res.status(200).json({id : req.params.id});
    }));

    router.delete('/:id', cors(corsOptions), helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req,  endpoint + '/' + controllerName + '/' + req.params.id, 'DELETE'); 
        var results = yield *helpers.forwardHttpRequest(options, constants.eventsServiceName);
        res.status(200).json({id : req.params.id});
    }));

    return router;  
}
