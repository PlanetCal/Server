'use strict'

module.exports = function (config, logger) {
    var express = require('express');
    var router = express.Router();
    var request = require('request-promise');

    var databaseName = config.documentdbDatabaseName;
    var collectionName = config.usersCollectionName;
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
        logger.get().debug({ req: req }, 'Retriving user object.');
        var result = yield* getUserBasicAsync(req);
        logger.get().debug({ req: req, user: result }, 'user object retrived successfully.');
        res.status(200).json(result);
    }));

    //Adding a group with groupId to the list of subscribed groups
    router.post('/:id/followingGroups/:groupId', helpers.wrap(function* (req, res) {
        checkCallerPermission(req, req.params.id);
        checkCallerPermission(req, req.body.id);

        //obtain the existing saved object.        
        var user = yield* getUserBasicAsync(req);

        user.modifiedTime = (new Date()).toUTCString();

        if (!user.followingGroups) {
            user.followingGroups = [];
        }

        var index = user.followingGroups.indexOf(req.params.groupId);
        if (index == -1) {
            user.followingGroups.push(req.params.groupId);
            logger.get().info({ req: req }, 'Adding a new group to follow');

            var documentResponse = yield dal.updateAsync(req.params.id, user);

            logger.get().debug({ req: req, user: documentResponse.resource }, 'user object updated successfully.');
            res.status(200).json({ id: req.params.groupId });
        }
        else {
            res.status(202).json({ id: req.params.groupId });
        }
    }));

    router.post('/:id/incrementOwnedGroupsCount', helpers.wrap(function* (req, res) {
        yield* updateOwnedGroupsCount(req, res, config, logger, true);
    }));

    router.post('/:id/decrementOwnedGroupsCount', helpers.wrap(function* (req, res) {
        yield* updateOwnedGroupsCount(req, res, config, logger, false);
    }));

    //Deleting a group with groupId to the list of subscribed groups
    router.delete('/:id/followingGroups/:groupId', helpers.wrap(function* (req, res) {
        checkCallerPermission(req, req.params.id);
        checkCallerPermission(req, req.body.id);

        //obtain the existing saved object.        
        var user = yield* getUserBasicAsync(req);

        user.modifiedTime = (new Date()).toUTCString();
        if (!user.followingGroups) {
            res.status(202).json({ id: req.params.groupId });
        }
        else {
            var index = user.followingGroups.indexOf(req.params.groupId);
            if (index != -1) {
                user.followingGroups.splice(index, 1);
            }

            logger.get().info({ req: req }, 'Removing a new group from following');
            var documentResponse = yield dal.updateAsync(req.params.id, user);
            logger.get().debug({ req: req, user: documentResponse.resource }, 'user object updated successfully.');
            res.status(200).json({ id: req.params.groupId });
        }
    }));

    router.put('/:id', helpers.wrap(function* (req, res) {
        // TODO: Validate userdetails objects in body
        var user = req.body;

        checkCallerPermission(req, req.params.id);
        checkCallerPermission(req, req.body.id);

        //obtain the existing saved object.        
        var currentUser = yield* getUserBasicAsync(req);

        currentUser.followingGroups = user.followingGroups;
        currentUser.modifiedTime = (new Date()).toUTCString();

        logger.get().debug({ req: req }, 'Updating user object.');
        var documentResponse = yield dal.updateAsync(req.params.id, currentUser);

        logger.get().debug({ req: req, user: documentResponse.resource }, 'user object updated successfully.');
        res.status(200).json({ id: documentResponse.resource.id });
    }));

    function checkCallerPermission(req, id) {
        /*
        logger.get().debug({req : req}, 'Checking user permission. header.auth-identity %s, id: %s...', req.headers['auth-identity'], req.params.id);
        if (req.headers['auth-identity'] !== id){
            throw new ForbiddenException('Forbidden');
        } 
        */
    }

    function* updateOwnedGroupsCount(req, res, config, logger, increment) {
        checkCallerPermission(req, req.params.id);
        checkCallerPermission(req, req.body.id);

        //obtain the existing saved object.        
        var user = yield* getUserBasicAsync(req);

        user.modifiedTime = (new Date()).toUTCString();
        if (!user.ownedGroupsCount) {
            user.ownedGroupsCount = 0;
        }
        if (!user.ownedGroupsLimit) {
            user.ownedGroupsLimit = config.defaultOwnedGroupsLimit;
        }

        if (increment) {
            if (user.ownedGroupsCount === user.ownedGroupsLimit) {
                throw new BadRequestException(`Reached Groups Count Limit of ${user.ownedGroupsLimit}.`, errorcode.OwnedGroupsLimitReached);
            } else {
                user.ownedGroupsCount++;
            }
        }
        else {
            if (user.ownedGroupsCount > 0) {
                user.ownedGroupsCount--;
            }
        }
        var documentResponse = yield dal.updateAsync(req.params.id, user);
        logger.get().debug({ req: req, user: documentResponse.resource }, 'user object updated successfully.');
        res.status(200).json({ id: req.params.groupId });
    }

    function* getUserBasicAsync(req) {
        var querySpec = {
            //query: "SELECT e.id, e.email, e.name, e.passwordHash, e.emailValidation, e.newPasswordHash, e.newEmailValidation, e.createdTime, e.updatedTime, e.followingGroups FROM root e WHERE e.id = @id",
            query: "SELECT * FROM root e WHERE e.id = @id",
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

