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

    //Example of Filters: http://localhost:1337/groups?fields=name|description|category&filter=field1=value1$OR$field2=value2$AND$field3<value3
    'convertFilterExpressionToParameters': function convertFilterExpressionToParameters(prefix, filterExpression, postfix) {
        var whereClause = '';
        var parameters = [];

        if (filterExpression) {
            var fields = filterExpression.split('$');

            for (var i in fields) {
                var result = this.operatorParser(fields[i]);

                if (result && result.whereClause != '') {
                    whereClause += prefix + "." + result.whereClause;
                    parameters.push(result.parameter);
                } else {
                    whereClause += " " + fields[i] + " ";
                }
            }
            whereClause += " " + postfix;
        }
        return {
            filterExpression: whereClause,
            parameters: parameters
        }
    },

    'operatorParser': function operatorParser(clause) {
        var operator = '';
        if (clause.indexOf('=') !== -1) {
            operator = '=';
        } else if (clause.indexOf('!=') !== -1) {
            operator = '!=';
        } else if (clause.indexOf('<') !== -1) {
            operator = '<';
        } else if (clause.indexOf('>') !== -1) {
            operator = '>';
        } else if (clause.indexOf('<=') !== -1) {
            operator = '<=';
        } else if (clause.indexOf('>=') !== -1) {
            operator = '>=';
        }

        if (operator !== '') {
            var parts = clause.split(operator);
            var whereClause = parts[0] + " " + operator + " @" + parts[0];
            var parameter = {
                name: "@" + parts[0],
                value: parts[1]
            };
            return {
                whereClause: whereClause,
                parameter: parameter
            }
        }
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
        var adminUser = this.decrypt(emailConstants.adminEmail);
        var server = email.server.connect({
            user: adminUser,
            password: this.decrypt(emailConstants.adminPassword),
            host: emailConstants.smtpHost,
            tls: { ciphers: emailConstants.smtpCiphers }
        });

        // var encryptedString = this.encrypt("Hello");
        // var decryptedString = this.decrypt(encryptedString);

        var message = {
            from: adminUser,
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
