'use strict'

module.exports = function (passport, config, logger) {

    var router = require('express').Router();
    var PasswordCrypto = require('../passwordcrypto.js').PasswordCrypto;
    var urlNames = require('../common/constants.json')['urlNames'];
    var userAuthUrl = urlNames.userauth;
    var databaseName = config.documentdbDatabaseName;
    var collectionName = config.usersCollectionName;
    var documentdbEndpoint = config.documentdbEndpoint;
    var documentdbAuthKey = config.documentdbAuthKey;
    var apiServiceEndpoint = config.apiServiceEndpoint;
    var DataAccessLayer = require('../common/dal.js').DataAccessLayer;
    var dal = new DataAccessLayer(databaseName, collectionName, documentdbEndpoint, documentdbAuthKey);

    var helpers = require('../common/helpers.js');
    var BadRequestException = require('../common/error.js').BadRequestException;
    var ForbiddenException = require('../common/error.js').ForbiddenException;
    var errorcode = require('../common/errorcode.json');
    var Validator = require('../common/bodyschemavalidator.js');
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
        var email = req.body.email.toLowerCase();
        var documentResponse = yield dal.insertAsync(
            {
                email: email,
                passwordHash: passwordHash,
                name: req.body.name,
                emailValidation: newGuid,
                createdTime: currentUtcDateTime,
            }, options);

        logger.get().debug({ req: req, userAuth: documentResponse.resource }, 'userAuth object created successfully.');

        sendValidationEmail(helpers, logger, req.body.name, email, apiServiceEndpoint, userAuthUrl, documentResponse.resource.id, newGuid, true);
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

            var successMessage = "";
            //password change scenarios
            if (result.newEmailValidation && result.newPasswordHash) {
                if (result.newEmailValidation !== validationGuid) {
                    throw new ForbiddenException('Email validation failed. Please send the password change request again.');
                } else {
                    result.passwordHash = result.newPasswordHash;
                    delete result.newPasswordHash;
                    delete result.newEmailValidation;
                }
                successMessage = "Congratulations! Your planetCal account password has been updated successfully. Please use your new password to login.";
            }
            //new registration scenario
            else {
                if (result.emailValidation === true) {
                    res.status(200).json({ "Message": "Your planetCal account is already active! Plase use your emailId, and password to login." });
                    return;

                } else if (result.emailValidation !== validationGuid) {
                    throw new ForbiddenException('Email validation failed. Please send the registration request again.');
                }
                successMessage = "Congratulations! Your planetCal account is now ready to use.";
            }
            result.emailValidation = true;
            result.modifiedTime = (new Date()).toUTCString();
            var documentWriteResponse = yield dal.updateAsync(userId, result);
            res.status(200).json({ "Message": successMessage });
        }
    }));

    router.put('/', helpers.wrap(function* (req, res) {
        var email = req.body.email.toLowerCase();

        if (!email || !req.body.password) {
            throw new BadRequestException('Cannot find email, or password in body.', errorcode.EmailOrPasswordNotFoundInBody);
        }
        else {
            logger.get().debug({ req: req }, 'Updating userAuth object...');
            var passwordCrypto = new PasswordCrypto();
            var passwordHash = passwordCrypto.generateHash(req.body.password);

            var documentGetResponse = yield findUserByEmailAsync(dal, email);
            var result = documentGetResponse.feed.length <= 0 ? {} : documentGetResponse.feed[0];

            if (!result.id) {
                throw new BadRequestException('User is not found in the user database.', errorcode.UserNotFound);
            }

            logger.get().debug({ req: req, resultId: result.id }, 'Inside UserAuth Put, Found user using email id.');

            var newGuid = helpers.generateGuid();
            result.newPasswordHash = passwordHash;
            result.modifiedTime = (new Date()).toUTCString();
            result.newEmailValidation = newGuid;

            logger.get().debug({ req: req, resultId: result.id }, 'Inside UserAuth Put, About to update the document.');
            var documentResponse = yield dal.updateAsync(result.id, result);

            logger.get().debug({ req: req, userAuth: documentResponse.resource }, 'userAuth object updated successfully.');

            logger.get().debug({ req: req }, 'Inside UserAuth Put, About to send the validation email');
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
        query: "SELECT e.id, e.email, e.name, e.passwordHash, e.emailValidation, e.newPasswordHash, e.newEmailValidation, e.createdTime, e.updatedTime FROM root e WHERE e.id = @userId",
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
    var subject = "";

    var validationlink = apiServiceEndpoint + "/" + userAuthUrl + "/" + documentid + "_" + guid + "?version=1.0";

    var messageBody = "";
    messageBody += "<h2>Hello " + name + "</h2>";
    if (isNewRegistration) {
        subject = "Action required: Complete the PlanetCal signup!"
        messageBody += "<p>Welcome to PlanetCal</p>";
        messageBody += "<p>You have just signed up for a new account on PlanetCal.</p>";
        messageBody += "<p>Please complete the registration process by clicking on the following link.</p>";
    }
    else {
        subject = "Action required: Approve the PlanetCal password change request!"
        messageBody += "<p>Thank you for using PlanetCal.</p>";
        messageBody += "<p>We have received a request for the password change for this account.</p>";
        messageBody += "<p>Is it you?</p>";
        messageBody += "<h2>No.</h2>";
        messageBody += "<p>Please ignore this email. Your current password will continue to work.</p>";
        messageBody += "<h2>Yes</h2>";
        messageBody += "<p>Please complete the password change process by clicking on the following link.</p > ";
    }

    messageBody += "<p><a href='" + validationlink + "'>Validate your email address</a></a></p>";
    messageBody += "<p>Thank you</p>";
    messageBody += "<p>PlanetCal team.</p>";

    helpers.sendEmail(logger, toAddress, subject, messageBody);
}
