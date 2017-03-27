'use strict'

var config = require('../../common/config.js');
var router = require('express').Router();
var request = require('request-promise');
var helpers = require('../../common/helpers.js');

module.exports = function(){

    router.get('/:id', function(req, res){
        var url = config.userDetailsServiceEndpoint + '/userdetails/' + req.params.id;
        if (req.query){
            url = url + '?' + JSON.stringify(req.query);
        }
        var options = helpers.getRequestOption(req, url, 'GET'); 
        var results = request(options);
        res.status(200);
        res.json(JSON.parse(results));
    });

    router.post('/', function(req, res) {
        var options = helpers.getRequestOption(req, config.userDetailsServiceEndpoint + '/userdetails', 'POST'); 
        res.status(200);
        res.json(JSON.parse(results));
    });

    router.put('/:id', function(req, res) {
        var options = helpers.getRequestOption(req,  config.userDetailsServiceEndpoint + '/userdetails/' + req.params.id, 'PUT'); 
        res.status(200);
        res.json({id : id});
    });

    router.delete('/:id', function(req, res) {
        var options = helpers.getRequestOption(req,  config.userDetailsServiceEndpoint + '/userdetails/' + req.params.id, 'DELETE'); 
        res.status(200);
        res.json({id : req.params.id});
    });

    return router;  
}
