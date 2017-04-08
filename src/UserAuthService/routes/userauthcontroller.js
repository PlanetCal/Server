'use strict'

var router = require('express').Router();
var TokenGenerator = new require('../../common/tokengenerator.js').TokenGenerator;
var PasswordCrypto = require('../passwordcrypto.js').PasswordCrypto;
var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
var config = require('../../common/config.js');
var dal = new DataAccessLayer(config.documentdbDatabaseName, config.usersCollectionName);
var helpers = require('../../common/helpers.js');
var BadRequestException = require('../../common/error.js').BadRequestException;
var ForbiddenException = require('../../common/error.js').ForbiddenException;

module.exports = function(passport){

    router.post('/', helpers.wrap(function *(req, res){
        if (!req.body || !req.body.email || !req.body.password){
            throw new BadRequestException('Cannot find email and password in body.');
        }
        else{
            var passwordCrypto = new PasswordCrypto();
            var passwordHash = passwordCrypto.generateHash(req.body.password);
            var options = { preTriggerInclude: config.insertUniqueUserTriggerName };   

            var documentResponse = yield dal.insertAsync({ email: req.body.email, passwordHash: passwordHash, name : req.body.name }, options);
            res.status(201);
            res.json({ email : documentResponse.resource.email, id : documentResponse.resource.id, name : documentResponse.resource.name });                
        }
    }));

    router.put('/:id', helpers.wrap(function *(req, res){
        if (!req.body || !req.body.email || !req.body.password){
            throw new BadRequestException('Cannot find email and password in body.');
        }
        else if (!isOperationAuthorized(req)){
            throw new ForbiddenException('Forbidden.');
        }
        else{
            var passwordCrypto = new PasswordCrypto();
            var passwordHash = passwordCrypto.generateHash(req.body.password);

            var documentResponse = yield dal.updateAsync(req.params.id, { email: req.body.email, passwordHash: passwordHash, id: req.params.id});
            res.status(200);
            res.json({ id : documentResponse.resource.id });
        }
    }));

    router.delete('/:id', helpers.wrap(function *(req, res){
        //all small letters even if header name has capitals
        if (!isOperationAuthorized(req)){
            throw new ForbiddenException('Forbidden.');
        }
        else {
            var documentResponse = yield dal.removeAsync(req.params.id);
            res.status(200);
            res.json({ id : req.params.id });
        }
    }));
    return router;  
}

function isOperationAuthorized(req){
    return req.headers['auth-identity'] === req.params.id;
}