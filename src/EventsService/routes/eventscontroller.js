'use strict'


module.exports = function (config, logger) {
    var express = require('express');
    var router = express.Router();

    var helpers = require('../../common/helpers.js');
    var databaseName = config.documentdbDatabaseName;
    var collectionName = config.eventsCollectionName;
    var documentdbEndpoint = config.documentdbEndpoint;
    var documentdbAuthKey = config.documentdbAuthKey;
    var urlNames = require('../../common/constants.json')['urlNames'];
    var serviceNames = require('../../common/constants.json')['serviceNames'];

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

        // in this case append the query about the groups user is following            
        var userId = req.headers['auth-identity'];

        if (!groupids && userId) {

            //Get userDetails for the cureent user.        
            var userDetailsRequestOptions = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + '/' + urlNames.userdetails + '/' + userId, 'GET');
            var results = yield* helpers.forwardHttpRequest(userDetailsRequestOptions, serviceNames.userDetailsServiceName);
            var userDetails = JSON.parse(results);

            var groups = yield* getChildGroups(userDetails.followingGroups, helpers, config, serviceNames, urlNames, req);
            var groupids = groups.concat(userDetails.followingGroups);

            if (groupids.length == 0) {
                groupids.push('blah');
            }
        }

        var filterExpression = req.query.filter;

        var documentResponse;
        if (!groupids && !fields) {
            logger.get().debug({ req: req }, 'Retrieving all event objects...');
            documentResponse = yield findAllEvents(dal, filterExpression);
        }
        else {
            logger.get().debug({ req: req }, 'Retrieving event objects by ids...');
            documentResponse = yield findEventsByGroupsIdsAsync(dal, groupids, fields, filterExpression);
        }

        var results = documentResponse.feed;
        //var results = helpers.removeDuplicatedItemsById(results);

        // the following will only sort if startDateTime is part of the queried fields.         
        results.sort(function (a, b) {
            a = new Date(a.startDateTime);
            b = new Date(b.startDateTime);
            return a < b ? -1 : a > b ? 1 : 0;
        });

        logger.get().debug({ req: req, events: results }, 'Event objects retrieved successfully.');
        res.status(200).json(results);
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
        var documentResponse = yield findEventsByGroupsIdsAsync(dal, groups, null, null);

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

    // Delete is implemented at APIService level.
    // router.delete('/:id', helpers.wrap(function* (req, res) {
    //     logger.get().debug({ req: req }, 'Deleting event object...');
    //     var documentResponse = yield dal.removeAsync(req.params.id, {});
    //     logger.get().debug({ req: req }, 'Event object deleted successfully. id: %s', req.params.id);
    //     res.status(200).json({ id: req.params.id });
    // }));

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

    function findEventsByGroupsIdsAsync(dal, groupIds, fields, filterExpression) {

        if (!groupIds || groupIds.length === 0) {
            throw new BadRequestException('The query should specify the group Ids for which we need to get events', errorcode.GroupIdNotFoundInPayload);
        }

        var constraints = helpers.convertFieldSelectionToConstraints('e', fields);
        var filterExpressionParsed = helpers.convertFilterExpressionToParameters('e', filterExpression, 'AND', '');

        var queryStatement = "SELECT e.id" + constraints + " FROM root e WHERE ARRAY_CONTAINS(@groupsIds, e.groupId) " + filterExpressionParsed.filterExpression;
        var parameters = filterExpressionParsed.parameters;

        parameters.push({
            name: "@groupsIds",
            value: groupIds
        });

        var querySpec = {
            query: queryStatement,
            parameters: parameters
        };

        return dal.getAsync(querySpec);
    }

    function findAllEvents(dal, filterExpression) {
        var filterExpressionParsed = helpers.convertFilterExpressionToParameters('e', filterExpression, ' WHERE', '');

        var queryStatement = 'SELECT * FROM root e' + filterExpressionParsed.filterExpression;
        var parameters = filterExpressionParsed.parameters;

        var querySpec = {
            query: queryStatement,
            parameters: parameters
        };

        return dal.getAsync(querySpec);
    }

    return router;
}

function* getChildGroups(groups, helpers, config, serviceNames, urlNames, req) {

    if (groups && groups.length > 0) {
        var groupIds = groups.join('|');
        var getGroupsUrl = config.groupsServiceEndpoint +
            '/' + urlNames.groups +
            '?groupids=' + groupIds + '&fields=childGroups';

        var groupsRequestOptions = helpers.getRequestOption(req, getGroupsUrl, 'GET');
        var results = yield* helpers.forwardHttpRequest(groupsRequestOptions, serviceNames.groupsServiceName);
        var groupsInfo = JSON.parse(results);
        var childgroups = [];

        for (var i = 0; i < groupsInfo.length; i++) {
            var groupInfo = groupsInfo[i];
            if (groupInfo.childGroups) {
                childgroups = childgroups.concat(groupInfo.childGroups);
            }
        }

        if (childgroups.length > 0) {
            var grandChildGroups = yield* getChildGroups(childgroups, helpers, config, serviceNames, urlNames, req);
            if (grandChildGroups.length > 0) {
                childgroups = childgroups.concat(grandChildGroups);
            }
        }

        return childgroups;
    }
}

