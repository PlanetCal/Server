"use strict"

var config = require('../../common/config.js');
var router = require('express').Router();
var request = require('request');
var Helpers = require('../helpers.js').Helpers;

module.exports = function(){

    var helpers = new Helpers();

    router.put('/:id', function(req, res) {

        request.put(helpers.getRequestOption(req), function(error, responseFromRequest, body){
            helpers.handleResponse(error, responseFromRequest, body, res);
        });    
    });

    router.delete('/:id', function(req, res) {
        request.delete(helpers.getRequestOption(req), function(error, responseFromRequest, body){
            helpers.handleResponse(error, responseFromRequest, body, res);
        });    
    });

    return router;  
}

