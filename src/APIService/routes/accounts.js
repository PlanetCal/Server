"use strict"

var express = require('express');
var router = express.Router();
var HttpForwarder = require('../../common/httpforwarder.js').HttpForwarder;

router.get('/:id', function (req, res) {

    var options = {
        host: 'localhost',
        port: 1337,
        path: '/accounts/' + req.params.id,
        method: 'GET'
    };

    var httpForwarder = new HttpForwarder();
    httpForwarder.get(options, function (httpStatusCode, jsonData, err) {
        res.status(httpStatusCode);

        if (err) {
            res.send([{
                "httpStatusCode": httpStatusCode,
                "jsonData" : [],
                "message": err.message
            }]);
        }
        else {
            res.send(jsonData);
        }
    });
});

module.exports = router;