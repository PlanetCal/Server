'use strict'

var config = require('../../common/config.js');
var router = require('express').Router();
var request = require('request-promise');
var helpers = require('../../common/helpers.js');
var qs = require('qs');
var BadRequestException = require('../../common/error.js').BadRequestException;

module.exports = function(){

    var controllerName = 'events';
    var endpoint = config.eventsServiceEndpoint;

    router.get('/:id', helpers.wrap(function *(req, res){
        var url = endpoint + '/' + controllerName + '/' + req.params.id;
        if (req.query){
            url += '?' + qs.stringify(req.query);
        }
        var options = helpers.getRequestOption(req, url, 'GET'); 
        var results = yield *callEventsService(options);
        res.status(200).json(JSON.parse(results));
    }));

    router.get('/', helpers.wrap(function *(req, res){
        if (!req.query){
            throw new BadRequestException('Query string must be provided.');
        }
        var url = endpoint + '/' + controllerName + '?' + qs.stringify(req.query);
        var options = helpers.getRequestOption(req, url, 'GET'); 
        var results = yield *callEventsService(options);
        res.status(200).json(JSON.parse(results));
    }));

    router.post('/', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, endpoint + '/' + controllerName, 'POST'); 
        var results = yield *callEventsService(options);
        res.status(200).json(JSON.parse(results));
    }));

    router.put('/:id', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req,  endpoint + '/' + controllerName + '/' + req.params.id, 'PUT'); 
        var results = yield *callEventsService(options);
        res.status(200).json({id : req.params.id});
    }));

    router.delete('/:id', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req,  endpoint + '/' + controllerName + '/' + req.params.id, 'DELETE'); 
        var results = yield *callEventsService(options);
        res.status(200).json({id : req.params.id});
    }));

    return router;  
}

function *callEventsService (options){
    return yield request(options).catch(function(err){
        throw new APIServiceException(req, 'Request to EventsService failed.', 503, JSON.parse(err.error));
    });
}
