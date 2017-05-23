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
    var constants = require('../../common/constants.json');
    var util = require('util');

    router.get('/', helpers.wrap(function *(req, res) {        
        if (!req.query.groupid) {
            throw new BadRequestException('Groupid should be found in query string.', errorcode.GroupdIdsNotFoundInQueryString);
        }

        if (!req.query.distance) {
            throw new BadRequestException('Distance should be found in query string.', errorcode.DistanceNotFoundInQueryString);
        }

        logger.get().debug({req : req}, 'Retriving all grouplinks for groupid %s, distance %d...', req.query.groupid, req.query.distance);

        var documentResponse = yield findGroupLinksByGroupIdAndDistance(req.query.groupid, req.query.distance);
        
        var results = documentResponse.feed;
        logger.get().debug({req : req, grouplinks : results}, 'Grouplink objects retrieved successfully. Count: %d', results.length);
        res.status(200).json(results);
    }));

    router.post('/', helpers.wrap(function *(req, res) {
        // TODO: Validate groupLinkDescriptor object in body
        var groupLinkDescriptor = req.body;

        logger.get().debug({req : req, groupLinkDescriptor : groupLinkDescriptor}, 'Updating groupLink object...');
        var documentResponse = yield dal.executeStoredProcedureAsync(constants.groupLinksUpdateStoredProcName, [ groupLinkDescriptor ]);

        var results = documentResponse.result;
        logger.get().debug({req : req, groupLinkDescriptor : results}, 'groupLink object updated successfully.');

        console.log(util.inspect(documentResponse));
        // all inserted links are returned
        res.status(201).json(documentResponse.result);                        
    }));

    function findGroupLinksByGroupIdAndDistance(groupid, distance) {
        var querySpec = {
            query: "SELECT e.ancestor, e.descendant, e.distance FROM e WHERE e.ancestor = @groupid and e.distance = @distance",
            parameters: [
                {
                    name: '@groupid',
                    value: groupid
                },
                {
                    name: '@distance',
                    value: distance
                }
            ]
        };
        return dal.getAsync(querySpec);
    }
    return router;
}

