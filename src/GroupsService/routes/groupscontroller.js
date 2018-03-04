'use strict'

module.exports = function (config, logger) {

    var express = require('express');
    var router = express.Router();
    var databaseName = config.documentdbDatabaseName;
    var collectionName = config.groupsCollectionName;
    var documentdbEndpoint = config.documentdbEndpoint;
    var documentdbAuthKey = config.documentdbAuthKey;
    var DataAccessLayer = require('../common/dal.js').DataAccessLayer;
    var dal = new DataAccessLayer(databaseName, collectionName, documentdbEndpoint, documentdbAuthKey);
    var util = require('util');
    var helpers = require('../common/helpers.js');
    var BadRequestException = require('../common/error.js').BadRequestException;
    var errorcode = require('../common/errorcode.json');
    var allowedCategories = ["School", "Work", "Sports", "Local", "Religious"];
    var allowedGroupFields = ["name", "description", "icon", "parentGroup", "administrators", "location", "address", "contact", "website", "createdBy", "privacy", "category", "childGroups", "deleted"];
    var allowedPrivacySettings = ["Private", "Public"];
    var serviceNames = require('../common/constants.json')['serviceNames'];
    var urlNames = require('../common/constants.json')['urlNames'];

    router.get('/:id', helpers.wrap(function* (req, res) {
        var fields = req.query.fields ? req.query.fields.split('|') : null;

        logger.get().debug({ req: req }, 'Retriving group object...');

        var userId = req.headers['auth-identity'];

        var documentResponse = yield findGroupsByGroupIdsAsync([req.params.id], fields, userId);

        var result = documentResponse.feed.length > 0 ? documentResponse.feed[0] : {};

        logger.get().debug({ req: req, group: result }, 'group object with fields retrieved successfully.');

        // TODO: assert when results has more than 1 element.
        res.status(200).json(result);
    }));

    router.get('/', helpers.wrap(function* (req, res) {
        logger.get().debug({ req: req }, 'Retriving all group objects...');

        var keywords = req.query.keywords ? req.query.keywords.split('|') : null;
        var fields = req.query.fields ? req.query.fields.split('|') : null;
        var filterExpression = req.query.filter;


        var groupIds = req.query.groupids ? req.query.groupids.split('|') : null;
        var administeredByMe = req.query.administeredByMe;
        var userId = req.headers['auth-identity'];

        var documentResponse;
        if (keywords) {
            documentResponse = yield findGroupByKeywordsAsync(keywords, fields, userId);
        } else if (groupIds) {
            documentResponse = yield findGroupsByGroupIdsAsync(groupIds, fields, userId);
        } else if (administeredByMe === "true") {
            var currentUsersEmail = req.headers['auth-email'];
            documentResponse = yield findMyAdministeredGroups([currentUsersEmail], fields);
        }
        else {
            documentResponse = yield findAllGroupAsync(fields, userId, filterExpression);
        }

        var results = documentResponse.feed;
        var filteredResults = helpers.removeDuplicatedItemsById(results);
        logger.get().debug({ req: req, groups: filteredResults }, 'group objects retrieved successfully. unfiltered count: %d. filtered count: %d.', results.length, filteredResults.length);
        res.status(200).json(filteredResults);
    }));

    router.post('/', helpers.wrap(function* (req, res) {
        // TODO: Validate group objects in body
        var group = req.body;
        //Setting the id. If the object does not have it, the create call fails for some reason.
        if (!group.id) {
            group.id = helpers.generateGuid();
        }

        if (!group.category || allowedCategories.indexOf(group.category) < 0) {
            throw new BadRequestException('Group payload does not contain category field or it is not in the allowed category list.', errorcode.GroupShouldContainCategory);
        };

        if (!group.privacy || allowedPrivacySettings.indexOf(group.privacy) < 0) {
            throw new BadRequestException('Group payload does not contain privacy field or it is not in the allowed list.', errorcode.GroupShouldContainPrivacySetting);
        };

        if (group.administrators) {
            for (var i = 0; i < group.administrators.length; i++) {
                if (!helpers.isEmailValid(group.administrators[i])) {
                    throw new BadRequestException(group.administrators[i] + ' is not a valid administrator email.', errorcode.InvalidEmail);
                }
            }
        };

        var userId = req.headers['auth-identity'];
        //if group has a parentGroup, we need to check if user has permisison to create a sub group under it. 
        //And if it does, update the parentGroup by adding the current group under its childGroups.
        if (group.parentGroup) {
            //fetch parentGroup
            var documentResponse = yield findGroupsByGroupIdsAsync([group.parentGroup], allowedGroupFields, userId);
            var parentGroup = documentResponse.feed.length > 0 ? documentResponse.feed[0] : {};
            if (parentGroup.id != group.parentGroup) {
                throw new BadRequestException('Specified parent group in payload does not exist.', errorcode.GroupNotExistant);
            }
            var permissionGranted = parentGroup.privacy === "Public" ||
                (parentGroup.createdBy && parentGroup.createdBy === req.headers['auth-identity']) ||
                (parentGroup.modifiedBy && parentGroup.modifiedBy === req.headers['auth-identity']);

            if (!permissionGranted) {
                throw new BadRequestException('User is not authorized to create a group under the group with id ' + parentGroup.id, errorcode.UserNotAuthorized);
            }

            parentGroup.modifiedBy = req.headers['auth-identity'];
            parentGroup.modifiedTime = (new Date()).toUTCString();
            if (!parentGroup.childGroups) {
                parentGroup.childGroups = [];
            }
            parentGroup.childGroups.push(group.id)
            var documentResponse = yield dal.updateAsync(parentGroup.id, parentGroup);
        }

        group.createdBy = req.headers['auth-identity'];
        group.createdTime = (new Date()).toUTCString();

        yield* updateUsersOwnedGroupsCount(req, logger, config, urlNames, helpers, true);

        yield* sendEmailsToAddedAndRemovedAdmins(logger, helpers, [], group.administrators, req.headers['auth-email'], req.headers['auth-name'], config.planetCalLoginUrl, group.name);

        yield* helpers.updateEntityGeoLocation(group);

        logger.get().debug({ req: req, group: group }, 'Creating group object...');

        var documentResponse = yield dal.insertAsync(group, {});
        logger.get().debug({ req: req, group: documentResponse.resource }, 'group object created successfully.');

        res.status(201).json({ id: documentResponse.resource.id });
    }));

    router.put('/:id', helpers.wrap(function* (req, res) {
        // TODO: Validate group objects in body
        var group = req.body;

        if (group.id !== req.params.id) {
            throw new BadRequestException('Group Ids in body and in the url do not match.', errorcode.PayloadIdsDoNotMatch);
        }

        if (!group.category || allowedCategories.indexOf(group.category) < 0) {
            throw new BadRequestException('Group payload does not contain category field or it is not in the allowed category list.', errorcode.GroupShouldContainCategory);
        };

        if (!group.privacy || allowedPrivacySettings.indexOf(group.privacy) < 0) {
            throw new BadRequestException('Group payload does not contain privacy field or it is not in the allowed list.', errorcode.GroupShouldContainPrivacySetting);
        };

        if (group.administrators) {
            for (var i = 0; i < group.administrators.length; i++) {
                if (!helpers.isEmailValid(group.administrators[i])) {
                    throw new BadRequestException(group.administrators[i] + ' is not a valid administrator email.', errorcode.InvalidEmail);
                }
            }
        };

        group.modifiedBy = req.headers['auth-identity'];
        group.modifiedTime = (new Date()).toUTCString();

        var userId = req.headers['auth-identity'];

        //fetch existing group from the database so that we can check permissions        
        var documentResponse = yield findGroupsByGroupIdsAsync([group.id], allowedGroupFields, userId);
        var existingGroup = documentResponse.feed.length > 0 ? documentResponse.feed[0] : {};
        if (existingGroup.id != group.id) {
            throw new BadRequestException('Specified group in payload does not exist in the database. Can not update it.', errorcode.GroupNotExistant);
        }

        if (!helpers.areArraysIdentical(existingGroup.childGroups, group.childGroups)) {
            throw new BadRequestException('ChildGroups information has changed during update. It should remain same.', errorcode.ChildGroupsChanged);
        }

        if (group.category != existingGroup.category) {
            throw new BadRequestException('Group category should remain same, since it has child groups', errorcode.CategoryChangeNotAllowedDueToChildGroups);
        }

        if (group.privacy != existingGroup.privacy) {
            throw new BadRequestException('Group privacy should remain same, since it has child groups', errorcode.PrivacyChangeNotAllowedDueToChildGroups);
        }

        var permissionGranted = (existingGroup.createdBy && existingGroup.createdBy === req.headers['auth-identity']) ||
            (existingGroup.administrators && existingGroup.administrators.indexOf(req.headers['auth-email'].toLowerCase()) >= 0);

        if (!permissionGranted) {
            throw new BadRequestException('User is not authorized to update the group with id ' + existingGroup.id, errorcode.UserNotAuthorized);
        }

        yield* sendEmailsToAddedAndRemovedAdmins(logger, helpers, existingGroup.administrators, group.administrators, req.headers['auth-email'], req.headers['auth-name'], config.planetCalLoginUrl, group.name);

        group.createdBy = existingGroup.createdBy;
        group.createdTime = existingGroup.createdTime;

        //if group has a parentGroup, we need to check if user has permisison to create a sub group under it.
        //And we also need to update both parent groups by first removing it, and then adding it from the second one.
        var existingParentGroup = null;
        if (existingGroup.parentGroup && existingGroup.parentGroup !== group.parentGroup) {
            //fetch parentGroups
            var groupIdsToQuery = [existingGroup.parentGroup];
            if (group.parentGroup) {
                groupIdsToQuery.push(group.parentGroup);
            }
            var documentResponse = yield findGroupsByGroupIdsAsync(groupIdsToQuery, allowedGroupFields, userId);

            var existingParentGroup = null;
            var newParentGroup = null;

            for (var i = 0; i < documentResponse.feed.length; i++) {
                var parentGroup = documentResponse.feed[i];
                if (existingGroup.parentGroup === parentGroup.id) {
                    existingParentGroup = parentGroup;

                    //remove the currentGroup from existing parent Group.
                    if (!existingParentGroup.childGroups) {
                        existingParentGroup.childGroups = [];
                    } else {
                        var index = existingParentGroup.childGroups.indexOf(group.id);
                        existingParentGroup.childGroups.splice(index, 1);
                    }
                }
                else {
                    newParentGroup = parentGroup;
                    //Add the currentGroup to the childGroups of new parentGroup
                    if (!newParentGroup.childGroups) {
                        newParentGroup.childGroups = [];
                    }
                    newParentGroup.childGroups.push(group.id)
                }
                parentGroup.modifiedBy = req.headers['auth-identity'];
                parentGroup.modifiedTime = (new Date()).toUTCString();
                var permissionGranted = parentGroup.privacy === "Public" ||
                    (parentGroup.createdBy && parentGroup.createdBy === req.headers['auth-identity']) ||
                    (parentGroup.modifiedBy && parentGroup.modifiedBy === req.headers['auth-identity']);

                if (!permissionGranted) {
                    throw new BadRequestException('User is not authorized to update a group under the group with id ' + parentGroup.id, errorcode.UserNotAuthorized);
                }
            }

            yield dal.updateAsync(newParentGroup.id, newParentGroup);
            yield dal.updateAsync(existingParentGroup.id, existingParentGroup);
        }

        yield* helpers.updateEntityGeoLocation(group);

        logger.get().debug({ req: req, group: group }, 'Updating group object...');

        documentResponse = yield dal.updateAsync(req.params.id, group);
        logger.get().debug({ req: req, group: documentResponse.resource }, 'group object updated successfully.');

        res.status(200).json({ id: documentResponse.resource.id });
    }));

    router.delete('/:id', helpers.wrap(function* (req, res) {
        var userId = req.headers['auth-identity'];
        let deletedBy = req.headers['auth-email'];
        logger.get().info(`Group delete request issued by user ${deletedBy}. GroupId: ${req.params.id}`);
        //fetch existing group from the database so that we can check permissions        
        var documentResponse = yield findGroupsByGroupIdsAsync([req.params.id], allowedGroupFields, userId);
        var existingGroup = documentResponse.feed.length > 0 ? documentResponse.feed[0] : {};
        if (existingGroup.id != req.params.id) {
            throw new BadRequestException('Specified group does not exist in the database. Can not delete it.', errorcode.GroupNotExistant);
        }

        if (existingGroup.childGroups && existingGroup.childGroups.length > 0) {
            throw new BadRequestException('Specified group contains childGroups. First delete the child groups before deleting this group. Can not delete it.', errorcode.GroupHasChildGroups);
        }

        var permissionGranted = (existingGroup.createdBy && existingGroup.createdBy === req.headers['auth-identity']) ||
            (existingGroup.modifiedBy && existingGroup.modifiedBy === req.headers['auth-identity']) ||
            (existingGroup.administrators && existingGroup.administrators.indexOf(req.headers['auth-email'].toLowerCase()) >= 0);

        if (!permissionGranted) {
            throw new BadRequestException('User is not authorized to update the group with id ' + existingGroup.id, errorcode.UserNotAuthorized);
        }

        if (existingGroup.parentGroup) {
            //fetch parentGroup
            var documentResponse = yield findGroupsByGroupIdsAsync([existingGroup.parentGroup], allowedGroupFields, userId);
            var parentGroup = documentResponse.feed.length > 0 ? documentResponse.feed[0] : {};
            if (parentGroup.id != existingGroup.parentGroup) {
                throw new BadRequestException('Specified parent group in payload does not exist.', errorcode.GroupNotExistant);
            }
            var permissionGranted = parentGroup.privacy === "Public" ||
                (parentGroup.createdBy && parentGroup.createdBy === req.headers['auth-identity']) ||
                (parentGroup.modifiedBy && parentGroup.modifiedBy === req.headers['auth-identity']) ||
                (parentGroup.administrators && parentGroup.administrators.indexOf(req.headers['auth-email'].toLowerCase()) >= 0);

            if (!permissionGranted) {
                throw new BadRequestException('User is not authorized to create a group under the group with id ' + parentGroup.id, errorcode.UserNotAuthorized);
            }

            parentGroup.modifiedBy = req.headers['auth-identity'];
            parentGroup.modifiedTime = (new Date()).toUTCString();
            if (!parentGroup.childGroups) {
                parentGroup.childGroups = [];
            } else {
                var index = parentGroup.childGroups.indexOf(existingGroup.id);
                parentGroup.childGroups.splice(index, 1);
            }

            var documentResponse = yield dal.updateAsync(parentGroup.id, parentGroup);
        }

        // Deleting corresponding Events too.
        var eventsUrl = config.eventsServiceEndpoint + '/' + urlNames.events + '/deleteGroupsEvents';
        req.body = { groups: [req.params.id] };
        var options = helpers.getRequestOption(req, eventsUrl, 'POST');
        var results = yield* helpers.forwardHttpRequest(options, serviceNames.eventsServiceName);

        yield* updateUsersOwnedGroupsCount(req, logger, config, urlNames, helpers, false);

        yield* sendEmailsToAddedAndRemovedAdmins(logger, helpers, existingGroup.administrators, [], req.headers['auth-email'], req.headers['auth-name'], config.planetCalLoginUrl, existingGroup.name);

        yield* helpers.deleteBlobImage(req, config.apiServiceEndpoint, urlNames.blob, serviceNames.apiServiceName, config.blobGroupContainer, existingGroup.icon);

        var documentResponse = yield dal.removeAsync(req.params.id);

        logger.get().info(`Group deleted successfully by user ${deletedBy}. Group name:${existingGroup.name}, GroupId: ${existingGroup.id}`);

        res.status(200).json({ id: req.params.id });
    }));


    function findGroupByKeywordsAsync(keywords, fields, userId) {
        var constraints = helpers.convertFieldSelectionToConstraints('e', fields);
        var querySpec = {
            query: "SELECT e.id" + constraints + " e.keywords FROM e JOIN k IN e.keywords WHERE ARRAY_CONTAINS(@keywords, k) and (e.createdBy=@userId or e.privacy != @privacy)",
            parameters: [
                {
                    name: '@keywords',
                    value: keywords
                },
                {
                    name: "@userId",
                    value: userId
                },
                {
                    name: "@privacy",
                    value: 'Private'
                },
            ]
        };

        return dal.getAsync(querySpec);
    }

    function findAllGroupAsync(fields, userId, filterExpression) {
        var constraints = helpers.convertFieldSelectionToConstraints('e', fields);

        var filterExpressionParsed = helpers.convertFilterExpressionToParameters('e', filterExpression, '', ' AND ');

        var queryStatement = "SELECT e.id" + constraints + " FROM root e WHERE " + filterExpressionParsed.filterExpression + "(e.createdBy = @userId or e.privacy != @privacy)";

        var parameters = filterExpressionParsed.parameters;

        parameters.push({
            name: "@userId",
            value: userId
        });

        parameters.push({
            name: "@privacy",
            value: 'Private'
        });

        var querySpec = {
            query: queryStatement,
            parameters: parameters
        };

        return dal.getAsync(querySpec);
    }

    function findMyAdministeredGroups(admins, fields) {
        var constraints = helpers.convertFieldSelectionToConstraints('e', fields);
        var queryStatement = "SELECT e.id" + constraints + " FROM e JOIN g IN e.administrators WHERE ARRAY_CONTAINS(@administrators, g)";

        var parameters = [{
            name: "@administrators",
            value: admins
        }];

        var querySpec = {
            query: queryStatement,
            parameters: parameters
        };
        return dal.getAsync(querySpec);
    }

    function findGroupsByGroupIdsAsync(groupIds, fields, userId) {
        var constraints = helpers.convertFieldSelectionToConstraints('e', fields);
        var parameters = [
            {
                name: "@groupIds",
                value: groupIds
            },
            {
                name: "@userId",
                value: userId
            },
            {
                name: "@privacy",
                value: 'Private'
            },
        ];

        var querySpec = {
            query: "SELECT e.id" + constraints + " FROM root e WHERE ARRAY_CONTAINS(@groupIds, e.id) and (e.createdBy=@userId or e.privacy != @privacy)",
            parameters: parameters
        };
        return dal.getAsync(querySpec);
    }

    function findGroupsByGroupIdAsync(groupId, fields, userId) {
        var constraints = helpers.convertFieldSelectionToConstraints('e', fields);
        var parameters = [
            {
                name: "@groupId",
                value: groupId
            },
            {
                name: "@userId",
                value: userId
            },
            {
                name: "@privacy",
                value: 'Private'
            },
        ];

        var querySpec = {
            query: "SELECT e.id" + constraints + " FROM root e WHERE e.id = @groupId and (e.createdBy=@userId or e.privacy != @privacy)",
            parameters: parameters
        };
        return dal.getAsync(querySpec);
    }
    return router;
}
function* updateUsersOwnedGroupsCount(req, logger, config, urlNames, helpers, increment) {
    var userId = req.headers['auth-identity'];
    var url = `${config.userAuthServiceEndpoint}/${urlNames.userdetails}/${userId}/`;
    url += increment ? "incrementOwnedGroupsCount" : "decrementOwnedGroupsCount";
    req.body = {};
    var options = helpers.getRequestOption(req, url, 'POST');
    yield* helpers.forwardHttpRequest(options, '');
}

function* sendEmailsToAddedAndRemovedAdmins(logger, helpers, originalGroup, updatedGroup, currentUserEmail, currentUserName, planetCalWebSiteLink, groupName) {
    var adminsAdded = helpers.getItemsfromFirstArrayAndNotInSecondArray(updatedGroup, originalGroup);
    var adminsRemoved = helpers.getItemsfromFirstArrayAndNotInSecondArray(originalGroup, updatedGroup);

    for (var i = 0; i < adminsAdded.length; i++) {
        yield* sendGroupEmail(logger, helpers, currentUserEmail, currentUserName, planetCalWebSiteLink, adminsAdded[i], groupName, true);
    }

    for (var i = 0; i < adminsRemoved.length; i++) {
        yield* sendGroupEmail(logger, helpers, currentUserEmail, currentUserName, planetCalWebSiteLink, adminsRemoved[i], groupName, false);
    }
}

function* sendGroupEmail(logger, helpers, currentUserEmail, currentUserName, planetCalWebSiteLink, adminEmail, groupName, added) {
    if (!helpers.isEmailValid(adminEmail)) {
        return;
    }
    var toAddress = 'Guest <' + adminEmail + '>';
    var ccAddress = currentUserName + ' <' + currentUserEmail + '>';
    var subject = "";

    var messageBody = "";
    messageBody += "<h2>Hello " + adminEmail + "</h2>";
    if (added) {
        subject = "You have been made administrator of PlanetCal group '" + groupName + "'";
        messageBody += "<p>Congratulations!</p>";
        messageBody += "<p>You have been enrolled as an administrator of the PlanetCal group '" + groupName + "' by " + currentUserName + "</p>";
        messageBody += "<p>You can now edit this group, add or remove events under it.</p>";
        messageBody += "<p>If you are already a member of PlanetCal. You can login any time to view the groups you are an administrator of, and much more.</p>";
        messageBody += "<p>But if you are not a member of PlanetCal...</p>";
        messageBody += "<p>Please register yourself by clicking on the following link.</p>";
    }
    else {
        subject = "You are no longer an administrator of a PlanetCal group '" + groupName + "'";
        messageBody += "<p>You have been removed as an administrator of the PlanetCal group '" + groupName + "' by " + currentUserName + "</p>";
        messageBody += "<p>If you are already a member of PlanetCal. You can login any time to publish your own events for others, view other groups, create your own, and much more.</p>";
        messageBody += "<p>If you are not a member of PlanetCal, you can still register to explore it further...</p>";
        messageBody += "<p>Please complete the registration process by clicking on the following link, and chosing to register.</p>";
    }

    messageBody += "<p><a href='" + planetCalWebSiteLink + "'>PlanetCal registration</a></a></p>";
    messageBody += "<p>Thank you</p>";
    messageBody += "<p>PlanetCal team.</p>";

    yield* helpers.sendEmail(logger, toAddress, subject, messageBody, ccAddress);
}

