'use strict'

module.exports = function (config, logger) {

    var express = require('express');
    var router = express.Router();
    var databaseName = config.documentdbDatabaseName;
    var collectionName = config.groupsCollectionName;
    var documentdbEndpoint = config.documentdbEndpoint;
    var documentdbAuthKey = config.documentdbAuthKey;
    var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
    var dal = new DataAccessLayer(databaseName, collectionName, documentdbEndpoint, documentdbAuthKey);
    var util = require('util');
    var helpers = require('../../common/helpers.js');
    var BadRequestException = require('../../common/error.js').BadRequestException;
    var errorcode = require('../../common/errorcode.json');

    router.get('/:id', helpers.wrap(function* (req, res) {
        var fields = req.query.fields ? req.query.fields.split('|') : null;

        logger.get().debug({ req: req }, 'Retriving group object...');

        var userId = req.headers['auth-identity'];

        var documentResponse = yield findGroupsByGroupIdsAsync([req.params.id], fields, userId);

        var result = documentResponse.feed.length > 0 ? documentResponse.feed[0] : {};

        logger.get().debug({ req: req, group: result }, 'group object with fields retrieved successfully.');

        // TODO: assert when results has more than 1 element.
        res.status(200).json(result);
    }));

    router.get('/', helpers.wrap(function* (req, res) {
        logger.get().debug({ req: req }, 'Retriving all group objects...');

        var keywords = req.query.keywords ? req.query.keywords.split('|') : null;
        var fields = req.query.fields ? req.query.fields.split('|') : null;
        var groupIds = req.query.groupids ? req.query.groupids.split('|') : null;
        var userId = req.headers['auth-identity'];

        var documentResponse;
        if (keywords) {
            documentResponse = yield findGroupByKeywordsAsync(keywords, fields, userId);
        } else if (groupIds) {
            documentResponse = yield findGroupsByGroupIdsAsync(groupIds, fields, userId);
        }
        else {
            documentResponse = yield findAllGroupAsync(fields, userId);
        }

        var results = documentResponse.feed;
        var filteredResults = helpers.removeDuplicatedItemsById(results);
        logger.get().debug({ req: req, groups: filteredResults }, 'group objects retrieved successfully. unfiltered count: %d. filtered count: %d.', results.length, filteredResults.length);
        res.status(200).json(filteredResults);
    }));

    router.post('/', helpers.wrap(function* (req, res) {
        // TODO: Validate group objects in body
        var group = req.body;

        group.owner = req.headers['auth-identity'];
        group.creater = req.headers['auth-identity'];
        group.createdTime = (new Date()).toUTCString();
        logger.get().debug({ req: req, group: group }, 'Creating group object...');
        var documentResponse = yield dal.insertAsync(group, {});
        logger.get().debug({ req: req, group: documentResponse.resource }, 'group object created successfully.');

        res.status(201).json({ id: documentResponse.resource.id });
    }));

    router.put('/:id', helpers.wrap(function* (req, res) {
        // TODO: Validate group objects in body
        var group = req.body;
        group.modifiedTime = (new Date()).toUTCString();

        //group['createdById'] = req.headers['auth-identity'];
        //group['ownedById'] = req.headers['auth-identity'];

        logger.get().debug({ req: req, group: group }, 'Updating group object...');
        var documentResponse = yield dal.updateAsync(req.params.id, group);
        logger.get().debug({ req: req, group: documentResponse.resource }, 'group object updated successfully.');

        res.status(200).json({ id: documentResponse.resource.id });
    }));

    router.delete('/:id', helpers.wrap(function* (req, res) {
        logger.get().debug({ req: req }, 'Deleting group object...');
        var documentResponse = yield dal.removeAsync(req.params.id);

        logger.get().debug({ req: req }, 'group object deleted successfully. id: %s', req.params.id);
        res.status(200).json({ id: req.params.id });
    }));

    function findGroupByKeywordsAsync(keywords, fields, userId) {
        var constraints = helpers.convertFieldSelectionToConstraints('e', fields);
        var querySpec = {
            query: "SELECT e.id" + constraints + " e.keywords FROM e JOIN k IN e.keywords WHERE ARRAY_CONTAINS(@keywords, k) and (e.owner=@userId or e.privacy != @privacy)",
            parameters: [
                {
                    name: '@keywords',
                    value: keywords
                },
                {
                    name: "@userId",
                    value: userId
                },
                {
                    name: "@privacy",
                    value: 'Private'
                },
            ]
        };

        return dal.getAsync(querySpec);
    }

    function findAllGroupAsync(fields, userId) {
        var constraints = helpers.convertFieldSelectionToConstraints('e', fields);
        var querySpec = {
            query: "SELECT e.id" + constraints + " FROM root e WHERE e.owner = @userId or e.privacy != @privacy",
            parameters: [
                {
                    name: "@userId",
                    value: userId
                },
                {
                    name: "@privacy",
                    value: 'Private'
                },
            ]
        };

        return dal.getAsync(querySpec);
    }

    function findGroupsByGroupIdsAsync(groupIds, fields, userId) {
        var constraints = helpers.convertFieldSelectionToConstraints('e', fields);
        var parameters = [
            {
                name: "@groupIds",
                value: groupIds
            },
            {
                name: "@userId",
                value: userId
            },
            {
                name: "@privacy",
                value: 'Private'
            },
        ];

        var querySpec = {
            query: "SELECT e.id" + constraints + " FROM root e WHERE ARRAY_CONTAINS(@groupIds, e.id) and (e.owner=@userId or e.privacy != @privacy)",
            parameters: parameters
        };
        return dal.getAsync(querySpec);
    }

    function findGroupsByGroupIdAsync(groupId, fields, userId) {
        var constraints = helpers.convertFieldSelectionToConstraints('e', fields);
        var parameters = [
            {
                name: "@groupId",
                value: groupId
            },
            {
                name: "@userId",
                value: userId
            },
            {
                name: "@privacy",
                value: 'Private'
            },
        ];

        var querySpec = {
            query: "SELECT e.id" + constraints + " FROM root e WHERE e.id = @groupId and (e.owner=@userId or e.privacy != @privacy)",
            parameters: parameters
        };
        return dal.getAsync(querySpec);
    }

    return router;
}

