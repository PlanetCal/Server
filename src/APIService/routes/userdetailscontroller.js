'use strict'

module.exports = function (config, logger) {
    var router = require('express').Router();
    var request = require('request-promise');
    var cors = require('cors');
    var etag = require('etag');
    var qs = require('qs');
    var serviceNames = require('../common/constants.json')['serviceNames'];
    var urlNames = require('../common/constants.json')['urlNames'];

    var helpers = require('../common/helpers.js');

    var corsOptions = {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['Version'],
        optionsSuccessStatus: 200,
        preflightContinue: true,
        credentials: true
    };

    router.get('/:id', cors(corsOptions), helpers.wrap(function* (req, res) {
        var options = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + '/' + urlNames.userdetails + '/' + req.params.id, 'GET');
        var results = yield* helpers.forwardHttpRequest(options, serviceNames.userDetailsServiceName);
        res.setHeader('Etag', etag(results));
        res.status(200).json(JSON.parse(results));
    }));

    router.get('/:id/events', cors(corsOptions), helpers.wrap(function* (req, res) {
        var userDetailsRequestOptions = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + '/' + urlNames.userdetails + '/' + req.params.id, 'GET');
        var results = yield* helpers.forwardHttpRequest(userDetailsRequestOptions, serviceNames.userDetailsServiceName);
        var userDetails = JSON.parse(results);

        var events;
        // userDetailsRequestOptions must not be undefined
        // we need to retrieve events given userDetails.
        if (userDetails.followingGroups && userDetails.followingGroups.length > 0) {
            var groupIds = userDetails.followingGroups.join('|');
            var getEventsUrl = config.eventsServiceEndpoint + '/' + urlNames.events + '?groupids=' + groupIds;
            var eventsRequestOptions = helpers.getRequestOption(req, getEventsUrl, 'GET');
            events = yield* helpers.forwardHttpRequest(eventsRequestOptions, serviceNames.eventsServiceName);
        }

        if (events && events.length > 0) {
            userDetails.events = JSON.parse(events);
        }

        res.setHeader('Etag', etag(results));
        res.status(200).json(userDetails);
    }));

    router.get('/:id/followingGroups', cors(corsOptions), helpers.wrap(function* (req, res) {
        var userDetailsRequestOptions = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + '/' + urlNames.userdetails + '/' + req.params.id, 'GET');
        var results = yield* helpers.forwardHttpRequest(userDetailsRequestOptions, serviceNames.userDetailsServiceName);
        var userDetails = JSON.parse(results);

        var groups = '[]';
        // userDetailsRequestOptions must not be undefined
        // we need to retrieve group details given userDetails.
        if (userDetails.followingGroups && userDetails.followingGroups.length > 0) {
            var groupIds = userDetails.followingGroups.join('|');
            var getGroupsUrl = config.groupsServiceEndpoint + '/' + urlNames.groups + '?groupids=' + groupIds;
            var queryString = qs.stringify(req.query);
            if (queryString && queryString.length > 0) {
                getGroupsUrl += '&' + queryString;
            }
            var groupsRequestOptions = helpers.getRequestOption(req, getGroupsUrl, 'GET');
            groups = yield* helpers.forwardHttpRequest(groupsRequestOptions, serviceNames.groupsServiceName);
        }
        res.setHeader('Etag', etag(groups));
        res.status(200).json(JSON.parse(groups));
    }));

    router.post('/', cors(corsOptions), helpers.wrap(function* (req, res) {
        var options = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + '/' + urlNames.userdetails + '/', 'POST');
        var results = yield* helpers.forwardHttpRequest(options, serviceNames.userDetailsServiceName);
        res.status(201).json(JSON.parse(results));
    }));

    router.put('/:id', cors(corsOptions), helpers.wrap(function* (req, res) {
        var options = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + '/' + urlNames.userdetails + '/' + req.params.id, 'PUT');
        var results = yield* helpers.forwardHttpRequest(options, serviceNames.userDetailsServiceName);
        res.status(200).json({ id: req.params.id });
    }));

    router.delete('/:id', cors(corsOptions), helpers.wrap(function* (req, res) {
        var options = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + '/' + urlNames.userdetails + '/' + req.params.id, 'DELETE');
        var results = yield* helpers.forwardHttpRequest(options, serviceNames.userDetailsServiceName);
        res.status(200).json({ id: req.params.id });
    }));

    return router;
}