"use strict";

var express = require('express');
var router = express.Router();
var config = require('../../common/config.js');

var databaseName = config.documentdbDatabaseName;
var collectionName = config.eventsCollectionName;
var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
var dal = new DataAccessLayer(databaseName, collectionName);
var Helpers = require('../../common/helpers.js').Helpers;
var helpers = new Helpers();

router.get('/:id', function (req, res) {
    findEventByEventId(req.params.id, function (err, results) {
        helpers.handleResults(err, res, function () {
            if (results.length > 0){
                res.status(200);
                res.send(results[0]);
            }
            else {
                res.status(404);
                res.send('Not found');
            }
        });
    });
});

router.get('/', function (req, res) {
    if (!req.query) {
        res.status(400);
        res.send('Query string must be supplied.');
    }

    if (!req.query.groupids) {
        res.status(400);
        res.send('Filter string is not valid');
    }
    else{
        var groupids = req.query.groupids.split('|');
        findEventsByGroupsIds(groupids, function (err, results) {
            helpers.handleResults(err, res, function () {
                res.status(200);
                res.send(results);                
            });
        });
    }
});

router.put('/:id', function (req, res) {
    if (!req.body) {
        res.status(400);
        res.send('Invalid event in http request body');
    }
    var event = req.body;
    if (!event) {
        res.status(400);
        res.send('Invalid event in http request body');
    }
    else if (event['ownedById'] !== req.headers['auth-identity']){
        res.status(403);
        res.send("Forbidden");
    }
    else{
        dal.update(req.params.id, event, function (err, result) {
            helpers.handleResults(err, res, function () {
                res.status(200);
                res.send({
                    "_self": result._self,
                    "id": result.id
                })
            });
        });
    }
});

router.post('/', function (req, res) {
    if (!req.body) {
        res.status('Invalid event in http request body');
        res.send(400);
    }
    var event = req.body;
    if (!event) {
        res.status(400);
        res.send('Invalid event in http request body');
    }
    event['createdById'] = req.headers['auth-identity'];
    event['ownedById'] = req.headers['auth-identity'];
    dal.insert(event, {}, function (err, result) {
        helpers.handleResults(err, res, function () {
            res.status(201);
            res.send({
                "_self": result._self,
                "id": result.id
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

function findEventByEventId(eventId, callback) {
    var querySpec = {
        query: "SELECT e.createdById, e.ownedByIds, e.id, e._self, e.name, e.eventType FROM e WHERE e.id = @eventId ORDER BY e.name",
        parameters: [
            {
                name: '@eventId',
                value: eventId
            }
        ]
    };

    dal.get(querySpec, callback);
}

function findEventsByGroupsIds(groupsIds, callback) {

    var queryString = "SELECT e.owningGroups, e.id, e._self, e.name FROM root e JOIN g IN e.owningGroups WHERE ARRAY_CONTAINS(@groupsIds, g) ORDER BY e.name";
        
    var parameters = [
        {
            name: "@groupsIds",
            value: groupsIds
        }
    ];

    var querySpec = {
        query: queryString,
        parameters: parameters
    };

    dal.get(querySpec, function (err, results){
        var filteredResults = helpers.removeDuplicatedItemsById(results);
        callback(err, filteredResults);
    });
}

module.exports = router;