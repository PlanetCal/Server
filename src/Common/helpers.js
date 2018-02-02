'use strict'

var Promise = require('bluebird');
var request = require('request-promise');
var email = require('emailjs');
var crypto = require('crypto');
var emailConstants = require('./constants.json')['emailConstants'];
var encryptConstants = require('./constants.json')['encryptConstants'];
var googleConstants = require('./constants.json')['google'];
var sendGridConstants = require('./constants.json')['sendGrid'];
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
                'auth-email': req.headers['auth-email'],
                'auth-name': req.headers['auth-name'],
                'version': req.headers['version'],
                'authorization': req.headers['authorization'],
                'activityid': req.headers['activityid']
            },
            url: targetEndpoint,
            body: JSON.stringify(req.body)
        };
    },

    'deleteBlobImage': function* deleteBlobImage(req, apiServiceEndpoint, blobUrlSegment, apiServiceName, container, blobUrl) {
        if (blobUrl) {
            let iconSegments = blobUrl.split('/');
            let fileName = iconSegments[iconSegments.length - 1];
            let deleteBlobEndpoint = `${apiServiceEndpoint}/${blobUrlSegment}/${container}/${fileName}`;
            let options = this.getRequestOption(req, deleteBlobEndpoint, 'DELETE');
            return yield* this.forwardHttpRequest(options, apiServiceName);
        }
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
    'convertFilterExpressionToParameters': function convertFilterExpressionToParameters(prefix, filterExpression, prepend, append) {
        var whereClause = '';
        var parameters = [];

        if (filterExpression) {
            var fields = filterExpression.split('$');

            for (var i in fields) {
                var result = this.operatorParser(fields[i], i);

                if (result && result.whereClause != '') {
                    whereClause += prefix + "." + result.whereClause;
                    parameters.push(result.parameter);
                } else {
                    whereClause += " " + fields[i] + " ";
                }
            }
            whereClause = prepend + " " + whereClause + " " + append;;
        }
        return {
            filterExpression: whereClause,
            parameters: parameters
        }
    },

    'operatorParser': function operatorParser(clause, fieldIndex) {
        var operator = '';
        if (clause.indexOf('<=') !== -1) {
            operator = '<=';
        } else if (clause.indexOf('>=') !== -1) {
            operator = '>=';
        } else if (clause.indexOf('!=') !== -1) {
            operator = '!=';
        } else if (clause.indexOf('=') !== -1) {
            operator = '=';
        } else if (clause.indexOf('<') !== -1) {
            operator = '<';
        } else if (clause.indexOf('>') !== -1) {
            operator = '>';
        }

        if (operator !== '') {
            var parts = clause.split(operator);
            var fieldName = '@' + parts[0] + fieldIndex;
            var whereClause = parts[0] + " " + operator + " " + fieldName;
            var parameter = {
                name: fieldName,
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

    'areArraysIdentical': function areArraysIdentical(array1, array2) {
        if (!array1 && !array2) {
            return true;
        }

        if (!array1) {
            array1 = [];
        }
        if (!array2) {
            array2 = [];
        }

        if (!array1 || !array2 || array1.length !== array2.length) {
            return false;
        }

        for (var i = 0; i < array1.length; i++) {
            if (array1[i] != array2[i]) {
                return false;
            }
        }
        return true;
    },

    'getItemsfromFirstArrayAndNotInSecondArray': function getItemsfromFirstArrayAndNotInSecondArray(array1, array2) {
        var newArray = [];
        if (!array1 || array1.length === 0) {
            return newArray;
        }
        if (!array2 || array2.length === 0) {
            return array1;
        }
        array1.forEach(function (element) {
            if (element && element.length > 0 && array2.indexOf(element) < 0) {
                newArray.push(element);
            }
        });
        return newArray;
    },

    // Documentation: https://github.com/eleith/emailjs    
    'sendEmail': function* sendEmail(logger, toAddress, subject, messageHtmlText, ccAddress) {
        if (sendGridConstants.useSendGridForEmails) {
            yield* this.sendEmailUsingSendGrid(logger, toAddress, subject, messageHtmlText, ccAddress);
        }

        var adminUser = this.decrypt(emailConstants.adminEmail);
        var adminPassword = this.decrypt(emailConstants.adminPassword);

        logger.get().info({ adminEmail: adminUser, adminPassword: adminPassword, smtpHost: emailConstants.smtpHost, smtpCiphers: emailConstants.smtpCiphers }, 'Inside Helper.SendEmail method, about to connect to smtp server');
        var server = email.server.connect({
            user: adminUser,
            password: adminPassword,
            host: emailConstants.smtpHost,
            tls: { ciphers: emailConstants.smtpCiphers }
        });

        logger.get().info('Inside Helper.SendEmail method, connected to smtp server, about to create a message object');
        // var encryptedString = this.encrypt("Hello");
        // var decryptedString = this.decrypt(encryptedString);

        var message = {
            from: adminUser,
            text: 'Your email Server does not support Html format. Please use any other modern emailId.',
            to: toAddress,
            cc: ccAddress ? ccAddress : "",
            subject: subject,
            attachment:
                [
                    { data: messageHtmlText, alternative: true }
                ]
        };

        logger.get().info('Inside Helper.SendEmail method, about to send an email message');
        // send the message and get a callback with an error or details of the message that was sent
        server.send(message, function (err, message) {
            logger.get().info(err || message);
        });
        logger.get().info('Inside Helper.SendEmail, sent an email message');
    },

    'sendEmailUsingSendGrid': function* updateEntityGeoLocation(logger, toAddress, subject, messageHtmlText, ccAddress) {
        var url = `${sendGridConstants.sendGridEndpoint}`;
        var sendGridApiKey = this.decrypt(sendGridConstants.encryptedSendGridApiKey);
        var body = {
            personalizations:
                [{
                    to: [{ email: toAddress }]
                }],
            from: {
                email: sendGridConstants.adminEmail,
                name: sendGridConstants.adminName,
            },
            subject: subject,
            content:
                [{
                    type: "text/html",
                    value: messageHtmlText
                }]
        }
        if (ccAddress) {
            body.personalizations[0].cc = [{ email: ccAddress }];
        }

        var options = {
            method: 'POST',
            url: url,
            headers: {
                'content-type': 'application/json',
                'Authorization': `Bearer ${sendGridApiKey}`
            },
            body: JSON.stringify(body)
        };

        return yield* this.forwardHttpRequest(options, "");
    },

    'isEmailValid': function isEmailValid(email) {
        var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
        return regex.test(email);
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
    },

    'updateEntityGeoLocation': function* updateEntityGeoLocation(entity) {
        if (entity.address) {
            var normalizedAddress = "address=" + entity.address;
            normalizedAddress = normalizedAddress.replace(/ /g, '+');

            var url = `${googleConstants.googleGeoCodeApiEndpoint}?${normalizedAddress}&key=${googleConstants.googleApiKey}`;
            var options = {
                method: 'GET',
                url: url
            };

            var results = yield* this.forwardHttpRequest(options, "");
            var geoLocation = JSON.parse(results);
            if (geoLocation.status === 'OK') {
                var geoLocation = geoLocation.results[0].geometry.location;
                entity.geoLocation = { type: "Point", coordinates: [geoLocation.lng, geoLocation.lat] };
            }
        }
    }
}
