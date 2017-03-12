"use strict";

var express = require('express');
var router = express.Router();
var config = require('../../common/config.js');

var databaseName = config.documentdbDatabaseName;
var collectionName = config.userDetailsCollectionName;
var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
var dal = new DataAccessLayer(databaseName, collectionName);

router.get('/:id', function (req, res) {
    var querySpec = {
        query: "SELECT a.id, a.email, a.name, a.followingUsers FROM root a WHERE a.id = @id",
        parameters: [
            {
                name: '@id',
                value: req.params.id
            }
        ]
    };

    if (checkCallerPermission(req, req.params.id, res)){
        dal.get(querySpec, function (err, results) {
            handleResults(err, res, function () {
                if (results.length > 0){
                    res.status(200);

                    // TODO: assert when results has more than 1 element.
                    res.send(results[0]);
                }
                else{
                    res.status(404);
                    res.send('');
                }
            });
        });
    }
});

router.put('/:id', function (req, res) {
    if (!req.body) {
        res.status(400);
        res.send('Invalid userDetails in http request body');
    }
    var userDetails = req.body;
    if (!userDetails) {
        res.status(400);
        res.send('Invalid userDetails in http request body');
    }
    if (checkCallerPermission(req, req.params.id, res)
        && checkCallerPermission(req, req.body.id, res)){
        dal.update(req.params.id, userDetails, function (err, document) {
            handleResults(err, res, function () {
                res.status(200);
                res.send({
                    "_self": document._self,
                    "id": document.id,
                })
            });
        });
    }
});

router.post('/', function (req, res) {
    if (!req.body) {
        res.send(400);
        res.send('Invalid userDetails in http request body');
    }
    var userDetails = req.body;
    if (!userDetails) {
        res.send(400);
        res.send('Invalid userDetails in http request body');
    }
    if (checkCallerPermission(req, req.body.id, res)){
        dal.insert(userDetails, {}, function (err, document) {
            handleResults(err, res, function () {
                res.status(201);
                res.send({
                    "_self": document._self,
                    "id": document.id,
                })
            });
        });
    }
});

router.delete('/:id', function (req, res) {
    if (checkCallerPermission(req, req.params.id, res)){
        dal.remove(req.params.id, function (err) {
            handleResults(err, res, function () {
                res.status(200);
                res.send({ "id": req.params.id });
            });
        });
    }
});

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

function checkCallerPermission(req, id, res){
    if (req.headers['auth-identity'] !== id){
        res.status(403);
        res.send('Forbidden');

        return false;
    } 

    return true;

}
module.exports = router;