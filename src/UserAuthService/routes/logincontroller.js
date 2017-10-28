'use strict'

module.exports = function (passport, config, logger) {

    var router = require('express').Router();
    var TokenGenerator = new require('../../common/tokengenerator.js').TokenGenerator;
    var helpers = require('../../common/helpers.js');
    var errorcode = require('../../common/errorcode.json');
    var ForbiddenException = require('../../common/error.js').ForbiddenException;
    var EmailValidationPendingException = require('../../common/error.js').EmailValidationPendingException;

    var databaseName = config.documentdbDatabaseName;
    var collectionName = config.usersCollectionName;
    var documentdbEndpoint = config.documentdbEndpoint;
    var documentdbAuthKey = config.documentdbAuthKey;
    var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
    var dal = new DataAccessLayer(databaseName, collectionName, documentdbEndpoint, documentdbAuthKey);

    router.post('/', passport.authenticate('local'), helpers.wrap(function* (req, res) {
        logger.get().debug({ req: req, userAuth: req.user }, 'User authenticatd.');
        var email = req.user.email.toLowerCase();
        if (req.user && email && req.user.id && req.user.name) {
            if (req.user.emailValidation !== true) {
                throw new EmailValidationPendingException('EmailValidationPending');
            }

            logger.get().debug({ req: req }, 'Generating token...');
            var tokenGenerator = new TokenGenerator(config);
            var token = tokenGenerator.encode({ email: email, id: req.user.id, name: req.user.name, time: Date.now() });
            logger.get().debug({ req: req }, 'Token generated successfully.');
            res.status(200).json({ token: token, id: req.user.id, name: req.user.name, email: email });
        }
        else {
            throw new ForbiddenException('Forbidden');
        }
    }));

    return router;
}
