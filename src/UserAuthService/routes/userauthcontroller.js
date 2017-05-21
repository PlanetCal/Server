'use strict'

module.exports = function(passport, config, logger){

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
    var errorcode = require('../../common/errorcode.json');

    router.post('/', helpers.wrap(function *(req, res){
        if (!req.body.email || !req.body.password || !req.body.name){
            throw new BadRequestException('Cannot find email, password or name in body.', errorcode.EmailOrPasswordNotFoundInBody);
        }
        else{
            logger.get().debug({req : req}, 'Creating userAuth object...');

            var passwordCrypto = new PasswordCrypto();
            var passwordHash = passwordCrypto.generateHash(req.body.password);
            var options = { preTriggerInclude: config.insertUniqueUserTriggerName };   

            var documentResponse = yield dal.insertAsync({ email: req.body.email, passwordHash: passwordHash, name : req.body.name, firstTimeLogon : true }, options);

            logger.get().debug({req : req, userAuth : documentResponse.resource }, 'userAuth object created successfully.');

            res.status(201).json({ email : documentResponse.resource.email, id : documentResponse.resource.id, name : documentResponse.resource.name, firstTimeLogon : true });                
        }
    }));

    router.put('/:id', helpers.wrap(function *(req, res){
        if (!req.body.email || !req.body.password || !req.body.name){
            throw new BadRequestException('Cannot find email, password or name in body.', errorcode.EmailOrPasswordNotFoundInBody);
        }
        else if (!isOperationAuthorized(req)){
            throw new ForbiddenException('Forbidden.');
        }
        else{
            logger.get().debug({req : req}, 'Updating userAuth object...');
            var passwordCrypto = new PasswordCrypto();
            var passwordHash = passwordCrypto.generateHash(req.body.password);

            var documentResponse = yield dal.updateAsync(req.params.id, { email: req.body.email, passwordHash: passwordHash, id: req.params.id, name : req.body.name });

            logger.get().debug({req : req, userAuth: documentResponse.resource}, 'userAuth object updated successfully.');

            res.status(200).json({ id : documentResponse.resource.id });
        }
    }));

    router.delete('/:id', helpers.wrap(function *(req, res){
        //all small letters even if header name has capitals
        if (!isOperationAuthorized(req)){
            throw new ForbiddenException('Forbidden.');
        }
        else {
            logger.get().debug({req : req}, 'Deleting userAuth object...');
            var documentResponse = yield dal.removeAsync(req.params.id);
            logger.get().debug({req : req}, 'userAuth object deleted successfully.');
            res.status(200).json({ id : req.params.id });
        }
    }));
    return router;  
}

function isOperationAuthorized(req){
    return req.headers['auth-identity'] === req.params.id;
}