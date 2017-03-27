'use strict'

module.exports = function(){

    var router = require('express').Router();
    var request = require('request-promise');
    var config = require('../../common/config.js');
    var bodyParser = require('body-parser');
    var helpers = require('../../common/helpers.js');

    router.get('/', function(req, res){
        res.render('login');
    });

    router.post('/', function(req, res){
        var options = helpers.getRequestOption(req, config.userAuthServiceEndpoint + '/login', 'POST');
        var results = request(options);
        res.status(200);
        res.json(JSON.parse(results));
    });

    return router;  
}
