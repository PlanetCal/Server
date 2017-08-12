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
    var allowedCategories = ["School", "Office", "Sports", "Local", "Personal"];
    var allowedGroupFields = ["name", "description", "icon", "parentGroup", "administrators", "location", "address", "contact", "website", "createdBy", "privacy", "category", "childGroups"];
    var allowedPrivacySettings = ["Open", "Closed"];

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
        var filterExpression = req.query.filter;


        var groupIds = req.query.groupids ? req.query.groupids.split('|') : null;
        var userId = req.headers['auth-identity'];

        var documentResponse;
        if (keywords) {
            documentResponse = yield findGroupByKeywordsAsync(keywords, fields, userId);
        } else if (groupIds) {
            documentResponse = yield findGroupsByGroupIdsAsync(groupIds, fields, userId);
        }
        else {
            documentResponse = yield findAllGroupAsync(fields, userId, filterExpression);
        }

        var results = documentResponse.feed;
        var filteredResults = helpers.removeDuplicatedItemsById(results);
        logger.get().debug({ req: req, groups: filteredResults }, 'group objects retrieved successfully. unfiltered count: %d. filtered count: %d.', results.length, filteredResults.length);
        res.status(200).json(filteredResults);
    }));

    router.post('/', helpers.wrap(function* (req, res) {
        // TODO: Validate group objects in body
        var group = req.body;
        //Setting the id. If the object does not have it, the create call fails for some reason.
        group.id = helpers.generateGuid();

        if (!group.category || allowedCategories.indexOf(group.category) < 0) {
            throw new BadRequestException('Group payload does not contain category field or it is not in the allowed category list.', errorcode.GroupShouldContainCategory);
        };

        if (!group.privacy || allowedPrivacySettings.indexOf(group.privacy) < 0) {
            throw new BadRequestException('Group payload does not contain privacy field or it is not in the allowed list.', errorcode.GroupShouldContainPrivacySetting);
        };

        var userId = req.headers['auth-identity'];
        //if group has a parentGroup, we need to check if user has permisison to create a sub group under it. 
        //And if it does, update the parentGroup by adding the current group under its childGroups.
        if (group.parentGroup) {
            //fetch parentGroup
            var documentResponse = yield findGroupsByGroupIdsAsync([group.parentGroup], allowedGroupFields, userId);
            var parentGroup = documentResponse.feed.length > 0 ? documentResponse.feed[0] : {};
            if (parentGroup.id != group.parentGroup) {
                throw new BadRequestException('Specified parent group in payload does not exist.', errorcode.GroupNotExistant);
            }
            var permissionGranted = (parentGroup.createdBy && parentGroup.createdBy === req.headers['auth-identity']) || (parentGroup.modifiedBy && parentGroup.modifiedBy === req.headers['auth-identity']);

            if (!permissionGranted) {
                throw new BadRequestException('User is not authorized to create a group under the group with id ' + parentGroup.id, errorcode.UserNotAuthorized);
            }

            parentGroup.modifiedBy = req.headers['auth-identity'];
            parentGroup.modifiedTime = (new Date()).toUTCString();
            if (!parentGroup.childGroups) {
                parentGroup.childGroups = [];
            }
            parentGroup.childGroups.push(group.id)
            var documentResponse = yield dal.updateAsync(parentGroup.id, parentGroup);
        }

        group.createdBy = req.headers['auth-identity'];
        group.createdTime = (new Date()).toUTCString();

        logger.get().debug({ req: req, group: group }, 'Creating group object...');
        var documentResponse = yield dal.insertAsync(group, {});
        logger.get().debug({ req: req, group: documentResponse.resource }, 'group object created successfully.');

        res.status(201).json({ id: documentResponse.resource.id });
    }));

    router.put('/:id', helpers.wrap(function* (req, res) {
        // TODO: Validate group objects in body
        var group = req.body;

        if (!group.category || allowedCategories.indexOf(group.category) < 0) {
            throw new BadRequestException('Group payload does not contain category field or it is not in the allowed category list.', errorcode.GroupShouldContainCategory);
        };

        if (!group.privacy || allowedPrivacySettings.indexOf(group.privacy) < 0) {
            throw new BadRequestException('Group payload does not contain privacy field or it is not in the allowed list.', errorcode.GroupShouldContainPrivacySetting);
        };

        group.modifiedBy = req.headers['auth-identity'];
        group.modifiedTime = (new Date()).toUTCString();

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

    function findAllGroupAsync(fields, userId, filterExpression) {
        var constraints = helpers.convertFieldSelectionToConstraints('e', fields);

        var filterExpressionParsed = helpers.convertFilterExpressionToParameters('e', filterExpression, ' AND ');

        var queryStatement = "SELECT e.id" + constraints + " FROM root e WHERE " + filterExpressionParsed.filterExpression + "(e.owner = @userId or e.privacy != @privacy)";

        var parameters = filterExpressionParsed.parameters;

        parameters.push({
            name: "@userId",
            value: userId
        });

        parameters.push({
            name: "@privacy",
            value: 'Private'
        });

        var querySpec = {
            query: queryStatement,
            parameters: parameters
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

