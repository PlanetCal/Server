'use strict'

module.exports = function (config, logger) {
    var router = require('express').Router();
    var request = require('request-promise');
    var cors = require('cors');
    var etag = require('etag');

    var serviceNames = require('../../common/constants.json')['serviceNames'];
    var urlNames = require('../../common/constants.json')['urlNames'];

    var helpers = require('../../common/helpers.js');

    var corsOptions = {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['Version'],
        optionsSuccessStatus: 200,
        preflightContinue: true,
        credentials: true
    };

    // router.get('/:id', cors(corsOptions), helpers.wrap(function *(req, res){
    //     var options = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + '/' + urlNames.userdetails + '/' + req.params.id, 'GET'); 
    //     var results = yield *helpers.forwardHttpRequest(options, serviceNames.userDetailsServiceName);
    //     res.setHeader('Etag', etag(results));
    //     res.status(200).json(JSON.parse(results));
    // }));

    router.post('/', cors(corsOptions), helpers.wrap(function* (req, res) {
        var options = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + '/' + urlNames.blob, 'POST');
        var results = yield* helpers.forwardHttpRequest(options, serviceNames.userDetailsServiceName);
        res.status(201).json(JSON.parse(results));
    }));

    // router.delete('/:id', cors(corsOptions), helpers.wrap(function *(req, res){
    //     var options = helpers.getRequestOption(req,  config.userDetailsServiceEndpoint + '/' + urlNames.userdetails + '/' + req.params.id, 'DELETE'); 
    //     var results = yield *helpers.forwardHttpRequest(options, serviceNames.userDetailsServiceName);
    //     res.status(200).json({id : req.params.id});
    // }));

    return router;
}