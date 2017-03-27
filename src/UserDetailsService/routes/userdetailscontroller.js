'use strict'

var express = require('express');
var router = express.Router();
var config = require('../../common/config.js');
var request = require('request-promise');

var databaseName = config.documentdbDatabaseName;
var collectionName = config.userDetailsCollectionName;
var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
var dal = new DataAccessLayer(databaseName, collectionName);
var helpers = require('../../common/helpers.js');
var BadRequestError = require('../../common/error.js').BadRequestError;
var ForbiddenError = require('../../common/error.js').ForbiddenError;
var NotFoundError = require('../../common/error.js').NotFoundError;

router.get('/:id/events', helpers.wrap(function *(req, res) {
    var querySpec = {
        query: "SELECT a.id, a.email, a.name, a.followingGroups FROM root a WHERE a.id = @id",
        parameters: [
            {
                name: '@id',
                value: req.params.id
            }
        ]
    };

    checkCallerPermission(req, req.params.id);

    var documentResponse = yield dal.get(querySpec);

    var results = documentResponse.feed;
    if (results.length > 0){
        var result = results[0];
        var groupIds = result.followingGroups.join('|');
        var options = helpers.getRequestOption(req, config.eventsServiceEndpoint + '/events?groupids=' + groupIds, 'GET');
        var events = yield request(options);

        if (events.length > 0){
            result.events = JSON.parse(events);
        }
        else{
            result.events = [];
        }

        res.status(200);
        res.send(result);
    }
    else{
        throw new NotFoundError('UserDetails with id ' + req.params.id + ' not found.');
    }
}));

router.get('/:id', helpers.wrap(function *(req, res) {
    var querySpec = {
        query: "SELECT a.id, a.email, a.name, a.followingGroups FROM root a WHERE a.id = @id",
        parameters: [
            {
                name: '@id',
                value: req.params.id
            }
        ]
    };

    checkCallerPermission(req, req.params.id);

    var documentResponse = yield dal.get(querySpec);

    var results = documentResponse.feed;
    if (results.length > 0){
        var result = results[0];
        res.status(200);
        res.send(result);
    }
    else{
        throw new NotFoundError('UserDetails with id ' + req.params.id + ' not found.');
    }
}));

router.put('/:id', helpers.wrap(function *(req, res) {
    if (!req.body) {
        throw new BadRequestError('Empty body.');
    }
    var userDetails = req.body;
    if (!userDetails) {
        throw new BadRequestError('UserDetails object is not found in body.');
    }

    checkCallerPermission(req, req.params.id);
    checkCallerPermission(req, req.body.id);

    var documentResponse = yield dal.update(req.params.id, userDetails);

    res.status(200);
    res.json({ id : documentResponse.resource.id });
}));

router.post('/', helpers.wrap(function *(req, res) {
    if (!req.body) {
        throw new BadRequestError('Empty body.');
    }
    var userDetails = req.body;
    if (!userDetails) {
        throw new BadRequestError('UserDetails object is not found in body.');
    }

    checkCallerPermission(req, req.body.id);

    var documentResponse = yield dal.insert(userDetails, {});

    res.status(200);
    res.json({ id : documentResponse.resource.id });
}));

router.delete('/:id', helpers.wrap(function * (req, res) {
    checkCallerPermission(req, req.params.id);

    var documentResponse = yield dal.remove(req.params.id);

    res.status(200);
    res.json({ id : req.params.id });                    
}));

function checkCallerPermission(req, id){
    if (req.headers['auth-identity'] !== id){
        throw new ForbiddenError('Forbidden');
    } 
}
module.exports = router;