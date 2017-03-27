'use strict'

var config = require('./config.js');
var Promise = require('bluebird');
var BadRequestError = require('./error.js').BadRequestError;
var ForbiddenError = require('./error.js').ForbiddenError;
var NotFoundError = require('./error.js').NotFoundError;
var UnauthorizedError = require('./error.js').UnauthorizedError;

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
                          'auth-identity' : req.headers['auth-identity']},
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

    'createError' : function (code, message){
            var err = new Error(message);
            err.code = code;
            err.message = message;
            return err;
        },

    'createErrorJson' : function (err){
            var body = JSON.parse(err.body);
            return { code : err.code, name: body.code, message: body.message };
        },

    'handleError' : function(res, err, next){
        if (err instanceof(BadRequestError)) {
            res.status(400);
            return res.send({message: err.message});
        }
        if (err instanceof(NotFoundError)){
            res.status(404);
            return res.send({message: err.message});
        }    
        if (err instanceof(ForbiddenError)){
            res.status(403);
            return res.send({message: err.message});
        }
        if (err instanceof(UnauthorizedError)){
            res.status(401);
            return res.send({message: err.message});
        }
        next(err);
    }
}