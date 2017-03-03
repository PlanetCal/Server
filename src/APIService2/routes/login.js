"use strict"

module.exports = function(){

    var router = require('express').Router();
    var request = require('request');
    var config = require('../../common/config.js');
    var bodyParser = require('body-parser');

    router.get('/', function(req, res){
        res.render('login');
    });

    router.post('/', function(req, res){
        // body-parser converts urlencoded string to
        request.post({
            headers: {'content-type' : 'application/json; charset=utf-8' },
            url:     config.userAuthServiceEndpoint + '/login',
            body:    JSON.stringify(req.body)},
            function(error, response, body){
                if (error){
                    console.log(error);
                    res.status(500);
                    res.send(error.message);
                }
                else if (response){
                    console.log(response.body);
                    res.status(response.statusCode);
                    res.send(response.body);
                }
            });
    });

    return router;  
}
