'use strict'

module.exports = function(passport){

    var router = require('express').Router();
    var TokenGenerator = new require('../../common/tokengenerator.js').TokenGenerator;
    var PasswordCrypto = require('../passwordcrypto.js').PasswordCrypto;
    var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
    var config = require('../../common/config.js');
    var dal = new DataAccessLayer(config.documentdbDatabaseName, config.usersCollectionName);
    var helpers = require('../../common/helpers.js');
    var BadRequestError = require('../../common/error.js').BadRequestError;
    var ForbiddenError = require('../../common/error.js').ForbiddenError;

    router.post('/', helpers.wrap(function *(req, res){
        if (!req.body || !req.body.email || !req.body.password){
            throw new BadRequestError('Cannot find email and password in body.');
        }
        else{
            var passwordCrypto = new PasswordCrypto();
            var passwordHash = passwordCrypto.generateHash(req.body.password);
            var options = { preTriggerInclude: config.insertUniqueUserTriggerName };   

            var documentResponse = yield dal.insert({ email: req.body.email, passwordHash: passwordHash }, options);
            res.status(201);
            res.json({ email : documentResponse.resource.email, id : documentResponse.resource.id });                
        }
    }));

    router.put('/:id', helpers.wrap(function *(req, res){
        if (!req.body || !req.body.email || !req.body.password){
            throw new BadRequestError('Cannot find email and password in body.');
        }
        else if (!isOperationAuthorized(req)){
            throw new ForbiddenError('Forbidden.');
        }
        else{
            var passwordCrypto = new PasswordCrypto();
            var passwordHash = passwordCrypto.generateHash(req.body.password);

            var documentResponse = yield dal.update(req.params.id, { email: req.body.email, passwordHash: passwordHash, id: req.params.id});
            res.status(200);
            res.json({ id : documentResponse.resource.id });
        }
    }));

    router.delete('/:id', helpers.wrap(function *(req, res){
        //all small letters even if header name has capitals
        if (!isOperationAuthorized(req)){
            throw new ForbiddenError('Forbidden.');
        }
        else {
            var documentResponse = yield dal.remove(req.params.id);
            res.status(200);
            res.json({ id : req.params.id });
        }
    }));
    return router;  
}

function isOperationAuthorized(req){
    return req.headers['auth-identity'] === req.params.id;
}