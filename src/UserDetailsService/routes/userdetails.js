"use strict";

var express = require('express');
var router = express.Router();

var databaseName = 'planetdatabase';
var collectionName = 'accountscollection1';
var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
var dal = new DataAccessLayer(databaseName, collectionName);

router.get('/:id', function (req, res) {
    var querySpec = {
        query: "SELECT a.id, a.name, a.accountType, a.followingAccounts FROM root a WHERE a.id = @id",
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
                res.status(200);
                res.send(results);
            });
        });
    }
});

router.put('/:id', function (req, res) {
    if (!req.body) {
        res.status(400);
        res.send('Invalid account in http request body');
    }
    var account = req.body;
    if (!account) {
        res.status(400);
        res.send('Invalid account in http request body');
    }
    if (checkCallerPermission(req, req.params.id, res)){
        dal.update(req.params.id, account, function (err, document) {
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
        res.send('Invalid account in http request body');
    }
    var account = req.body;
    if (!account) {
        res.send(400);
        res.send('Invalid account in http request body');
    }
    dal.insert(account, function (err, document) {
        handleResults(err, res, function () {
            res.status(201);
            res.send({
                "_self": document._self,
                "id": document.id,
            })
        });
    });
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