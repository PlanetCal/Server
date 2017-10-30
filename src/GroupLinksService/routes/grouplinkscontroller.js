'use strict'

module.exports = function (config, logger) {

    var express = require('express');
    var router = express.Router();
    var databaseName = config.documentdbDatabaseName;
    var collectionName = config.groupLinksCollectionName;
    var documentdbEndpoint = config.documentdbEndpoint;
    var documentdbAuthKey = config.documentdbAuthKey;
    var DataAccessLayer = require('../common/dal.js').DataAccessLayer;
    var dal = new DataAccessLayer(databaseName, collectionName, documentdbEndpoint, documentdbAuthKey);

    var helpers = require('../common/helpers.js');
    var BadRequestException = require('../common/error.js').BadRequestException;
    var errorcode = require('../common/errorcode.json');
    var constants = require('../common/constants.json');
    var util = require('util');

    router.get('/', helpers.wrap(function* (req, res) {
        if (!req.query.groupid) {
            throw new BadRequestException('groupid should be found in query string.', errorcode.GroupdIdsNotFoundInQueryString);
        }

        if (!req.query.distance) {
            throw new BadRequestException('Distance should be found in query string.', errorcode.DistanceNotFoundInQueryString);
        }

        logger.get().debug({ req: req }, 'Retriving all grouplinks for groupid %s, distance %d...', req.query.groupid, req.query.distance);

        var results = yield* findDescendantGroupLinksByGroupIdAndDistance(req.query.groupid, parseInt(req.query.distance));

        logger.get().debug({ req: req, grouplinks: results }, 'Grouplink objects retrieved successfully. Count: %d', results.length);
        res.status(200).json(results);
    }));

    router.post('/', helpers.wrap(function* (req, res) {
        // TODO: Validate groupLinkDescriptor object in body
        var groupLinkDescriptor = req.body;

        logger.get().debug({ req: req, groupLinkDescriptor: groupLinkDescriptor }, 'Updating groupLink object...');
        var documentResponse = yield dal.executeStoredProcedureAsync(constants.nodeLinksUpdateStoredProcName, [groupLinkDescriptor]);

        var results = documentResponse.result;
        logger.get().debug({ req: req, groupLinkDescriptor: results }, 'groupLink object updated successfully.');

        res.status(201).json(documentResponse.result);
    }));

    function* findDescendantGroupLinksByGroupIdAndDistance(groupId, distance, continuation) {
        var continuation;
        var documentResponse = yield dal.executeStoredProcedureAsync(constants.nodeLinksQueryStoredProcName,
            [groupId, 'descendant', distance, continuation]);

        var payload = documentResponse.result;

        var results = [];

        if (payload.links && payload.links.length > 0) {
            results = results.concat(payload.links);
        }

        if (payload.continuation) {
            results = result.concat(yield findDescendantGroupLinksByGroupIdAndDistance(groupId, distance, payload.continuation));
        }

        return results;
    }
    return router;
}

