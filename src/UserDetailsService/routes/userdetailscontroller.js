'use strict'

module.exports = function (config, logger) {
    var express = require('express');
    var router = express.Router();
    var request = require('request-promise');

    var databaseName = config.documentdbDatabaseName;
    var collectionName = config.userDetailsCollectionName;
    var documentdbEndpoint = config.documentdbEndpoint;
    var documentdbAuthKey = config.documentdbAuthKey;
    var DataAccessLayer = require('../common/dal.js').DataAccessLayer;
    var serviceNames = require('../common/constants.json')['serviceNames'];
    var urlNames = require('../common/constants.json')['urlNames'];
    var dal = new DataAccessLayer(databaseName, collectionName, documentdbEndpoint, documentdbAuthKey);

    var helpers = require('../common/helpers.js');
    var BadRequestException = require('../common/error.js').BadRequestException;
    var ForbiddenException = require('../common/error.js').ForbiddenException;
    var errorcode = require('../common/errorcode.json');

    router.get('/:id', helpers.wrap(function* (req, res) {
        logger.get().debug({ req: req }, 'Retriving userDetails object.');
        var result = yield* getUserDetailsBasicAsync(req);
        logger.get().debug({ req: req, userDetails: result }, 'userDetails object retrived successfully.');
        res.status(200).json(result);
    }));

    router.post('/', helpers.wrap(function* (req, res) {
        // TODO: Validate userdetails objects in body
        var userDetails = req.body;

        // //adding a default group ref. It is created after creating the user details object.
        // userDetails.followingGroups = [userDetails.id];
        // checkCallerPermission(req, req.body.id);

        logger.get().info({ req: req }, 'Creating userDetails object.');
        var documentResponse = yield dal.insertAsync(userDetails, {});
        logger.get().info({ req: req, userDetails: documentResponse.resource }, 'userDetails object created successfully.');

        // //Creating the default group.
        // var defaultGroup = {
        //     id: userDetails.id,
        //     privacy: "Closed",
        //     category: "Personal",
        //     name: "My personal Group",
        //     description: "The default group assigned to me for creating private events. Nobody else can see it unless I share it with my friends, using share option.",
        // };
        // req.body = defaultGroup;
        // var options = helpers.getRequestOption(req, config.groupsServiceEndpoint + '/' + urlNames.groups, 'POST');
        // var results = yield* helpers.forwardHttpRequest(options, serviceNames.groupsServiceName);

        res.status(201).json({ id: documentResponse.resource.id });
    }));

    router.post('/:id/followingGroups/:groupId', helpers.wrap(function* (req, res) {
        checkCallerPermission(req, req.params.id);
        checkCallerPermission(req, req.body.id);

        //obtain the existing saved object.        
        var userDetails = yield* getUserDetailsBasicAsync(req);

        userDetails.modifiedTime = (new Date()).toUTCString();
        if (!userDetails.followingGroups) {
            userDetails.followingGroups = [];
        }

        var index = userDetails.followingGroups.indexOf(req.params.groupId);
        if (index == -1) {
            userDetails.followingGroups.push(req.params.groupId);
            logger.get().info({ req: req }, 'Adding a new group to follow');
            var documentResponse = yield dal.updateAsync(req.params.id, userDetails);
            logger.get().debug({ req: req, userDetails: documentResponse.resource }, 'userDetails object updated successfully.');

            res.status(200).json({ id: documentResponse.resource.id });
        }
        else {
            res.status(202).json({ id: req.params.id });
        }
    }));

    router.delete('/:id/followingGroups/:groupId', helpers.wrap(function* (req, res) {
        checkCallerPermission(req, req.params.id);
        checkCallerPermission(req, req.body.id);

        //obtain the existing saved object.        
        var userDetails = yield* getUserDetailsBasicAsync(req);

        userDetails.modifiedTime = (new Date()).toUTCString();
        if (!userDetails.followingGroups) {
            res.status(202).json({ id: req.params.id });
        }
        else {
            var index = userDetails.followingGroups.indexOf(req.params.groupId);
            if (index != -1) {
                userDetails.followingGroups.splice(index, 1);
            }

            logger.get().info({ req: req }, 'Removing a new group from following');
            var documentResponse = yield dal.updateAsync(req.params.id, userDetails);
            logger.get().debug({ req: req, userDetails: documentResponse.resource }, 'userDetails object updated successfully.');
            res.status(200).json({ id: documentResponse.resource.id });
        }
    }));

    router.put('/:id', helpers.wrap(function* (req, res) {
        // TODO: Validate userdetails objects in body
        var userDetails = req.body;

        checkCallerPermission(req, req.params.id);
        checkCallerPermission(req, req.body.id);

        //obtain the existing saved object.        
        var currentUserDetails = yield* getUserDetailsBasicAsync(req);

        userDetails.modifiedTime = (new Date()).toUTCString();
        if (!userDetails.followingGroups) {
            userDetails.followingGroups = currentUserDetails.followingGroups;
        }

        logger.get().debug({ req: req }, 'Updating userDetails object.');
        var documentResponse = yield dal.updateAsync(req.params.id, userDetails);
        logger.get().debug({ req: req, userDetails: documentResponse.resource }, 'userDetails object updated successfully.');

        res.status(200).json({ id: documentResponse.resource.id });
    }));

    router.delete('/:id', helpers.wrap(function* (req, res) {
        checkCallerPermission(req, req.params.id);

        logger.get().debug({ req: req }, 'Deleting userDetails object...');
        var documentResponse = yield dal.removeAsync(req.params.id);
        logger.get().debug({ req: req }, 'userDetails object deleted successfully.', req.params.id);

        res.status(200).json({ id: req.params.id });
    }));

    function checkCallerPermission(req, id) {
        /*
        logger.get().debug({req : req}, 'Checking user permission. header.auth-identity %s, id: %s...', req.headers['auth-identity'], req.params.id);
        if (req.headers['auth-identity'] !== id){
            throw new ForbiddenException('Forbidden');
        } 
        */
    }

    function* getUserDetailsBasicAsync(req) {
        var querySpec = {
            query: "SELECT a.id, a.name, a.country, a.region, a.city, a.followingGroups FROM root a WHERE a.id = @id",
            parameters: [
                {
                    name: '@id',
                    value: req.params.id
                }
            ]
        };

        checkCallerPermission(req, req.params.id);

        logger.get().debug({ req: req, querySpec: querySpec }, 'Retrieving from db...');
        var documentResponse = yield dal.getAsync(querySpec);

        var results = documentResponse.feed;
        logger.get().debug({ req: req, querySpec: querySpec }, 'Db retrivial completed successfully. # of records: %d', results.length);
        if (results.length > 0) {
            return results[0];
        }
        else {
            return {};
        }
    }

    return router;
}

