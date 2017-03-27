'use strict'

var express = require('express');
var router = express.Router();
var config = require('../../common/config.js');

var databaseName = config.documentdbDatabaseName;
var collectionName = config.groupsCollectionName;
var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
var dal = new DataAccessLayer(databaseName, collectionName);
var helpers = require('../../common/helpers.js');
var BadRequestError = require('../../common/error.js').BadRequestError;

router.get('/', helpers.wrap(function *(req, res) {
    if (!req.query) {
        throw new BadRequestError('Cannot find email and password in body.');
    }
    
    if (!req.query.ids && !req.query.keywords) {
        throw new BadRequestError('Either ids or keywords should be found in query string.');
    }

    var documentResponse;
    if (req.query.ids) {
        var groupIds = req.query.ids.split('|');
        documentResponse = yield findGroupsByGroupIdsAsync(groupIds);
    }
    else if (req.query.keywords) {
        var keywords = req.query.keywords.split('|');
        documentResponse = yield findGroupByKeywordsAsync(groupIds);
    }
    var results = documentResponse.feed;
    var filteredResults = helpers.removeDuplicatedItemsById(results);
    res.status(200);
    res.json(filteredResults);
}));

router.put('/', helpers.wrap(function *(req, res) {
    if (!req.body) {
        throw new BadRequestError('Empty body.');
    }
    var group = req.body;
    if (!group) {
        throw new BadRequestError('Group is not found in body.');        
    }
    group['createdById'] = req.headers['auth-identity'];
    group['ownedById'] = req.headers['auth-identity'];
    var documentResponse = yield dal.update(group, {});

    res.status(201);
    res.send({ id : documentResponse.resource.id });                        
}));

router.post('/', helpers.wrap(function *(req, res) {
    if (!req.body) {
        throw new BadRequestError('Empty body.');
    }
    var group = req.body;
    if (!group) {
        throw new BadRequestError('Group is not found in body.');        
    }
    group['createdById'] = req.headers['auth-identity'];
    group['ownedById'] = req.headers['auth-identity'];
    var documentResponse = yield dal.insert(group, {});

    res.status(201);
    res.send({ id : documentResponse.resource.id });
}));

router.delete('/:id', helpers.wrap(function *(req, res) {
    var documentResponse = yield dal.remove(req.params.id);
    res.status(200);
    res.send({ id : documentResponse.resource.id });                        
}));

function findGroupByKeywordsAsync(keywords) {
    var querySpec = {
        query: "SELECT e.id, e._self, e.name, e.keywords FROM e JOIN k IN e.keywords WHERE ARRAY_CONTAINS(@keywords, k) ORDER BY e.name",
        parameters: [
            {
                name: '@keywords',
                value: keywords
            }
        ]
    };

    return dal.get(querySpec);
}

function findGroupsByGroupIdsAsync(groupId) {

    var queryString = "SELECT e.id, e._self, e.name FROM root e WHERE ARRAY_CONTAINS(@groupIds, e.groupdId) ORDER BY e.name";
        
    var parameters = [
        {
            name: "@groupIds",
            value: groupId
        }
    ];

    var querySpec = {
        query: queryString,
        parameters: parameters
    };

    return dal.get(querySpec);
}

module.exports = router;