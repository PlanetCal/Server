"use strict";

var express = require('express');
var router = express.Router();
var fs = require('fs');
var bodyPserser = require('body-parser');
var accountModule = require('../Model/Account.js');
var eventModule = require('../Model/Event.js');
var assert = require('assert');
var accountsDatabaseName = 'accountsdatabase';
var accountsCollectionName = 'accountscollection1';
var documentClient = require('documentdb').DocumentClient;
var endpoint = 'https://planetcal.documents.azure.com:443/';
var authKey = 'UCAhQVjUx8iR4ICIWuF0ElSadxhm1AeIaj62FWRQzkkdYeXaxpaUz8WFFC8jGbdR0P6Jty7ZjGTfRHhC2uoAYQ==';

var collectionLink = 'dbs/' + accountsDatabaseName + '/colls/' + accountsCollectionName;

/* GET accounts listing. */
router.get('/:id', function (req, res) {
    findAccountById(req.params.id, function (err, results) {
        handleResults(err, res, function () {
            res.status(200);
            res.send(results);
        });
    });
});

router.put('/', function (req, res) {
    if (!req.body) {
        res.status(400);
        res.send('Invalid account in http request body');
    }
    var account = req.body;
    if (!account) {
        res.send(400);
        res.send('Invalid account in http request body');
    }
    insertAccount(account, function (err, document) {
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
        res.send('Invalid account in http request body');
    }
    var account = req.body;
    if (!account) {
        res.send(400);
        res.send('Invalid account in http request body');
    }
    replaceAccount(account, function (err, document) {
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
    deleteAccount(req.params.id, res, function (err) {
        handleResults(err, res, function () {
            res.status(200);
            res.send({ "id": req.params.id });
        });
    });
});

function findAccountById(id, callback) {
    var client = new documentClient(endpoint, { "masterKey": authKey });

    var querySpec = {
        query: "SELECT a.id, a.name, a.accountType, a.events FROM root a WHERE a.id = @id",
        parameters: [
            {
                name: '@id',
                value: id
            }
        ]
    };

    client.queryDocuments(collectionLink,
        querySpec).toArray(
        function (err, results) {
            callback(err, results);
        }
    );
}

function insertAccount(account, callback) {
    var client = new documentClient(endpoint, { "masterKey": authKey });
    client.createDocument(collectionLink, account, function (err, document) {
        callback(err, document);
    });
};

function replaceAccount(account, callback) {
    var client = new documentClient(endpoint, { "masterKey": authKey });
    var documentLink = collectionLink + '/docs/' + account.id;
    client.replaceDocument(documentLink, account, (err, result) => {
        callback(err, result);
    });
}

function deleteAccount(id, res, callback) {
    var client = new documentClient(endpoint, { "masterKey": authKey });
    var documentLink = collectionLink + '/docs/' + id;
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