'use strict'

var config = require('./config.js');
var Promise = require('bluebird');
var request = require('request-promise');
var BadRequestException = require('./error.js').BadRequestException;
var ForbiddenException = require('./error.js').ForbiddenException;
var NotFoundEException = require('./error.js').NotFoundException;
var UnauthorizedException = require('./error.js').UnauthorizedException;
var InternalServerException = require('./error.js').InternalServerException;
var HttpRequestException = require('./error.js').HttpRequestException;

module.exports = {
    'wrap' : function wrap (genFn) { 
        var cr = Promise.coroutine(genFn);
        return function (req, res, next) {
            cr(req, res, next).catch(next);
        }
    },

    'wrapLocalStrategyAuth' : function wrapLocalStrategyAuth(genFunc){
        var cr = Promise.coroutine(genFunc); 
        return function (req, email, password, done, next) {
            cr(req, email, password, done, next).catch(next);
        }
    },

    'getRequestOption' : function getRequestOption(req, targetEndpoint, method){
        return {
            method : method,
            headers: {'content-type' : 'application/json; charset=utf-8',
                      'auth-identity' : req.headers['auth-identity'],
                      'version' : req.headers['version'],
                      'activityid' : req.headers['activityid']},
            url: targetEndpoint,
            body: JSON.stringify(req.body)
        };
    },

    'removeDuplicatedItemsById' : function removeDuplicatedItemsById(results){
        if (results){
            var filteredResults = {};

            // de-dupe uisng dictionary
            for (var i in results){
                var obj = results[i];
                if (!filteredResults.hasOwnProperty(obj.id)){
                    filteredResults[obj.id] = obj;
                }
            }

            return Object.keys(filteredResults).map(key => filteredResults[key]);
        }
        return [];
    },

    'convertFieldSelectionToConstraints' : function convertFieldSelectionToConstraints(prefix, fields){
        if (fields){
            var arr = [];
            for(var i in fields){
                arr.push(prefix + '.' + fields[i]);
            }

            if (arr.length > 0){
                return ',' + arr.join(', ');
            }
        }
        return '';
    },

    'getInnerestHttpCodeInExceptionObject' : function getInnerestHttpCodeInExceptionObject(exceptionObject){
        if (!exceptionObject){            
            return 500;
        }

        var current = exceptionObject;
        var code = exceptionObject.code;

        while(current.innerException){
            current = current.innerException;
            code = current.code;
        }

        return code;
    },

    'constructResponseJsonFromExceptionRecursive' : function constructResponseJsonFromExceptionRecursive(exceptionObject){
        var returnedJson;
        if (exceptionObject){
            returnedJson = 
                { 
                    name : exceptionObject.name, 
                    message : exceptionObject.message,
                    code : exceptionObject.code,
                    activityId : exceptionObject.activityId,
                    innerException : constructResponseJsonFromExceptionRecursive(exceptionObject.innerException),
                    serviceName : exceptionObject.serviceName,
                    url : exceptionObject.url,
                    stack : exceptionObject.stack
                };
        }

        return returnedJson;
    },

    'forwardHttpRequest' : function *forwardHttpRequest(options, serviceName){
        return yield request(options).catch(function(err){
            console.log(err);
            throw new HttpRequestException('Request to ' + serviceName + ' failed.', options.url, JSON.parse(err.error));
        });
    }
}