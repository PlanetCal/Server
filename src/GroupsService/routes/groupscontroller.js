'use strict'

module.exports = function(config, logger){

    var express = require('express');
    var router = express.Router();

    var databaseName = config.documentdbDatabaseName;
    var collectionName = config.groupsCollectionName;
    var documentdbEndpoint = config.documentdbEndpoint;
    var documentdbAuthKey = config.documentdbAuthKey;
    var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
    var dal = new DataAccessLayer(databaseName, collectionName, documentdbEndpoint, documentdbAuthKey);

    var helpers = require('../../common/helpers.js');
    var BadRequestException = require('../../common/error.js').BadRequestException;
    var NotFoundException = require('../../common/error.js').NotFoundException;

    router.get('/:id', helpers.wrap(function *(req, res) {
        var fields 
        if (req.query.fields){
            fields = req.query.fields.split('|');
        }

        logger.get().debug({req : req}, 'Retriving group object...',);
        var documentResponse = yield findGroupsByGroupIdsAsync(req.params.id, fields);
        if (results.length <= 0){
            throw new NotFoundException('Group with id ' + req.params.id + ' not found.');
        }
        logger.get().debug({req : req, group: results[0]}, 'group object with fields retrieved successfully.');

        // TODO: assert when results has more than 1 element.
        res.status(200).json(results[0]);
    }));

    router.get('/', helpers.wrap(function *(req, res) {
        if (!req.query) {
            throw new BadRequestException('Cannot find email and password in body.');
        }
        
        if (!req.query.keywords) {
            throw new BadRequestException('Keywords should be found in query string.');
        }

        var documentResponse;
        logger.get().debug({req : req}, 'Retriving all group objects...');
        if (req.query.keywords) {
            var keywords = req.query.keywords.split('|');
            var fields 
            if (req.query.fields){
                fields = req.query.fields.split('|');
            }

            documentResponse = yield findGroupByKeywordsAsync(keywords, fields);
        }
        var results = documentResponse.feed;
        var filteredResults = helpers.removeDuplicatedItemsById(results);
        logger.get().debug({req : req, groups : filteredResults}, 'group objects retrieved successfully. unfiltered count: %d. filtered count: %d.', results.length, filteredResults.length);
        res.status(200).json(filteredResults);
    }));

    router.put('/', helpers.wrap(function *(req, res) {
        if (!req.body) {
            throw new BadRequestException('Empty body.');
        }
        var group = req.body;
        if (!group) {
            throw new BadRequestException('Group is not found in body.');        
        }
        group['createdById'] = req.headers['auth-identity'];
        group['ownedById'] = req.headers['auth-identity'];

        logger.get().debug({req : req, group: group}, 'Updating group object...');
        var documentResponse = yield dal.updateAsync(group, {});
        logger.get().debug({req : req, group: group}, 'group object updated successfully.');

        res.status(201).json({ id : documentResponse.resource.id });                        
    }));

    router.post('/', helpers.wrap(function *(req, res) {
        if (!req.body) {
            throw new BadRequestException('Empty body.');
        }
        var group = req.body;
        if (!group) {
            throw new BadRequestException('Group is not found in body.');        
        }
        group['createdById'] = req.headers['auth-identity'];
        group['ownedById'] = req.headers['auth-identity'];

        logger.get().debug({req : req, group: group}, 'Creating group object...');
        var documentResponse = yield dal.insertAsync(group, {});
        logger.get().debug({req : req, group: group}, 'group object created successfully.');

        res.status(201).json({ id : documentResponse.resource.id });
    }));

    router.delete('/:id', helpers.wrap(function *(req, res) {
        logger.get().debug({req : req}, 'Deleting group object...');
        var documentResponse = yield dal.removeAsync(req.params.id);
        logger.get().debug({req : req}, 'group object deleted successfully.');
        res.status(200).json({ id : documentResponse.resource.id });                        
    }));

    return router;
}

function findGroupByKeywordsAsync(keywords, fields) {
    var constraints = helpers.convertFieldSelectionToConstraints('e', fields);
    var querySpec = {
        query: "SELECT e.id" + constraints + " e.keywords FROM e JOIN k IN e.keywords WHERE ARRAY_CONTAINS(@keywords, k)",
        parameters: [
            {
                name: '@keywords',
                value: keywords
            }
        ]
    };

    return dal.getAsync(querySpec);
}

function findGroupsByGroupIdsAsync(groupIds, fields) {
    var constraints = helpers.convertFieldSelectionToConstraints('e', fields);
    console.log('contraints: ' + contrainsts);
    var parameters = [
        {
            name: "@groupIds",
            value: groupIds
        }
    ];

    var querySpec = {
        query: "SELECT e.id" + constraints + " FROM root e WHERE ARRAY_CONTAINS(@groupIds, e.groupdId)",
        parameters: parameters
    };
    return dal.getAsync(querySpec);
}

function findGroupsByGroupIdAsync(groupId, fields) {
    var constraints = helpers.convertFieldSelectionToConstraints('e', fields);
    var parameters = [
        {
            name: "@groupId",
            value: groupId
        }
    ];

    var querySpec = {
        query: "SELECT e.id" + constraints + " FROM root e WHERE e.id = groupId",
        parameters: parameters
    };
    return dal.getAsync(querySpec);
}
