'use strict'

module.exports = function(config, logger){
    var express = require('express');
    var router = express.Router();
    var request = require('request-promise');

    var databaseName = config.documentdbDatabaseName;
    var collectionName = config.userDetailsCollectionName;
    var documentdbEndpoint = config.documentdbEndpoint;
    var documentdbAuthKey = config.documentdbAuthKey;
    var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
    var dal = new DataAccessLayer(databaseName, collectionName, documentdbEndpoint, documentdbAuthKey);

    var helpers = require('../../common/helpers.js');
    var BadRequestException = require('../../common/error.js').BadRequestException;
    var ForbiddenException = require('../../common/error.js').ForbiddenException;
    var NotFoundException = require('../../common/error.js').NotFoundException;

    router.get('/:id', helpers.wrap(function *(req, res) {    
        logger.get().debug({req : req}, 'Retriving userDetails object.');
        var result = yield *getUserDetailsBasicAsync(req);
        logger.get().debug({req : req, userDetails : result}, 'userDetails object retrived successfully.');
        res.status(200).json(result);
    }));

    router.put('/:id', helpers.wrap(function *(req, res) {
        if (!req.body) {
            throw new BadRequestException('Empty body.');
        }
        var userDetails = req.body;
        if (!userDetails) {
            throw new BadRequestException('UserDetails object is not found in body.');
        }

        checkCallerPermission(req, req.params.id);
        checkCallerPermission(req, req.body.id);

        logger.get().debug({req : req}, 'Updating userDetails object.');
        var documentResponse = yield dal.updateAsync(req.params.id, userDetails);
        logger.get().debug({req : req, userDetails : documentResponse.resource}, 'userDetails object updated successfully.');

        res.status(200).json({ id : documentResponse.resource.id });
    }));

    router.post('/', helpers.wrap(function *(req, res) {
        if (!req.body) {
            throw new BadRequestException('Empty body.');
        }
        var userDetails = req.body;
        if (!userDetails) {
            throw new BadRequestException('UserDetails object is not found in body.');
        }

        checkCallerPermission(req, req.body.id);

        logger.get().debug({req : req}, 'Creating userDetails object.');
        var documentResponse = yield dal.insertAsync(userDetails, {});
        logger.get().debug({req : req, userDetails : documentResponse.resource}, 'userDetails object created successfully.');

        res.status(200).json({ id : documentResponse.resource.id });
    }));

    router.delete('/:id', helpers.wrap(function *(req, res) {
        checkCallerPermission(req, req.params.id);

        logger.get().debug({req : req}, 'Deleting userDetails object...');
        var documentResponse = yield dal.removeAsync(req.params.id);
        logger.get().debug({req : req}, 'userDetails object deleted successfully.', documentResponse.resource.id);

        res.status(200).json({ id : req.params.id });
    }));

    return router;
}

function checkCallerPermission(req, id){
    logger.get().debug({req : req}, 'Checking user permission. header.auth-identity %s, id: %s...', req.headers['auth-identity'], req.params.id);
    if (req.headers['auth-identity'] !== id){
        throw new ForbiddenException('Forbidden');
    } 
}

function *getUserDetailsBasicAsync(req){
    var querySpec = {
        query: "SELECT a.id, a.email, a.name, a.followingGroups FROM root a WHERE a.id = @id",
        parameters: [
            {
                name: '@id',
                value: req.params.id
            }
        ]
    };

    checkCallerPermission(req, req.params.id);

    logger.get().debug({req : req, querySpec : querySpec}, 'Retrieving from db...');
    var documentResponse = yield dal.getAsync(querySpec); 

    var results = documentResponse.feed;
    logger.get().debug({req : req, querySpec : querySpec}, 'Db retrivial completed successfully. # of records: %d', results.length);
    if (results.length > 0){
        return results[0];
    }
    else{
        throw new NotFoundException('UserDetails with id ' + req.params.id + ' not found.');
    }    
}
