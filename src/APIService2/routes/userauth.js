"use strict"

var config = require('../../common/config.js');
var router = require('express').Router();
var request = require('request');

module.exports = function(){

    router.put('/:id', function(req, res) {
        request.put(getRequestOption(req), function(error, responseFromRequest, body){
            handleResponse(error, responseFromRequest, body, res);
        });    
    });

    router.delete('/:id', function(req, res) {
        request.delete(getRequestOption(req), function(error, responseFromRequest, body){
            handleResponse(error, responseFromRequest, body, res);
        });    
    });

    return router;  
}

function getRequestOption(req){
    return {
        headers: {'content-type' : 'application/json; charset=utf-8',
                  'auth-identity' : req.headers['auth-identity']},
        url: config.userAuthServiceEndpoint + '/userauth/' + req.params.id,
        body: JSON.stringify(req.body)
    };
}

function handleResponse(error, responseFromRequest, body, res){
    if (error){
        res.status(500);
        res.send(error.message);
    }
    else if (responseFromRequest){
        res.status(responseFromRequest.statusCode);
        res.send(responseFromRequest.body);
    }
}
