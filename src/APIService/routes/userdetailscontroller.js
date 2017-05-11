'use strict'

module.exports = function(config, logger){
    var router = require('express').Router();
    var request = require('request-promise');
    var cors = require('cors');
    var etag = require('etag');

    var constants = require('../../common/constants.json')['serviceNames'];
    var helpers = require('../../common/helpers.js');
    
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
        var options = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + constants.userDetailsServiceUrlRoot + req.params.id, 'GET'); 
        var results = yield *helpers.forwardHttpRequest(options, constants.userDetailsServiceName);
        res.setHeader('Etag', etag(results));
        res.status(200).json(JSON.parse(results));
    }));

    router.get('/:id/events', cors(corsOptions), helpers.wrap(function *(req, res){
        var userDetailsRequestOptions = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + constants.userDetailsServiceUrlRoot + req.params.id, 'GET'); 
        var results = yield *helpers.forwardHttpRequest(userDetailsRequestOptions, constants.userDetailsServiceName);

        var events;
        // userDetailsRequestOptions must not be undefined
        // we need to retrieve events given userDetails.
        if (results.followingGroups && results.followingGroups.length > 0){
            var groupIds = results.followingGroups.join('|');
            var eventsRquestOptions = helpers.getRequestOption(req, config.eventsServiceEndpoint + constants.eventsServiceUrlRoot + '?groupids=' + groupIds, 'GET');
            events = yield *helpers.forwardHttpRequest(eventsRquestOptions, constants.eventsServiceName);
        }

        if (events && events.length > 0){
            results.events = JSON.parse(events);
        }

        res.setHeader('Etag', etag(results));
        res.status(200).json(results);
    }));

    router.post('/', cors(corsOptions), helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + constants.userDetailsServiceUrlRoot, 'POST'); 
        var results = yield *helpers.forwardHttpRequest(options, constants.userDetailsServiceName);
        res.status(201).json(results);
    }));

    router.put('/:id', cors(corsOptions), helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req,  config.userDetailsServiceEndpoint + constants.userDetailsServiceUrlRoot + req.params.id, 'PUT'); 
        var results = yield *helpers.forwardHttpRequest(options, constants.userDetailsServiceName);
        res.status(200).json({id : req.params.id});
    }));

    router.delete('/:id', cors(corsOptions), helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req,  config.userDetailsServiceEndpoint + constants.userDetailsServiceUrlRoot + req.params.id, 'DELETE'); 
        var results = yield *helpers.forwardHttpRequest(options, constants.userDetailsServiceName);
        res.status(200).json({id : req.params.id});
    }));

    return router;  
}