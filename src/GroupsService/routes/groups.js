"use strict";

var express = require('express');
var router = express.Router();
var config = require('../../common/config.js');

var databaseName = config.documentdbDatabaseName;
var collectionName = config.groupsCollectionName;
var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
var dal = new DataAccessLayer(databaseName, collectionName);
var Helpers = require('../../common/helpers.js').Helpers;
var helpers = new Helpers();

router.get('/', function (req, res) {
    if (!req.query) {
        res.status(400);
        res.send('Invalid query string. Query string should include ids delimited by |.');
    }

    if (!req.query.ids && !req.query.keywords) {
        res.status(400);
        res.send('Invalid query string. Query string should include ids delimited by |.');
    }
    else if (req.query.ids) {
        var groupIds = req.query.ids.split('|');
        findGroupsByGroupIds(groupIds, function (err, results) {
            helpers.handleResults(err, res, function () {
                res.status(200);
                res.send(results);                
            });
        });
    }
    else if (req.query.keywords) {
        var keywords = req.query.keywords.split('|');
        findGroupByKeywords(keywords, function (err, results) {
            helpers.handleResults(err, res, function () {
                res.status(200);
                res.send(results);                
            });
        });
    }
});

router.post('/', function (req, res) {
    if (!req.body) {
        res.status('Invalid event in http request body');
        res.send(400);
    }
    var group = req.body;
    if (!group) {
        res.status(400);
        res.send('Invalid event in http request body');
    }
    group['createdById'] = req.headers['auth-identity'];
    group['ownedById'] = req.headers['auth-identity'];
    dal.insert(group, {}, function (err, obj) {
        helpers.handleResults(err, res, function () {
            res.status(201);
            res.send({
                "_self": obj._self,
                "id": obj.id
            })
        });
    });
});

router.delete('/:id', function (req, res) {
    dal.remove(req.params.id, function (err) {
        helpers.handleResults(err, res, function () {
            res.status(200);
            res.send({ "id": req.params.id });
        });
    });
});

function findGroupByKeywords(keywords, callback) {
    var querySpec = {
        query: "SELECT e.id, e._self, e.name, e.keywords FROM e JOIN k IN e.keywords WHERE ARRAY_CONTAINS(@keywords, k)",
        parameters: [
            {
                name: '@keywords',
                value: keywords
            }
        ]
    };

    dal.get(querySpec, function(err, results){
        var filteredResults = helpers.removeDuplicatedItemsById(results);
        callback(err, filteredResults);
    });
}

function findGroupsByGroupIds(groupId, callback) {

    var queryString = "SELECT e.id, e._self, e.name FROM root e WHERE ARRAY_CONTAINS(@groupIds, e.groupdId)";
        
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

    dal.get(querySpec, callback);
}

module.exports = router;