'use strict'

var config = require('./config.js');
var Promise = require('bluebird');
var BadRequestException = require('./error.js').BadRequestException;
var ForbiddenException = require('./error.js').ForbiddenException;
var NotFoundEException = require('./error.js').NotFoundException;
var UnauthorizedException = require('./error.js').UnauthorizedException;
var InternalServerException = require('./error.js').InternalServerException;

module.exports = {
    'wrap' : function (genFn) { 
        var cr = Promise.coroutine(genFn) 
        return function (req, res, next) {
            cr(req, res, next).catch(next);
        }
    },

    'getRequestOption' : function (req, targetEndpoint, method){
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

    'removeDuplicatedItemsById' : function (results){
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

    'handleError' : function(res, err, next){
        if (err instanceof(BadRequestException)) {
            res.status(400);
            return res.send({message: err.message});
        }
        if (err instanceof(NotFoundException)){
            res.status(404);
            return res.send({message: err.message});
        }    
        if (err instanceof(ForbiddenException)){
            res.status(403);
            return res.send({message: err.message});
        }
        if (err instanceof(UnauthorizedException)){
            res.status(401);
            return res.send({message: err.message});
        }
        if (err instanceof(InternalServerException)){
            res.status(500);
            return res.send({message: err.message});
        }
        next(err);
    },

    'convertFieldSelectionToConstraints' : function(prefix, fields){
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

    'constructResponseJsonFromExceptionRecursive' : function constructResponseJsonFromExceptionRecursive(app, exceptionObject){
        var returnedJson;
        if (exceptionObject){
            returnedJson = 
                { 
                    name : exceptionObject.name, 
                    message : exceptionObject.message,
                    activityid : exceptionObject.activityId,
                    innerException : constructResponseJsonFromExceptionRecursive(app, exceptionObject.innerException),
                    serviceName : exceptionObject.serviceName
                };

            if (app.get('env') === 'development') {
                returnedJson.stack = exceptionObject.stack; 
            }            
        }

        return returnedJson;
    }
}