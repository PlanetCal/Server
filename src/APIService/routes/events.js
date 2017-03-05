"use strict"

var config = require('../../common/config.js');
var router = require('express').Router();
var request = require('request');
var Helpers = require('../helpers.js').Helpers;

var helpers = new Helpers();

module.exports = function(){

    router.get('/:id', function(req, res){
        request.get(helpers.getRequestOption(req, config.eventServiceEndpoint + '/events/' + req.params.id),
            function(error, responseFromRequest, body){
                helpers.handleResponse(error, responseFromRequest, body, res);
            });    
    });

    router.get('/', function(req, res){
        request.get(helpers.getRequestOption(req, config.eventServiceEndpoint + '/events?userids=' + req.query.userids),
            function(error, responseFromRequest, body){
                helpers.handleResponse(error, responseFromRequest, body, res);
            });    
    });

    router.post('/', function(req, res) {
        request.post(helpers.getRequestOption(req, config.eventServiceEndpoint + '/events'),
            function(error, responseFromRequest, body){
                helpers.handleResponse(error, responseFromRequest, body, res);
            });    
    });

    router.put('/:id', function(req, res) {
        request.put(helpers.getRequestOption(req, config.eventServiceEndpoint + '/events/' + req.params.id),
            function(error, responseFromRequest, body){
                helpers.handleResponse(error, responseFromRequest, body, res);
            });    
    });

    router.delete('/:id', function(req, res) {
        request.delete(helpers.getRequestOption(req, config.eventServiceEndpoint + '/events/' + req.params.id),
            function(error, responseFromRequest, body){
                helpers.handleResponse(error, responseFromRequest, body, res);
            });    
    });

    return router;  
}
