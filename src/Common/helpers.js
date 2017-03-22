'use strict'

var config = require('./config.js');

module.exports = {
    Helpers : function Helpers(){
        this.getRequestOption = function getRequestOption(req, targetEndpoint){
            return {
                headers: {'content-type' : 'application/json; charset=utf-8',
                          'auth-identity' : req.headers['auth-identity']},
                url: targetEndpoint,
                body: JSON.stringify(req.body)
            };
        }

        this.handleHttpForwardedResponse = function handleHttpForwardedResponse(error, responseFromRequest, body, res){
            if (error){
                res.status(500);
                res.send(error.message);
            }
            else if (responseFromRequest){
                res.status(responseFromRequest.statusCode);
                res.send(responseFromRequest.body);
            }
        }

        this.handleResults = function handleResults(err, res, onSuccess){
            if (err) {
                this.createError(err)
            }
            else {
                onSuccess();
            }
        }

        this.removeDuplicatedItemsById = function removeDuplicatedItemsById(results){
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
        }

        this.convertErrorToJson = function convertErrorToJson(err, showStack){
            var obj =  {
                'code' : err.code,
                'name' : err.name,
                'message' : err.message
            };

            if (showStack){
                obj.stack = err.stack;
            }

            return obj;
        }

        this.createError = function createError(code, name, message){
            return { code : code, name: name, message: message };
        }

        this.createErrorJson = function createError(err){
            var body = JSON.parse(err.body);
            return { code : err.code, name: body.code, message: body.message };
        }
    }
}