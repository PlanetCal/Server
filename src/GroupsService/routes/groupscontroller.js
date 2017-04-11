'use strict'

module.exports = function(config){

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
        var documentResponse = yield findGroupsByGroupIdsAsync(req.params.id, fields);
        if (results.length <= 0){
            throw new NotFoundException('Group with id ' + req.params.id + ' not found.');
        }

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
        var documentResponse = yield dal.updateAsync(group, {});

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
        var documentResponse = yield dal.insertAsync(group, {});

        res.status(201).json({ id : documentResponse.resource.id });
    }));

    router.delete('/:id', helpers.wrap(function *(req, res) {
        var documentResponse = yield dal.removeAsync(req.params.id);
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
