"use strict";

var express = require('express');
var router = express.Router();
var fs = require('fs');
var bodyPserser = require('body-parser');
var assert = require('assert');
var queryString = require('querystring');
var eventsDatabaseName = 'eventsdatabase';
var eventsCollectionName = 'eventscollection1';
var documentClient = require('documentdb').DocumentClient;
var endpoint = 'https://planetcal.documents.azure.com:443/';
var authKey = 'UCAhQVjUx8iR4ICIWuF0ElSadxhm1AeIaj62FWRQzkkdYeXaxpaUz8WFFC8jGbdR0P6Jty7ZjGTfRHhC2uoAYQ==';

var collectionLink = 'dbs/' + eventsDatabaseName + '/colls/' + eventsCollectionName;

/* GET events listing. */
router.get('/:id', function (req, res) { 
    findEventByEventId(req.params.id, function (err, results) {
        handleResults(err, res, function () {
            res.status(200);
            res.send(results);
        });
    });
});

router.get('/', function (req, res) {
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
    insertEvent(event, function (err, document) {
        handleResults(err, res, function () {
            res.status(200);
            res.send({
                "_self": document._self,
                "id": document.id,
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
    replaceEvent(event, function (err, document) {
        handleResults(err, res, function () {
            res.status(200);
            res.send({
                "_self": document._self,
                "id": document.id,
            })
        });
    });
});

router.delete('/:id', function (req, res) {
    deleteEvent(req.params.id, res, function (err) {
        handleResults(err, res, function () {
            res.status(200);
            res.send({ "id": req.params.id });
        });
    });
});

function findEventByEventId(eventId, callback) {
    var querySpec = {
        query: "SELECT e.accountId, e.name, e.eventType FROM e WHERE e.id = @eventId",
        parameters: [
            {
                name: '@eventId',
                value: eventId
            }
        ]
    };

    findEvents(querySpec, callback);
}


function findEventsByAccountIds(accountids, callback) {

    var joinedString = accountids.join(', ');
    var queryString = "SELECT e.accountid, e.name, e.startTime, e.endTime FROM root e WHERE ARRAY_CONTAINS(@accountids, e.accountid)";
        
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

    findEvents(querySpec, callback);
}

function findEvents(querySpec, callback) {
    var client = new documentClient(endpoint, { "masterKey": authKey });
    client.queryDocuments(collectionLink,
        querySpec).toArray(
            function (err, results) {
                callback(err, results);
            }
        );
}

function insertEvent(event, callback) {
    var client = new documentClient(endpoint, { "masterKey": authKey });
    client.createDocument(collectionLink, event, function (err, document) {
        callback(err, document);
    });
};

function replaceEvent(event, callback) {
    var client = new documentClient(endpoint, { "masterKey": authKey });
    var documentLink = collectionLink + '/docs/' + event.id;
    client.replaceDocument(documentLink, event, (err, result) => {
        callback(err, result);
    });
}

function deleteEvent(eventId, res, callback) {
    var client = new documentClient(endpoint, { "masterKey": authKey });
    var documentLink = collectionLink + '/docs/' + eventId;
    client.deleteDocument(documentLink, function (err) {
        callback(err);
    });
};

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