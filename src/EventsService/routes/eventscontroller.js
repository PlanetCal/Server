'use strict'

var express = require('express');
var router = express.Router();
var config = require('../../common/config.js');

var databaseName = config.documentdbDatabaseName;
var collectionName = config.eventsCollectionName;
var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
var dal = new DataAccessLayer(databaseName, collectionName);
var helpers = require('../../common/helpers.js');
var BadRequestError = require('../../common/error.js').BadRequestError;
var ForbiddenError = require('../../common/error.js').ForbiddenError;
var NotFoundError = require('../../common/error.js').NotFoundError;

router.get('/:id', helpers.wrap(function *(req, res) {
    var documentResponse = yield findEventByEventId(req.params.id);
    var results = documentResponse.feed;

    if (results.length <= 0){
        throw new NotFoundError('Event with id ' + req.params.id + ' not found.');
    }

    res.status(200);
    // TODO: assert when results has more than 1 element.
    res.send(results[0]);
}));

router.get('/', helpers.wrap(function *(req, res) {
    if (!req.query) {
        throw new BadRequestError('Query string is invalid.');
    }

    if (!req.query.groupids) {
        throw new BadRequestError('GroupIds not found in query string.');
    }
    else{
        var groupids = req.query.groupids.split('|');
        var documentResponse = yield findEventsByGroupsIds(groupids);
        var results = documentResponse.feed;
        var filteredResults = helpers.removeDuplicatedItemsById(results);

        res.status(200);
        // TODO: assert when results has more than 1 element.
        res.send(filteredResults);
    }
}));

router.put('/:id', helpers.wrap(function *(req, res) {
    if (!req.body) {
        throw new BadRequestError('Empty body.');
    }
    var event = req.body;
    if (!event) {
        throw new BadRequestError('Event is not found in body.');
    }
    
    /*
    if (event['ownedById'] !== req.headers['auth-identity']){
        throw new ForbiddenError('Forbidden');
    }
    */
    var documentResponse = yield dal.update(req.params.id, event);
    res.status(200);
    res.send({ id : documentResponse.resource.id });
}));

router.post('/', helpers.wrap(function *(req, res) {
    if (!req.body) {
        throw new BadRequestError('Empty body.');
    }
    var event = req.body;
    if (!event) {
        throw new BadRequestError('Event is not found in body.');
    }

    /*
    event['createdById'] = req.headers['auth-identity'];
    event['ownedById'] = req.headers['auth-identity'];
    */

    var documentResponse = yield dal.insert(event, {});
    res.status(200);
    res.send({ id : documentResponse.resource.id });
}));

router.delete('/:id', helpers.wrap(function *(req, res) {
    var documentResponse = yield dal.remove(req.params.id);
    res.status(200);
    res.send({ id : req.params.id });
}));

function findEventByEventId(eventId) {
    var querySpec = {
        query: "SELECT e.createdById, e.ownedByIds, e.id, e.name, e.eventType FROM e WHERE e.id = @eventId",
        parameters: [
            {
                name: '@eventId',
                value: eventId
            }
        ]
    };

    console.log('eventid ' + eventId);
    return dal.get(querySpec);
}

function findEventsByGroupsIds(groupsIds) {

    var queryString = "SELECT e.owningGroups, e.id, e.name FROM root e JOIN g IN e.owningGroups WHERE ARRAY_CONTAINS(@groupsIds, g)";
        
    var parameters = [
        {
            name: "@groupsIds",
            value: groupsIds
        }
    ];

    var querySpec = {
        query: queryString,
        parameters: parameters
    };

    return dal.get(querySpec);
}

module.exports = router;