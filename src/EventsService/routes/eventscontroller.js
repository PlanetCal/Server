'use strict'

var express = require('express');
var router = express.Router();
var config = require('../../common/config.js');

var databaseName = config.documentdbDatabaseName;
var collectionName = config.eventsCollectionName;
var DataAccessLayer = require('../../common/dal2.js').DataAccessLayer;
var dal = new DataAccessLayer(databaseName, collectionName);
var Helpers = require('../../common/helpers.js').Helpers;
var helpers = new Helpers();

router.get('/:id', function (req, res) {
    findEventByEventId(req.params.id)
        .then(function(documentResponse){
            res.status(200);
            // TODO: assert when results has more than 1 element.
            res.send(documentResponse.feed[0]);
        })
        .fail(function(err){
            res.status(err.code);
            res.json(helpers.createErrorJson(err));
        });
});

router.get('/', function (req, res) {
    if (!req.query) {
        res.status(400);
        res.json({ code : 400, name: 'BadRequest', messae: 'Query in request not found.'});
    }

    if (!req.query.groupids) {
        res.status(400);
        res.json({ code : 400, name: 'BadRequest', messae: 'Query string should contain groupids.'});
    }
    else{
        var groupids = req.query.groupids.split('|');
        findEventsByGroupsIds(groupids) {
            .then(function(documentResponse){
                res.status(200);
                // TODO: assert when results has more than 1 element.
                res.send(documentResponse.feed);
            })
            .fail(function(err){
                res.status(err.code);
                res.json(helpers.createErrorJson(err));
            });
        });
    }
});

router.put('/:id', function (req, res) {
    if (!req.body) {
        res.status(400);
        res.json({ code : 400, name: 'BadRequest', messae: 'Empty body.'});
    }
    var event = req.body;
    if (!event) {
        res.status(400);
        res.json({ code : 400, name: 'BadRequest', messae: 'Event cannot be found in body.'});
    }
    else if (event['ownedById'] !== req.headers['auth-identity']){
        res.status(400);
        res.json({ code : 400, name: 'Forbidden', messae: 'Oepration forbidden.'});
    }
    else{
        dal.update(req.params.id, event)
            .then(function(documentResponse){
                res.status(200);
                res.send({ _self : documentResponse.resource._self, id : documentResponse.resource.id });
            })
            .fail(function(err){
                res.status(err.code);
                res.json(helpers.createErrorJson(err));
            });
    }
});

router.post('/', function (req, res) {
    if (!req.body) {
        res.status(400);
        res.json({ code : 400, name: 'BadRequest', messae: 'Empty body.'});
    }
    var event = req.body;
    if (!event) {
        res.status(400);
        res.json({ code : 400, name: 'BadRequest', messae: 'Event cannot be found in body.'});
    }
    event['createdById'] = req.headers['auth-identity'];
    event['ownedById'] = req.headers['auth-identity'];
    dal.insert(event, {})
        .then(function(documentResponse){
            res.status(200);
            res.send({ _self: documentResponse.resource._self, id : documentResponse.resource.id });
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
        .fail(function(err){
            res.status(err.code);
            res.json(helpers.createErrorJson(err));
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

    return dal.get(querySpec);
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

    return dal.get(querySpec);
}

module.exports = router;