'use strict'

module.exports = function(config, logger){

    var express = require('express');
    var router = express.Router();
    var databaseName = config.documentdbDatabaseName;
    var collectionName = config.groupLinksCollectionName;
    var documentdbEndpoint = config.documentdbEndpoint;
    var documentdbAuthKey = config.documentdbAuthKey;
    var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
    var dal = new DataAccessLayer(databaseName, collectionName, documentdbEndpoint, documentdbAuthKey);

    var helpers = require('../../common/helpers.js');
    var BadRequestException = require('../../common/error.js').BadRequestException;
    var errorcode = require('../../common/errorcode.json');

    router.get('/', helpers.wrap(function *(req, res) {
        if (!req.query) {
            throw new BadRequestException('Query string must be provided.', errorcode.NoQueryString);
        }
        
        if (!req.query.groupid) {
            throw new BadRequestException('Groupid should be found in query string.', errorcode.GroupdIdsNotFoundInQueryString);
        }

        if (!req.query.distance) {
            throw new BadRequestException('Distance should be found in query string.', errorcode.DistanceNotFoundInQueryString);
        }

        var documentResponse;
        logger.get().debug({req : req}, 'Retriving all grouplinks for groupid %s, distance %d...', req.query.groupid, req.query.distance);
            documentResponse = yield findGroupLinksByGroupIdAndDistance(dal, keywords, fields);
        }
        var results = documentResponse.feed;
        var filteredResults = helpers.removeDuplicatedItemsById(results);
        logger.get().debug({req : req, groups : filteredResults}, 'group objects retrieved successfully. unfiltered count: %d. filtered count: %d.', results.length, filteredResults.length);
        res.status(200).json(filteredResults);
    }));

    router.put('/', helpers.wrap(function *(req, res) {
        if (!req.body) {
            throw new BadRequestException('Empty body.', errorcode.EmptyBody);
        }
        var group = req.body;
        if (!group) {
            throw new BadRequestException('Group is not found in body.', errorcode.GroupsNotFoundInBody);        
        }
        group['createdById'] = req.headers['auth-identity'];
        group['ownedById'] = req.headers['auth-identity'];

        logger.get().debug({req : req, group: group}, 'Updating group object...');
        var documentResponse = yield dal.updateAsync(group, {});
        logger.get().debug({req : req, group: group}, 'group object updated successfully.');

        res.status(201).json({ id : documentResponse.resource.id });                        
    }));

    return router;
}

function findGroupLinksByGroupIdAndDistance(groupid, distance) {
    var querySpec = {
        query: "SELECT e.ancestor, e.descendant, e.distance FROM e WHERE e.ancestor = @groupid",
        parameters: [
            {
                name: '@groupid',
                value: groupid
            }
        ]
    };

    return dal.getAsync(querySpec);
}