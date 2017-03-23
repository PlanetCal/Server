'use strict'

module.exports = function(passport){

    var router = require('express').Router();
    var TokenGenerator = new require('../../common/tokengenerator.js').TokenGenerator;
    var PasswordCrypto = require('../passwordcrypto.js').PasswordCrypto;
    var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
    var config = require('../../common/config.js');
    var dal = new DataAccessLayer(config.documentdbDatabaseName, config.usersCollectionName);
    var Helpers = require('../../common/helpers.js').Helpers;
    var helpers = new Helpers();

    router.post('/', function(req, res){
        if (!req.body || !req.body.email || !req.body.password){
            res.status(400);
            res.json({ code: 400, name: 'BadRequest', message: 'Cannot find email and password in body.'});
        }
        else{
            var passwordCrypto = new PasswordCrypto();
            var passwordHash = passwordCrypto.generateHash(req.body.password);
            var options = { preTriggerInclude: config.insertUniqueUserTriggerName };            
            dal.insert({ email: req.body.email, passwordHash: passwordHash }, options)
                .then(function(documentResponse){
                    res.status(201);
                    res.json({ email : documentResponse.resource.email, id : documentResponse.resource.id });
                })
                .fail(function(err){
                    res.status(err.code);
                    res.json(helpers.createErrorJson(err));
                });
        }
    });

    router.put('/:id', function(req, res){
        if (!req.body || !req.body.email || !req.body.password){
            res.status(400);
            res.json({ code: 400, name: 'BadRequest', message: 'Cannot find email and password in body.'});
        }
        else if (!isOperationAuthorized(req)){
            res.status(403);
            res.json({ code : 403, name: 'Forbidden', messae: 'Operation forbidden.'});
        }
        else{
            var passwordCrypto = new PasswordCrypto();
            var passwordHash = passwordCrypto.generateHash(req.body.password);

            dal.update(req.params.id, { email: req.body.email, passwordHash : passwordHash, id : req.params.id })
                .then(function(documentResponse){
                    res.status(200);
                    res.json({ id : documentResponse.resource.id });
                })
                .fail(function(err){
                    res.status(err.code);
                    res.json(helpers.createErrorJson(err));
                });
        }
    })

    router.delete('/:id', function(req, res){
        //all small letters even if header name has capitals
        if (!isOperationAuthorized(req)){
            res.status(403);
            res.json({ code : 403, name: 'Forbidden', messae: 'Operation forbidden.'});
        }
        else {
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
    })
    return router;  
}

function isOperationAuthorized(req){
    return req.headers['auth-identity'] === req.params.id;
}