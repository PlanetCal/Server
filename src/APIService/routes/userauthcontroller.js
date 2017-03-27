'use strict'

var config = require('../../common/config.js');
var router = require('express').Router();
var request = require('request-promise');
var helpers = require('../../common/helpers.js');

module.exports = function(){
    router.put('/:id', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, config.userAuthServiceEndpoint + '/userauth/' + req.params.id, 'PUT'); 
        var results = yield request(options);
        res.status(200);
        res.json(JSON.parse(results));
    }));

    router.delete('/:id', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req,  config.userAuthServiceEndpoint + '/userauth/' + req.params.id, 'DELETE'); 
        var results = yield request(options);
        res.status(200);
        res.json({id : req.params.id});
    }));

    return router;  
}

