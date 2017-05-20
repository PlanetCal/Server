'use strict'

var Promise = require('bluebird');
var request = require('request-promise');
var ForbiddenException = require('./error.js').ForbiddenException;
var UnauthorizedException = require('./error.js').UnauthorizedException;
var InternalServerException = require('./error.js').InternalServerException;
var HttpRequestException = require('./error.js').HttpRequestException;

module.exports = {

    'wrap' : function wrap (genFn) { 
        var cr = Promise.coroutine(genFn);
        return function (req, res, errorHandler) {
            cr(req, res, errorHandler).catch(errorHandler);
        }
    },

    'wrapLocalStrategyAuth' : function wrapLocalStrategyAuth(genFunc){
        var cr = Promise.coroutine(genFunc); 
        return function (req, email, password, done) {
            cr(req, email, password, done).catch(function(err){
                done(err, null);
            });
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

    'constructResponseJsonFromExceptionRecursive' : function constructResponseJsonFromExceptionRecursive(exceptionObject, logStack){
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
                    errorcode : exceptionObject.errorcode,
                    url : exceptionObject.url                    
                };

            if (logStack === true){
                returnedJson.stack = exceptionObject.stack;
            }
        }

        return returnedJson;
    },

    'forwardHttpRequest' : function *forwardHttpRequest(options, serviceName){
        return yield request(options).catch(function(err){
            try{
                var extractedException = JSON.parse(err.error);
            }
            catch(e){
            }

            if (!extractedException){
                extractedException = err;
            }
            throw new HttpRequestException('Request to ' + serviceName + ' failed.', options.url, extractedException);
        });
    },

    'handleServiceException' : function handleServiceException(err, req, res, serviceName, logger, logStack){
        err.serviceName = serviceName;
        err.activityId = req.headers['activityid'];

        var exception = this.constructResponseJsonFromExceptionRecursive(err, logStack);
        
        if (err && err.code < 500){
            logger.get().info({exception : exception});
        }
        else{        
            logger.get().error({exception : exception});
        }

        res.status(err.code || 500).json(exception);
    }
}