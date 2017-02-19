"use strict"

var express = require('express');
var router = express.Router();
var HttpWrapper = require('../../common/httpwrapper.js');
var httpWrapper = new HttpWrapper.HttpWrapper();

router.get('/:id', function (req, res) {

    var options = {
        host: 'localhost',
        port: 1337,
        path: '/accounts/' + req.params.id,
        method: 'GET'
    };

    httpWrapper.get(options, function (httpStatusCode, jsonData, err) {
        if (err) {
            res.status = httpStatusCode;
            res.send([{
                "httpStatusCode": httpStatusCode,
                "jsonData" : [],
                "message": err.message
            }]);
        }
        else {
            res.status = 200;
            res.send(jsonData);
        }
    });
});

module.exports = router;