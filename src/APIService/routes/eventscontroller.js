'use strict'

module.exports = function (config, logger) {
    var router = require('express').Router();
    var request = require('request-promise');
    var qs = require('qs');
    var cors = require('cors');
    var etag = require('etag');
    var serviceNames = require('../../common/constants.json')['serviceNames'];
    var urlNames = require('../../common/constants.json')['urlNames'];

    var helpers = require('../../common/helpers.js');
    var BadRequestException = require('../../common/error.js').BadRequestException;
    var errorcode = require('../../common/errorcode.json');

    var databaseName = config.documentdbDatabaseName;
    var collectionName = config.eventsCollectionName;
    var documentdbEndpoint = config.documentdbEndpoint;
    var documentdbAuthKey = config.documentdbAuthKey;

    var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
    var dal = new DataAccessLayer(databaseName, collectionName, documentdbEndpoint, documentdbAuthKey);

    var corsOptions = {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['Version'],
        optionsSuccessStatus: 200,
        preflightContinue: true,
        credentials: true
    };

    var endpoint = config.eventsServiceEndpoint;

    router.get('/:id', cors(corsOptions), helpers.wrap(function* (req, res) {
        var url = endpoint + '/' + urlNames.events + '/' + req.params.id;
        if (req.query) {
            url += '?' + qs.stringify(req.query);
        }
        var options = helpers.getRequestOption(req, url, 'GET');
        var results = yield* helpers.forwardHttpRequest(options, serviceNames.eventsServiceName);
        res.setHeader('Etag', etag(results));
        res.status(200).json(JSON.parse(results));
    }));

    router.get('/', cors(corsOptions), helpers.wrap(function* (req, res) {
        var url;
        var queryString = qs.stringify(req.query);

        if (!queryString || queryString.length <= 0) {
            url = endpoint + '/' + urlNames.events;
        }
        else {
            url = endpoint + '/' + urlNames.events + '?' + queryString;
        }

        var options = helpers.getRequestOption(req, url, 'GET');
        var results = yield* helpers.forwardHttpRequest(options, serviceNames.eventsServiceName);
        res.setHeader('Etag', etag(results));
        res.status(200).json(JSON.parse(results));
    }));

    router.post('/', cors(corsOptions), helpers.wrap(function* (req, res) {
        if (!req.body.groupId) {
            throw new BadRequestException('Cannot find groupId in the post payload', errorcode.GroupIdNotFoundInPayload);
        }

        var groupsUrl = config.groupsServiceEndpoint + '/' + urlNames.groups + '/' + req.body.groupId;
        groupsUrl += '?fields=createdBy|modifiedBy|administrators|privacy';
        var options = helpers.getRequestOption(req, groupsUrl, 'GET');
        var results = yield* helpers.forwardHttpRequest(options, serviceNames.groupsServiceName);
        var group = JSON.parse(results);
        if (!group || group.id !== req.body.groupId) {
            throw new BadRequestException('Group with the id ' + req.body.groupId + ' does not exist', errorcode.GroupNotExistant);
        }

        var permissionGranted = group.privacy === "Open" ||
            (group.createdBy && group.createdBy === req.headers['auth-identity']) ||
            (group.administrators && group.administrators.indexOf(req.headers['auth-email'].toLowerCase()) >= 0);

        if (!permissionGranted) {
            throw new BadRequestException('User is not authorized to create an event under the group with id ' + req.body.groupId, errorcode.UserNotAuthorized);
        }

        var options = helpers.getRequestOption(req, endpoint + '/' + urlNames.events, 'POST');
        var results = yield* helpers.forwardHttpRequest(options, serviceNames.eventsServiceName);
        res.status(201).json(JSON.parse(results));
    }));

    router.put('/:id', cors(corsOptions), helpers.wrap(function* (req, res) {
        if (req.body.id !== req.params.id) {
            throw new BadRequestException('Event Ids in body and in the url do not match.', errorcode.PayloadIdsDoNotMatch);
        }

        if (!req.body.groupId) {
            throw new BadRequestException('Cannot find groupId in the post payload', errorcode.GroupIdNotFoundInPayload);
        }

        //first get the event from database to retrieve its groups.
        var eventsUrl = endpoint + '/' + urlNames.events + '/' + req.params.id
        eventsUrl += '?fields=groupId|createdBy|createdTime|modifiedBy';
        var options = helpers.getRequestOption(req, eventsUrl, 'GET');
        var results = yield* helpers.forwardHttpRequest(options, serviceNames.eventsServiceName);
        var event = JSON.parse(results);
        if (!event || event.id !== req.params.id) {
            throw new BadRequestException('Event with the id ' + req.params.id + ' does not exist', errorcode.EventNotExistant);
        }

        req.body.createdBy = event.createdBy;
        req.body.createdTime = event.createdTime;

        var permissionGranted = (event.createdBy && event.createdBy === req.headers['auth-identity']) ||
            (event.modifiedBy && event.modifiedBy === req.headers['auth-identity']);

        if (!permissionGranted && event.groupId) {
            // second fetch the group to find out its owner, to check if current user is same or not.
            var groupsUrl = config.groupsServiceEndpoint + '/' + urlNames.groups + '/' + event.groupId;
            groupsUrl += '?fields=createdBy|modifiedBy|administrators|privacy';
            var options = helpers.getRequestOption(req, groupsUrl, 'GET');
            var results = yield* helpers.forwardHttpRequest(options, serviceNames.groupsServiceName);
            var group = JSON.parse(results);

            if (group && group.id === event.groupId) {

                var permissionGranted = (group.createdBy && group.createdBy === req.headers['auth-identity']) ||
                    (group.administrators && group.administrators.indexOf(req.headers['auth-email'].toLowerCase()) >= 0);

                if (!permissionGranted) {
                    throw new BadRequestException('User is not authorized to update the event under the group with id ' + event.groupId, errorcode.UserNotAuthorized);
                }
            }
        }

        // third, if current group is different than the group in the database, then fetch current group to check its owner.
        if (event.groupId !== req.body.groupId) {

            // second fetch the group to find out its owner, to check if current user is same or not.
            var newGroupsUrl = config.groupsServiceEndpoint + '/' + urlNames.groups + '/' + req.body.groupId;
            newGroupsUrl += '?fields=createdBy|modifiedBy|administrators|privacy';
            var newOptions = helpers.getRequestOption(req, newGroupsUrl, 'GET');
            var newResults = yield* helpers.forwardHttpRequest(newOptions, serviceNames.groupsServiceName);
            var newGroup = JSON.parse(newResults);
            if (!newGroup || newGroup.id !== req.body.groupId) {
                //should it be internalServerError. Made it badRequestEx.. since this way, we can pass the ErrorCode out.
                throw new BadRequestException('Groupid ' + req.body.groupId + ' does not exist', errorcode.GroupNotExistant);
            }

            var permissionGranted = newGroup.privacy === "Open" ||
                (newGroup.createdBy && newGroup.createdBy === req.headers['auth-identity']) ||
                (newGroup.administrators && newGroup.administrators.indexOf(req.headers['auth-email'].toLowerCase()) >= 0);

            if (!permissionGranted) {
                throw new BadRequestException('User is not authorized to update the event under the group with id ' + req.body.groupId, errorcode.UserNotAuthorized);
            }
        }

        // forth, update the event.
        var eventOptions = helpers.getRequestOption(req, endpoint + '/' + urlNames.events + '/' + req.params.id, 'PUT');
        var eventResults = yield* helpers.forwardHttpRequest(eventOptions, serviceNames.eventsServiceName);
        res.status(200).json({ id: req.params.id });
    }));

    router.delete('/:id', cors(corsOptions), helpers.wrap(function* (req, res) {

        //first get the event from database to retrieve its groups.
        var eventsUrl = endpoint + '/' + urlNames.events + '/' + req.params.id
        eventsUrl += '?fields=groupId|createdBy|modifiedBy';
        var options = helpers.getRequestOption(req, eventsUrl, 'GET');
        var results = yield* helpers.forwardHttpRequest(options, serviceNames.eventsServiceName);
        var event = JSON.parse(results);
        if (!event || event.id !== req.params.id) {
            throw new BadRequestException('Event with the id ' + req.params.id + ' does not exist', errorcode.EventNotExistant);
        }

        var permissionGranted = (event.createdBy && event.createdBy === req.headers['auth-identity']) ||
            (event.modifiedBy && event.modifiedBy === req.headers['auth-identity']);

        if (permissionGranted !== true && event.groupId) {
            // second fetch the group to find out its owner, to check if current user is same or not.
            var groupsUrl = config.groupsServiceEndpoint + '/' + urlNames.groups + '/' + event.groupId;
            groupsUrl += '?fields=createdBy|modifiedBy|administrators|privacy';
            var options = helpers.getRequestOption(req, groupsUrl, 'GET');
            var results = yield* helpers.forwardHttpRequest(options, serviceNames.groupsServiceName);
            var group = JSON.parse(results);
            if (group && group.id === event.groupId) {

                var permissionGranted = (group.createdBy && group.createdBy === req.headers['auth-identity']) ||
                    (group.administrators && group.administrators.indexOf(req.headers['auth-email'].toLowerCase()) >= 0);

                if (!permissionGranted) {
                    throw new BadRequestException('User is not authorized to update the event under the group with id ' + event.groupId, errorcode.UserNotAuthorized);
                }
            }
        }

        var documentResponse = yield dal.removeAsync(req.params.id, { partitionKey: [event.groupId] });
        logger.get().debug({ req: req }, 'Event object deleted successfully. id: %s', req.params.id);

        // var options = helpers.getRequestOption(req, endpoint + '/' + urlNames.events + '/' + req.params.id, 'DELETE');
        // var results = yield* helpers.forwardHttpRequest(options, serviceNames.eventsServiceName);
        res.status(200).json({ id: req.params.id });
    }));

    return router;
}
