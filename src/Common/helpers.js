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
                'name' : err.name,
                'status' : err.status,
                'message' : err.message
            };

            if (showStack){
                obj.stack = err.stack;
            }

            return obj;
        }

        this.createError = function createError(status, name, message){
            var err = new Error(message);
            err.name = name;
            err.status = status;

            return err;
        }

        this.createErrorFromDocumentDbError = function createErrorFromDocumentDbError(err){
            var body = JSON.parse(err.body);
            var err = new Error(body.message);
            err.name = body.code;
            err.status = err.code;
            err.innertError = body;

            return err;
        }
    }
}
