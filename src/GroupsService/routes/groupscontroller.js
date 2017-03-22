'use strict'

var express = require('express');
var router = express.Router();
var config = require('../../common/config.js');

var databaseName = config.documentdbDatabaseName;
var collectionName = config.groupsCollectionName;
var DataAccessLayer = require('../../common/dal2.js').DataAccessLayer;
var dal = new DataAccessLayer(databaseName, collectionName);
var Helpers = require('../../common/helpers.js').Helpers;
var helpers = new Helpers();

router.get('/', function (req, res) {
    if (!req.query) {
        res.status(400);
        res.json({ code : 400, name: 'BadRequest', messae: 'Query in request not found.'});
    }
    else if (!req.query.ids && !req.query.keywords) {
        res.status(400);
        res.json({ code : 400, name: 'BadRequest', messae: 'Either ids or keywords should be found in query string.'});
    }
    else if (req.query.ids) {
        var groupIds = req.query.ids.split('|');
        findGroupsByGroupIds(groupIds, function (err, results) {
            if (err){
                res.status(err.code);
                res.json(helpers.createErrorJson(err));
            }
            else{
                res.status(200);
                res.json(results);
            }                
        });
    }
    else if (req.query.keywords) {
        var keywords = req.query.keywords.split('|');
        findGroupByKeywords(keywords, function (err, results) {
            if (err){
                res.status(err.code);
                res.json(helpers.createErrorJson(err));
            }
            else{
                res.status(200);
                res.json(results);                
            }
        });
    }
});

router.post('/', function (req, res) {
    if (!req.body) {
        res.status(400);
        res.json({ code : 400, name: 'BadRequest', messae: 'Empty body.'});
    }
    var group = req.body;
    if (!group) {
        res.status(400);
        res.json({ code : 400, name: 'BadRequest', messae: 'Group is missing in body.'});
    }
    group['createdById'] = req.headers['auth-identity'];
    group['ownedById'] = req.headers['auth-identity'];
    dal.insert(group, {})
        .then(function(documentResponse){
            res.status(201);
            res.send({ _self : documentResponse.response._self, id : documentResponse.response.id });                        
        })
        .fail(function(err){
            res.status(err.code);
            res.json(helpers.createErrorJson(err));
        });
});

router.delete('/:id', function (req, res) {
    dal.remove(req.params.id)
        .then(function(){
            res.status(200);
            res.send({ id: req.params.id });
        })
        .fail(function(err){
            res.status(err.code);
            res.json(helpers.createErrorJson(err));
        });
});

function findGroupByKeywords(keywords, callback) {
    var querySpec = {
        query: "SELECT e.id, e._self, e.name, e.keywords FROM e JOIN k IN e.keywords WHERE ARRAY_CONTAINS(@keywords, k) ORDER BY e.name",
        parameters: [
            {
                name: '@keywords',
                value: keywords
            }
        ]
    };

    dal.get(querySpec)
        .then(function(documentResponse){
            var results = documentResponse.feed;
            var filteredResults = helpers.removeDuplicatedItemsById(results);
            callback(err, filteredResults);
        })
        .fail(function(err){
            callback(err);
        });
}

function findGroupsByGroupIds(groupId, callback) {

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

    dal.get(querySpec)
        .then(function(documentResponse){
            var results = documentResponse.feed;
            var filteredResults = helpers.removeDuplicatedItemsById(results);
            callback(err, filteredResults);
        })
        .fail(function(err){
            callback(err);
        });
}

module.exports = router;