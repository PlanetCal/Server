'use strict'

var Promise = require('bluebird');
var request = require('request-promise');
var email = require('emailjs');
var crypto = require('crypto');
var emailConstants = require('./constants.json')['emailConstants'];
var encryptConstants = require('./constants.json')['encryptConstants'];
var ForbiddenException = require('./error.js').ForbiddenException;
var UnauthorizedException = require('./error.js').UnauthorizedException;
var InternalServerException = require('./error.js').InternalServerException;
var HttpRequestException = require('./error.js').HttpRequestException;

module.exports = {

    'wrap': function wrap(genFn) {
        var cr = Promise.coroutine(genFn);
        return function (req, res, errorHandler) {
            cr(req, res, errorHandler).catch(errorHandler);
        }
    },

    'wrapLocalStrategyAuth': function wrapLocalStrategyAuth(genFunc) {
        var cr = Promise.coroutine(genFunc);
        return function (req, email, password, done) {
            cr(req, email, password, done).catch(function (err) {
                done(err, null);
            });
        }
    },

    'getRequestOption': function getRequestOption(req, targetEndpoint, method) {
        return {
            method: method,
            headers: {
                'content-type': 'application/json; charset=utf-8',
                'auth-identity': req.headers['auth-identity'],
                'version': req.headers['version'],
                'activityid': req.headers['activityid']
            },
            url: targetEndpoint,
            body: JSON.stringify(req.body)
        };
    },

    'removeDuplicatedItemsById': function removeDuplicatedItemsById(results) {
        if (results) {
            var filteredResults = {};

            // de-dupe uisng dictionary
            for (var i in results) {
                var obj = results[i];
                if (!filteredResults.hasOwnProperty(obj.id)) {
                    filteredResults[obj.id] = obj;
                }
            }

            return Object.keys(filteredResults).map(key => filteredResults[key]);
        }
        return [];
    },

    'convertFieldSelectionToConstraints': function convertFieldSelectionToConstraints(prefix, fields) {
        if (fields) {
            var arr = [];
            for (var i in fields) {
                arr.push(prefix + '.' + fields[i]);
            }

            if (arr.length > 0) {
                return ',' + arr.join(', ');
            }
        }
        return '';
    },

    'constructResponseJsonFromExceptionRecursive': function constructResponseJsonFromExceptionRecursive(exceptionObject, logStack) {
        var returnedJson;
        if (exceptionObject) {
            returnedJson =
                {
                    name: exceptionObject.name,
                    message: exceptionObject.message,
                    code: exceptionObject.code,
                    activityId: exceptionObject.activityId,
                    innerException: constructResponseJsonFromExceptionRecursive(exceptionObject.innerException),
                    serviceName: exceptionObject.serviceName,
                    errorcode: exceptionObject.errorcode,
                    url: exceptionObject.url
                };

            if (logStack === true) {
                returnedJson.stack = exceptionObject.stack;
            }
        }

        return returnedJson;
    },

    'forwardHttpRequest': function* forwardHttpRequest(options, serviceName) {
        return yield request(options).catch(function (err) {
            try {
                var extractedException = JSON.parse(err.error);
            }
            catch (e) {
            }

            if (!extractedException) {
                extractedException = err;
            }
            throw new HttpRequestException('Request to ' + serviceName + ' failed.', options.url, extractedException);
        });
    },

    'generateGuid': function generateGuid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    },

    'encrypt': function encrypt(text) {
        var cipher = crypto.createCipher(encryptConstants.algorithm, encryptConstants.password)
        var crypted = cipher.update(text, encryptConstants.utf8, encryptConstants.hex)
        crypted += cipher.final(encryptConstants.hex);
        return crypted;
    },

    'decrypt': function decrypt(text) {
        var decipher = crypto.createDecipher(encryptConstants.algorithm, encryptConstants.password)
        var dec = decipher.update(text, encryptConstants.hex, encryptConstants.utf8)
        dec += decipher.final(encryptConstants.utf8);
        return dec;
    },

    // Documentation: https://github.com/eleith/emailjs    
    'sendEmail': function sendEmail(logger, toAddress, subject, messageHtmlText) {
        var server = email.server.connect({
            user: this.decrypt(emailConstants.adminEmail),
            password: this.decrypt(emailConstants.adminPassword),
            host: emailConstants.smtpHost,
            tls: { ciphers: emailConstants.smtpCiphers }
        });

        //Lets save this commented code.   
        // var encryptedString = this.encrypt("hello");
        // console.warn("sachinku: encryptedString:" + encryptedString);
        // var decryptedString = this.decrypt(encryptedString);
        // console.warn("sachinku: decryptedString:" + decryptedString);

        var message = {
            from: emailConstants.fromEmailAddress,
            text: 'Your email Server does not support Html format. Please use any other modern emailId.',
            to: toAddress,
            subject: subject,
            attachment:
            [
                { data: messageHtmlText, alternative: true }
            ]
        };

        // send the message and get a callback with an error or details of the message that was sent
        server.send(message, function (err, message) {
            logger.get().info(err || message);
        });
    },

    'handleServiceException': function handleServiceException(err, req, res, serviceName, logger, logStack) {
        err.serviceName = serviceName;
        err.activityId = req.headers['activityid'];

        var exception = this.constructResponseJsonFromExceptionRecursive(err, logStack);

        if (err && err.code < 500) {
            logger.get().info({ exception: exception });
        }
        else {
            logger.get().error({ exception: exception });
        }

        res.status(err.code || 500).json(exception);
    }
}