"use strict"

var config = require('../common/config.js');

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

        this.handleResponse = function handleResponse(error, responseFromRequest, body, res){
            if (error){
                res.status(500);
                res.send(error.message);
            }
            else if (responseFromRequest){
                res.status(responseFromRequest.statusCode);
                res.send(responseFromRequest.body);
            }
        }
    }
}
