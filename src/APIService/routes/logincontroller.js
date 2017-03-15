"use strict"

module.exports = function(){

    var router = require('express').Router();
    var request = require('request');
    var config = require('../../common/config.js');
    var bodyParser = require('body-parser');
    var Helpers = require('../../common/helpers.js').Helpers;

    var helpers = new Helpers();

    router.get('/', function(req, res){
        res.render('login');
    });

    router.post('/', function(req, res){
        // body-parser converts urlencoded string to
        request.post(helpers.getRequestOption(req, config.userAuthServiceEndpoint + '/login'),
            function(error, responseFromRequest, body){
                helpers.handleHttpForwardedResponse(error, responseFromRequest, body, res);
            });
    });

    return router;  
}
