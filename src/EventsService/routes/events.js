"use strict";

var express = require('express');
var router = express.Router();
var config = require('../../common/config.js');

var databaseName = config.documentdbDatabaseName;
var collectionName = config.eventsCollectionName;
var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
var dal = new DataAccessLayer(databaseName, collectionName);

router.get('/:id', function (req, res) {
    findEventByEventId(req.params.id, function (err, results) {
        handleResults(err, res, function () {

            if (results.length > 0){
                res.status(200);
                res.send(results[0]);
            }
            else {
                res.status(404);
                res.send('');
            }
        });
    });
});

router.get('/', function (req, res) {
    if (!req.query) {
        res.status(400);
        res.send('Invalid query string. Query string should include userids delimited by |.');
    }

    if (!req.query.userids) {
        res.status(400);
        res.send('Invalid query string. Query string should include userids delimited by |.');
    }

    console.log(req.query.userids);
    var userids = req.query.userids.split('|');
    findEventsByCreatedByIds(userids, function (err, results) {
        handleResults(err, res, function () {
            res.status(200);
            res.send(results);                
        });
    });
});

router.put('/:id', function (req, res) {
    if (!req.body) {
        res.status(400);
        res.send('Invalid event in http request body');
    }
    var event = req.body;
    if (!event) {
        res.send(400);
        res.send('Invalid event in http request body');
    }

    if (event['ownedById'] !== req.headers['auth-identity']){
        res.send(403);
        res.send("Forbidden");
    }
    else{
        dal.update(req.params.id, event, function (err, obj) {
            handleResults(err, res, function () {
                res.status(200);
                res.send({
                    "_self": obj._self,
                    "id": obj.id,
                })
            });
        });
    }
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
    event['createdById'] = req.headers['auth-identity'];
    event['ownedById'] = req.headers['auth-identity'];
    dal.insert(event, function (err, obj) {
        handleResults(err, res, function () {
            res.status(201);
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
        query: "SELECT e.createdById, e.id, e._self, e.name, e.eventType FROM e WHERE e.id = @eventId",
        parameters: [
            {
                name: '@eventId',
                value: eventId
            }
        ]
    };

    dal.get(querySpec, callback);
}

function findEventsByCreatedByIds(createdByIds, callback) {

    var queryString = "SELECT e.createdById, e.id, e._self, e.name FROM root e WHERE ARRAY_CONTAINS(@createdByIds, e.createdById)";
        
    var parameters = [
        {
            name: "@createdByIds",
            value: createdByIds
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
        console.log(err);
        res.status(500);
        res.send('Connection to data persistence failed.');
    }
    else {
        onSuccess();
    }
}

module.exports = router;