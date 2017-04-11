'use strict'

module.exports = function(config){
    var express = require('express');
    var router = express.Router();

    var databaseName = config.documentdbDatabaseName;
    var collectionName = config.eventsCollectionName;
    var documentdbEndpoint = config.documentdbEndpoint;
    var documentdbAuthKey = config.documentdbAuthKey;
    var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
    var dal = new DataAccessLayer(databaseName, collectionName, documentdbEndpoint, documentdbAuthKey);

    var helpers = require('../../common/helpers.js');
    
    var BadRequestException = require('../../common/error.js').BadRequestException;
    var ForbiddenException = require('../../common/error.js').ForbiddenException;
    var NotFoundException = require('../../common/error.js').NotFoundException;

    router.get('/:id', helpers.wrap(function *(req, res) {
        var fields 
        if (req.query.fields){
            fields = req.query.fields.split('|');
        }
        var documentResponse = yield findEventByEventIdAsync(req.params.id, fields);
        var results = documentResponse.feed;

        if (results.length <= 0){
            throw new NotFoundException('Event with id ' + req.params.id + ' not found.');
        }

        // TODO: assert when results has more than 1 element.
        res.status(200).json(results[0]);
    }));

    router.get('/', helpers.wrap(function *(req, res) {
        if (!req.query) {
            throw new BadRequestException('Query string is invalid.');
        }

        if (!req.query.groupids) {
            throw new BadRequestException('GroupIds not found in query string.');
        }
        else{
            var fields 
            if (req.query.fields){
                fields = req.query.fields.split('|');
            }
            var groupids = req.query.groupids.split('|');
            var documentResponse = yield findEventsByGroupsIdsAsync(groupids, fields);
            var results = documentResponse.feed;
            var filteredResults = helpers.removeDuplicatedItemsById(results);

            res.status(200).json(filteredResults);
        }
    }));

    router.put('/:id', helpers.wrap(function *(req, res) {
        if (!req.body) {
            throw new BadRequestException('Empty body.');
        }
        var event = req.body;
        if (!event) {
            throw new BadRequestException('Event is not found in body.');
        }
        
        /*
        if (event['ownedById'] !== req.headers['auth-identity']){
            throw new BadRequestException('Forbidden');
        }
        */
        var documentResponse = yield dal.updateAsync(req.params.id, event);
        res.status(200).json({ id : documentResponse.resource.id });
    }));

    router.post('/', helpers.wrap(function *(req, res) {
        if (!req.body) {
            throw new BadRequestException('Empty body.');
        }
        var event = req.body;
        if (!event) {
            throw new BadRequestException('Event is not found in body.');
        }

        /*
        event['createdById'] = req.headers['auth-identity'];
        event['ownedById'] = req.headers['auth-identity'];
        */

        var documentResponse = yield dal.insertAsync(event, {});
        res.status(200).json({ id : documentResponse.resource.id });
    }));

    router.delete('/:id', helpers.wrap(function *(req, res) {
        var documentResponse = yield dal.removeAsync(req.params.id);
        res.status(200).json({ id : req.params.id });
    }));
    return router;
}

function findEventByEventIdAsync(eventId, fields) {
    var constraints = helpers.convertFieldSelectionToConstraints('e', fields);
    console.log('constraints: ' + constraints);
    var querySpec = {
        query: "SELECT e.id" + constraints + " FROM e WHERE e.id = @eventId",
        parameters: [
            {
                name: '@eventId',
                value: eventId
            }
        ]
    };

    return dal.getAsync(querySpec);
}

function findEventsByGroupsIdsAsync(groupsIds) {
    var constraints = helpers.convertFieldSelectionToConstraints('e', fields);
    var parameters = [
        {
            name: "@groupsIds",
            value: groupsIds
        }
    ];

    var querySpec = {
        query: "SELECT e.id" + constraints + " FROM root e JOIN g IN e.owningGroups WHERE ARRAY_CONTAINS(@groupsIds, g)",
        parameters: parameters
    };
    return dal.getAsync(querySpec);
}
