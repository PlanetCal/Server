'use strict'

module.exports = function (passport, config, logger) {

    var router = require('express').Router();
    var PasswordCrypto = require('../passwordcrypto.js').PasswordCrypto;
    var urlNames = require('../../common/constants.json')['urlNames'];
    var userAuthUrl = urlNames.userauth;
    var databaseName = config.documentdbDatabaseName;
    var collectionName = config.usersCollectionName;
    var documentdbEndpoint = config.documentdbEndpoint;
    var documentdbAuthKey = config.documentdbAuthKey;
    var apiServiceEndpoint = config.apiServiceEndpoint;
    var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
    var dal = new DataAccessLayer(databaseName, collectionName, documentdbEndpoint, documentdbAuthKey);

    var helpers = require('../../common/helpers.js');
    var BadRequestException = require('../../common/error.js').BadRequestException;
    var ForbiddenException = require('../../common/error.js').ForbiddenException;
    var errorcode = require('../../common/errorcode.json');
    var Validator = require('../../common/bodyschemavalidator.js');
    var bodyschemavalidator = new Validator.BodySchemaValidator();
    var userauthschema = require('./userauth.schema.json');

    bodyschemavalidator.addSchema(userauthschema, 'userauth');

    router.post('/', bodyschemavalidator.validateSchema('userauth'), helpers.wrap(function* (req, res) {
        logger.get().debug({ req: req }, 'Creating userAuth object...');

        var passwordCrypto = new PasswordCrypto();
        var passwordHash = passwordCrypto.generateHash(req.body.password);
        var options = { preTriggerInclude: config.insertUniqueUserTriggerName };
        var newGuid = helpers.generateGuid();
        var currentUtcDateTime = (new Date()).toUTCString();
        var documentResponse = yield dal.insertAsync(
            {
                email: req.body.email,
                passwordHash: passwordHash,
                name: req.body.name,
                emailValidation: newGuid,
                createdTime: currentUtcDateTime,
                modifiedTime: ''
            }, options);

        logger.get().debug({ req: req, userAuth: documentResponse.resource }, 'userAuth object created successfully.');

        sendValidationEmail(helpers, logger, req.body.name, req.body.email, apiServiceEndpoint, userAuthUrl, documentResponse.resource.id, newGuid, true);
        res.status(201).json({ email: documentResponse.resource.email, id: documentResponse.resource.id, name: documentResponse.resource.name });
    }));

    router.get('/:id', helpers.wrap(function* (req, res) {
        var registrationId = req.params.id;
        if (!registrationId) {
            throw new BadRequestException('Cannot find id.', errorcode.BadRegistrationId);
        }
        else {
            logger.get().debug({ req: req }, 'Validating Email during registration: ' + registrationId);
            var fields = registrationId.split('_');

            var userId = fields[0];
            var validationGuid = fields[1];
            var documentGetResponse = yield findUserByUserIdAsync(dal, userId);
            var result = documentGetResponse.feed.length <= 0 ? {} : documentGetResponse.feed[0];

            if (result.emailValidation === true) {
                res.status(200).json({ "Message": "Your planetCal account is already active! Plase use your emailId, and password to login." });
                return;

            } else if (result.emailValidation !== validationGuid) {
                throw new ForbiddenException('Email validation failed. Please send the registration request again.');
            }

            result.emailValidation = true;
            result.modifiedTime = (new Date()).toUTCString();
            var documentWriteResponse = yield dal.updateAsync(userId, result);
            res.status(200).json({ "Message": "Congratulations! Your planetCal account is now ready to use." });
        }
    }));

    router.put('/', helpers.wrap(function* (req, res) {
        if (!req.body.email || !req.body.password) {
            throw new BadRequestException('Cannot find email, or password in body.', errorcode.EmailOrPasswordNotFoundInBody);
        }
        else {
            logger.get().debug({ req: req }, 'Updating userAuth object...');
            var passwordCrypto = new PasswordCrypto();
            var passwordHash = passwordCrypto.generateHash(req.body.password);

            var documentGetResponse = yield findUserByEmailAsync(dal, req.body.email);
            var result = documentGetResponse.feed.length <= 0 ? {} : documentGetResponse.feed[0];

            if (!result.id) {
                throw new BadRequestException('User is not found in the user database.', errorcode.UserNotFound);
            }

            var newGuid = helpers.generateGuid();
            result.passwordHash = passwordHash;
            result.modifiedTime = (new Date()).toUTCString();
            result.emailValidation = newGuid;

            var documentResponse = yield dal.updateAsync(result.id, result);

            logger.get().debug({ req: req, userAuth: documentResponse.resource }, 'userAuth object updated successfully.');

            sendValidationEmail(helpers, logger, result.name, result.email, apiServiceEndpoint, userAuthUrl, result.id, newGuid, false);

            res.status(200).json({ id: documentResponse.resource.id });
        }
    }));

    router.delete('/:id', helpers.wrap(function* (req, res) {
        //all small letters even if header name has capitals
        if (!isOperationAuthorized(req)) {
            throw new ForbiddenException('Forbidden.');
        }
        else {
            logger.get().debug({ req: req }, 'Deleting userAuth object...');
            var documentResponse = yield dal.removeAsync(req.params.id);
            logger.get().debug({ req: req }, 'userAuth object deleted successfully.');
            res.status(200).json({ id: req.params.id });
        }
    }));
    return router;
}

function isOperationAuthorized(req) {
    return req.headers['auth-identity'] === req.params.id;
}

function findUserByUserIdAsync(dal, userId) {
    var querySpec = {
        query: "SELECT e.id, e.email, e.name, e.passwordHash, e.emailValidation, e.createdTime, e.updatedTime FROM root e WHERE e.id = @userId",
        parameters: [
            {
                name: "@userId",
                value: userId
            }
        ]
    };
    return dal.getAsync(querySpec);
}

function findUserByEmailAsync(dal, email) {
    var querySpec = {
        query: "SELECT e.id, e.email, e.name, e.passwordHash, e.emailValidation, e.createdTime, e.updatedTime FROM root e WHERE e.email = @email",
        parameters: [
            {
                name: "@email",
                value: email
            }
        ]
    };
    return dal.getAsync(querySpec);
}

function sendValidationEmail(helpers, logger, name, email, apiServiceEndpoint, userAuthUrl, documentid, guid, isNewRegistration) {
    var toAddress = name + ' <' + email + '>';
    var subject = "Action required: Complete the PlanetCal signup!"

    var validationlink = apiServiceEndpoint + "/" + userAuthUrl + "/" + documentid + "_" + guid + "?version=1.0";

    var messageBody = "";
    messageBody += "<h2>Hello " + name + "</h2>";
    if (isNewRegistration) {
        messageBody += "<p>Welcome to PlanetCal</p>";
        messageBody += "<p>You have just signed up for a new account on PlanetCal.</p>";
        messageBody += "<p>Please complete the registration process by clicking on the following link.</p>";
    }
    else {
        messageBody += "<p>Thank you for using PlanetCal.</p>";
        messageBody += "<p>We have received a request to change the password of your account.</p>";
        messageBody += "<p>Please complete the change password process by clicking on the following link.</p>";
    }

    messageBody += "<p><a href='" + validationlink + "'>Validate your email address</a></a></p>";
    messageBody += "<p>Thank you</p>";
    messageBody += "<p>PlanetCal team.</p>";

    helpers.sendEmail(logger, toAddress, subject, messageBody);
}
