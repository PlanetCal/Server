"use strict";

var express = require('express');
var router = express.Router();
var fs = require('fs');
var bodyPserser = require('body-parser');
var assert = require('assert');

var eventsDatabaseName = 'eventsdatabase';
var eventsCollectionName = 'eventscollection1';
var Dal = require('../../common/dal.js');
var dal = new Dal.DataAccessLayer(eventsDatabaseName, eventsCollectionName);

router.get('/:id', function (req, res) { 
    findEventByEventId(req.params.id, function (err, results) {
        handleResults(err, res, function () {
            res.status(200);
            res.send(results);
        });
    });
});

router.get('/', function (req, res) {
    if (!req.query) {
        res.status(400);
        res.send('Invalid query string. Query string should include accountids delimited by |.');
    }

    if (!req.query.accountids) {
        res.status(400);
        res.send('Invalid query string. Query string should include accountids delimited by |.');
    }

    var accountids = req.query.accountids.split('|');
    findEventsByAccountIds(accountids, function (err, results) {
        handleResults(err, res, function () {
            res.status(200);
            res.send(results);
        });
    });
});

router.put('/', function (req, res) {
    if (!req.body) {
        res.status(400);
        res.send('Invalid event in http request body');
    }
    var event = req.body;
    if (!event) {
        res.send(400);
        res.send('Invalid event in http request body');
    }
    dal.insert(event, function (err, obj) {
        handleResults(err, res, function () {
            res.status(200);
            res.send({
                "_self": obj._self,
                "id": obj.id,
            })
        });
    });
});

router.post('/', function (req, res) {
    if (!req.body) {
        res.send(400);
        res.send('Invalid event in http request body');
    }
    var event = req.body;
    if (!event) {
        res.send(400);
        res.send('Invalid event in http request body');
    }
    dal.update(event, function (err, obj) {
        handleResults(err, res, function () {
            res.status(200);
            res.send({
                "_self": obj._self,
                "id": obj.id,
            })
        });
    });
});

router.delete('/:id', function (req, res) {
    dal.remove(req.params.id, function (err) {
        handleResults(err, res, function () {
            res.status(200);
            res.send({ "id": req.params.id });
        });
    });
});

function findEventByEventId(eventId, callback) {
    var querySpec = {
        query: "SELECT e.accountId, e.id, e._self, e.name, e.eventType FROM e WHERE e.id = @eventId",
        parameters: [
            {
                name: '@eventId',
                value: eventId
            }
        ]
    };

    dal.get(querySpec, callback);
}

function findEventsByAccountIds(accountids, callback) {

    var queryString = "SELECT e.accountid, e.id, e._self, e.name, e.startTime, e.endTime FROM root e WHERE ARRAY_CONTAINS(@accountids, e.accountid)";
        
    var parameters = [
        {
            name: "@accountids",
            value: accountids
        }
    ];

    var querySpec = {
        query: queryString,
        parameters: parameters
    };

    dal.get(querySpec, callback);
}

function handleResults(err, res, onSuccess) {
    if (err) {
        res.status(err.code);
        res.send(err.body);
    }
    else {
        onSuccess();
    }
}

module.exports = router;