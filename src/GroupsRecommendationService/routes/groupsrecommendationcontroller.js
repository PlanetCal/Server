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
        if (!req.query.parentgroupid) {
            throw new BadRequestException('parentGroupId should be found in query string.', errorcode.ParentGroupdIdsNotFoundInQueryString);
        }

        logger.get().debug({ req: req }, 'Retriving all recommended groups for parent group id %s...', req.query.parentgroupid, req.query.distance);

        var results = yield* findDescendantGroupLinksByGroupIdAndDistance(req.query.groupId, parseInt(req.query.distance));

        logger.get().debug({ req: req, grouplinks: results }, 'Grouplink objects retrieved successfully. Count: %d', results.length);
        res.status(200).json(results);
    }));
}

