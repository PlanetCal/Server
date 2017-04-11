'use strict'

module.exports = function(passport, config){

    var router = require('express').Router();
    var PasswordCrypto = require('../passwordcrypto.js').PasswordCrypto;

    var databaseName = config.documentdbDatabaseName;
    var collectionName = config.usersCollectionName;
    var documentdbEndpoint = config.documentdbEndpoint;
    var documentdbAuthKey = config.documentdbAuthKey;
    var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
    var dal = new DataAccessLayer(databaseName, collectionName, documentdbEndpoint, documentdbAuthKey);

    var helpers = require('../../common/helpers.js');
    var BadRequestException = require('../../common/error.js').BadRequestException;
    var ForbiddenException = require('../../common/error.js').ForbiddenException;

    router.post('/', helpers.wrap(function *(req, res){
        if (!req.body || !req.body.email || !req.body.password || !req.body.name){
            throw new BadRequestException('Cannot find email, password or name in body.');
        }
        else{
            var passwordCrypto = new PasswordCrypto();
            var passwordHash = passwordCrypto.generateHash(req.body.password);
            var options = { preTriggerInclude: config.insertUniqueUserTriggerName };   

            var documentResponse = yield dal.insertAsync({ email: req.body.email, passwordHash: passwordHash, name : req.body.name }, options);
            res.status(201).json({ email : documentResponse.resource.email, id : documentResponse.resource.id, name : documentResponse.resource.name });                
        }
    }));

    router.put('/:id', helpers.wrap(function *(req, res){
        if (!req.body || !req.body.email || !req.body.password || !req.body.name){
            throw new BadRequestException('Cannot find email, password or name in body.');
        }
        else if (!isOperationAuthorized(req)){
            throw new ForbiddenException('Forbidden.');
        }
        else{
            var passwordCrypto = new PasswordCrypto();
            var passwordHash = passwordCrypto.generateHash(req.body.password);

            var documentResponse = yield dal.updateAsync(req.params.id, { email: req.body.email, passwordHash: passwordHash, id: req.params.id, name : req.body.name });
            res.status(200).json({ id : documentResponse.resource.id });
        }
    }));

    router.delete('/:id', helpers.wrap(function *(req, res){
        //all small letters even if header name has capitals
        if (!isOperationAuthorized(req)){
            throw new ForbiddenException('Forbidden.');
        }
        else {
            var documentResponse = yield dal.removeAsync(req.params.id);
            res.status(200).json({ id : req.params.id });
        }
    }));
    return router;  
}

function isOperationAuthorized(req){
    return req.headers['auth-identity'] === req.params.id;
}