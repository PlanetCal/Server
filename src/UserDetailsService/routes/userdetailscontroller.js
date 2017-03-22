'use strict'

var express = require('express');
var router = express.Router();
var config = require('../../common/config.js');

var databaseName = config.documentdbDatabaseName;
var collectionName = config.userDetailsCollectionName;
var DataAccessLayer = require('../../common/dal2.js').DataAccessLayer;
var dal = new DataAccessLayer(databaseName, collectionName);
var Helpers = require('../../common/helpers.js').Helpers;
var helpers = new Helpers();

router.get('/:id', function (req, res) {
    var querySpec = {
        query: "SELECT a.id, a.email, a.name, a.followingGroups FROM root a WHERE a.id = @id",
        parameters: [
            {
                name: '@id',
                value: req.params.id
            }
        ]
    };

    if (checkCallerPermission(req, req.params.id, res)){
        dal.get(querySpec)
            .then(function(documentResponse){
                var results = documentResponse.feed;
                if (results.length > 0){
                    res.status(200);
                    // TODO: assert when results has more than 1 element.
                    res.send(results[0]);
                }
                else{
                    res.status(404);
                    res.json({ code : 404, name: 'NotFound', messae: 'Resource ' + req.params.id + ' not found.'});
                }
            })
            .fail(function(err){
                res.status(err.code);
                res.json(helpers.createErrorJson(err));
            });
    }
});

router.put('/:id', function (req, res) {
    if (!req.body) {
        res.status(400);
        res.json({ code : 400, name: 'BadRequest', messae: 'Request body not found.'});
    }
    var userDetails = req.body;
    if (!userDetails) {
        res.status(400);
        res.json({ code : 400, name: 'BadRequest', messae: 'UserDetails in body not found.'});
    }
    if (checkCallerPermission(req, req.params.id, res)
        && checkCallerPermission(req, req.body.id, res)){
        dal.update(req.params.id, userDetails)
            .then(function(documentResponse){
                res.status(200);
                res.json({ id : documentResponse.resource.id });
            })
            .fail(function(err){
                res.status(err.code);
                res.json(helpers.createErrorJson(err));
            });
    }
});

router.post('/', function (req, res) {
    if (!req.body) {
        res.send(400);
        res.json({ code : 400, name: 'BadRequest', messae: 'Request body not found.'});
    }
    var userDetails = req.body;
    if (!userDetails) {
        res.send(400);
        res.json({ code : 400, name: 'BadRequest', messae: 'UserDetails in body not found.'});
    }
    if (checkCallerPermission(req, req.body.id, res)){
        dal.insert(userDetails, {})
            .then(function(documentResponse){
                res.status(201);
                res.json({ id : documentResponse.resource.id });
            })
            .fail(function(err){
                res.status(err.code);
                res.json(helpers.createErrorJson(err));
            });
    }
});

router.delete('/:id', function (req, res) {
    if (checkCallerPermission(req, req.params.id, res)){
        dal.remove(req.params.id)
            .then(function(){
                res.status(200);
                res.json({ id : req.params.id });                    
            })
            .fail(function(err){
                res.status(err.code);
                res.json(helpers.createErrorJson(err));
            });
    }
});

function checkCallerPermission(req, id, res){
    if (req.headers['auth-identity'] !== id){
        res.status(403);
        res.json({ code : 403, name: 'Forbidden', messae: 'Operation forbidden.'});

        return false;
    } 

    return true;

}
module.exports = router;