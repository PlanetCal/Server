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
        var documentResponse = yield dal.insertAsync({ email: req.body.email, passwordHash: passwordHash, name: req.body.name, firstTimeLogon: newGuid }, options);

        logger.get().debug({ req: req, userAuth: documentResponse.resource }, 'userAuth object created successfully.');

        sendValidationEmail(helpers, logger, req, apiServiceEndpoint, userAuthUrl, documentResponse.resource.id, newGuid);
        res.status(201).json({ email: documentResponse.resource.email, id: documentResponse.resource.id, name: documentResponse.resource.name });
    }));

    router.put('/:id', helpers.wrap(function* (req, res) {
        if (!req.body.email || !req.body.password || !req.body.name) {
            throw new BadRequestException('Cannot find email, password or name in body.', errorcode.EmailOrPasswordNotFoundInBody);
        }
        else if (!isOperationAuthorized(req)) {
            throw new ForbiddenException('Forbidden.');
        }
        else {
            logger.get().debug({ req: req }, 'Updating userAuth object...');
            var passwordCrypto = new PasswordCrypto();
            var passwordHash = passwordCrypto.generateHash(req.body.password);

            var documentResponse = yield dal.updateAsync(req.params.id, { email: req.body.email, passwordHash: passwordHash, id: req.params.id, name: req.body.name });

            logger.get().debug({ req: req, userAuth: documentResponse.resource }, 'userAuth object updated successfully.');

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

function sendValidationEmail(helpers, logger, req, apiServiceEndpoint, userAuthUrl, documentid, guid) {
    var toAddress = req.body.name + ' <' + req.body.email + '>';
    var subject = "Action: Complete the PlanetCal signup!"

    var validationlink = apiServiceEndpoint + "/" + userAuthUrl + "/" + documentid + "_" + guid + "?version=1.0";

    var messageBody = "";
    messageBody += "<h2>Hello " + req.body.name + "</h2>";
    messageBody += "<p>Welcome to PlanetCal</p>";
    messageBody += "<p>You have just signed up for a new account on PlanetCal.</p>";
    messageBody += "<p>Please complete the process by clicking on the following link.</p>";
    messageBody += "<p><a href='" + validationlink + "'>Validate your email address</a></a></p>";
    messageBody += "<p>Thank you</p>";
    messageBody += "<p>PlanetCal team.</p>";

    helpers.sendEmail(logger, toAddress, subject, messageBody);
}
