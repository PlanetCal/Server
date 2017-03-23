'use strict'

var config = require('../../common/config.js');
var router = require('express').Router();
var request = require('request');
var Helpers = require('../../common/helpers.js').Helpers;

var helpers = new Helpers();

module.exports = function(){

    var controllerName = 'groups';
    var endpoint = config.groupsServiceEndpoint;

    router.get('/:id', function(req, res){
        request.get(helpers.getRequestOption(req, endpoint + '/' + controllerName + '/' + req.params.id),
            function(error, responseFromRequest, body){
                helpers.handleHttpForwardedResponse(error, responseFromRequest, body, res);
            });    
    });

    router.get('/', function(req, res){
        request.get(helpers.getRequestOption(req, endpoint + '/' + controllerName + '?' + JSON.stringify(req.query)),
            function(error, responseFromRequest, body){
                helpers.handleHttpForwardedResponse(error, responseFromRequest, body, res);
            });    
    });

    router.post('/', function(req, res) {
        request.post(helpers.getRequestOption(req, endpoint + '/' + controllerName),
            function(error, responseFromRequest, body){
                helpers.handleHttpForwardedResponse(error, responseFromRequest, body, res);
            });    
    });

    router.put('/:id', function(req, res) {
        request.put(helpers.getRequestOption(req, endpoint + '/' + controllerName + '/' + req.params.id),
            function(error, responseFromRequest, body){
                helpers.handleHttpForwardedResponse(error, responseFromRequest, body, res);
            });
    });

    router.delete('/:id', function(req, res) {
        request.delete(helpers.getRequestOption(req, endpoint + '/' + controllerName + '/' + req.params.id),
            function(error, responseFromRequest, body){
                helpers.handleResponse(error, responseFromRequest, body, res);
            });    
    });

    return router;  
}
