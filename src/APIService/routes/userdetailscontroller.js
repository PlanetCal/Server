'use strict'

module.exports = function(config){
    var router = require('express').Router();
    var request = require('request-promise');
    var cors = require('cors');

    var helpers = require('../../common/helpers.js');

    var userDetailsServiceName = 'UserDetailsService';
    var eventsServiceName = "EventsService";
    
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
        var results = yield *helpers.forwardHttpRequest(options, userDetailsServiceName);
        res.status(200).json(JSON.parse(results));
    }));

    router.get('/:id/events', cors(corsOptions),helpers.wrap(function *(req, res){
        var userDetailsRequestOptions = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + '/userdetails/' + req.params.id, 'GET'); 
        var results = yield *helpers.forwardHttpRequest(userDetailsRequestOptions, userDetailsServiceName);

        var events;
        // userDetailsRequestOptions must not be undefined
        // we need to retrieve events given userDetails.
        if (results.followingGroups && results.followingGroups.length > 0){
            var groupIds = results.followingGroups.join('|');
            var eventsRquestOptions = helpers.getRequestOption(req, config.eventsServiceEndpoint + '/events?groupids=' + groupIds, 'GET');
            events = yield *helpers.forwardHttpRequest(eventsRquestOptions, eventsServiceName);
        }

        if (events && events.length > 0){
            results.events = JSON.parse(events);
        }

        res.status(200).json(JSON.parse(results));
    }));

    router.post('/', cors(corsOptions),helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + '/userdetails', 'POST'); 
        var results = yield *helpers.forwardHttpRequest(options, userDetailsServiceName);
        res.status(201).json(JSON.parse(results));
    }));

    router.put('/:id', cors(corsOptions), helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req,  config.userDetailsServiceEndpoint + '/userdetails/' + req.params.id, 'PUT'); 
        var results = yield *helpers.forwardHttpRequest(options, userDetailsServiceName);
        res.status(200).json({id : req.params.id});
    }));

    router.delete('/:id', cors(corsOptions),helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req,  config.userDetailsServiceEndpoint + '/userdetails/' + req.params.id, 'DELETE'); 
        var results = yield *helpers.forwardHttpRequest(options, userDetailsServiceName);
        res.status(200).json({id : req.params.id});
    }));

    return router;  
}