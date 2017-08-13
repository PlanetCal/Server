'use strict'


module.exports = function (config, logger) {
    var express = require('express');
    var router = express.Router();

    var helpers = require('../../common/helpers.js');
    var databaseName = config.documentdbDatabaseName;
    var collectionName = config.eventsCollectionName;
    var documentdbEndpoint = config.documentdbEndpoint;
    var documentdbAuthKey = config.documentdbAuthKey;

    var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
    var dal = new DataAccessLayer(databaseName, collectionName, documentdbEndpoint, documentdbAuthKey);

    var BadRequestException = require('../../common/error.js').BadRequestException;
    var ForbiddenException = require('../../common/error.js').ForbiddenException;
    var errorcode = require('../../common/errorcode.json');

    router.get('/:id', helpers.wrap(function* (req, res) {
        var fields = req.query.fields ? req.query.fields.split('|') : null;

        logger.get().debug({ req: req }, 'Retriving event object...');
        var documentResponse = yield findEventByEventIdAsync(dal, req.params.id, fields);
        var result = documentResponse.feed.length <= 0 ? {} : documentResponse.feed[0];

        logger.get().debug({ req: req, event: result }, 'Event object successfully retrieved.');
        // TODO: assert when results has more than 1 element.
        res.status(200).json(result);
    }));

    router.get('/', helpers.wrap(function* (req, res) {
        var fields = req.query.fields ? req.query.fields.split('|') : null;

        var groupids;
        if (req.query.groupids) {
            groupids = req.query.groupids.split('|');
        }

        var documentResponse;
        if (!groupids && !fields) {
            logger.get().debug({ req: req }, 'Retrieving all event objects...');
            documentResponse = yield findAllEvents(dal);
        }
        else {
            logger.get().debug({ req: req }, 'Retrieving event objects by ids...');
            documentResponse = yield findEventsByGroupsIdsAsync(dal, groupids, fields);
        }

        var results = documentResponse.feed;
        var filteredResults = helpers.removeDuplicatedItemsById(results);

        logger.get().debug({ req: req, events: filteredResults }, 'Event objects retrieved successfully.');
        res.status(200).json(filteredResults);
    }));

    router.put('/:id', helpers.wrap(function* (req, res) {
        // TODO: Validate event object in body         
        var event = req.body;
        event.modifiedBy = req.headers['auth-identity'];
        event.modifiedTime = (new Date()).toUTCString();

        logger.get().debug({ req: req }, 'Updating event...');
        var documentResponse = yield dal.updateAsync(req.params.id, event);
        logger.get().debug({ req: req, event: documentResponse.resource }, 'Event updated successfully.');
        res.status(200).json({ id: documentResponse.resource.id });
    }));

    router.post('/', helpers.wrap(function* (req, res) {
        var event = req.body;

        event.createdBy = req.headers['auth-identity'];
        event.createdTime = (new Date()).toUTCString();

        event.id = helpers.generateGuid();
        logger.get().debug({ req: req }, 'Creating event object...');
        var documentResponse = yield dal.insertAsync(event, {});
        logger.get().debug({ req: req, event: documentResponse.resource }, 'Event object created successfully.');
        res.status(200).json({ id: documentResponse.resource.id });
    }));

    router.post('/deleteGroupsEvents', helpers.wrap(function* (req, res) {

        var groups = req.body.groups;
        logger.get().debug({ req: req }, 'Retrieving event objects by ids...');
        var documentResponse = yield findEventsByGroupsIdsAsync(dal, groups, null);

        var results = documentResponse.feed;
        var filteredResults = helpers.removeDuplicatedItemsById(results);

        logger.get().debug({ req: req, events: filteredResults }, 'Event objects retrieved successfully.');

        for (var eventIndex in filteredResults) {
            var event = filteredResults[eventIndex];
            yield dal.removeAsync(event.id);
            logger.get().debug({ req: req }, 'Event object deleted successfully. id: %s', event.id);
        }
        res.status(200).json(filteredResults);
    }));


    router.delete('/:id', helpers.wrap(function* (req, res) {
        logger.get().debug({ req: req }, 'Deleting event object...');
        var documentResponse = yield dal.removeAsync(req.params.id);
        logger.get().debug({ req: req }, 'Event object deleted successfully. id: %s', req.params.id);
        res.status(200).json({ id: req.params.id });
    }));

    function findEventByEventIdAsync(dal, eventId, fields) {
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

    function findEventsByGroupsIdsAsync(dal, groupIds, fields) {
        var constraints = helpers.convertFieldSelectionToConstraints('e', fields);

        var parameters = [{
            name: "@groupsIds",
            value: groupIds
        }];

        var querySpec = {
            query: "SELECT e.id" + constraints + " FROM e JOIN g IN e.groups WHERE ARRAY_CONTAINS(@groupsIds, g)",
            parameters: parameters
        };
        return dal.getAsync(querySpec);
    }

    function findAllEvents() {
        var querySpec = {
            query: "SELECT * FROM root"
        };
        return dal.getAsync(querySpec);
    }

    return router;
}

