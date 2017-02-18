"use strict"

var express = require('express');
var router = express.Router();
var http = require('http');

router.get('/:id', function (req, res) {

    var options = {
        host: 'localhost',
        port: 1337,
        path: '/accounts/' + req.params.id,
        method: 'GET'
    };

    http.get(options, function (http_res) {
        http_res.setEncoding('utf8');

        // initialize the container for our data
        var data = "";

        http_res.on("data", function (chunk) {
            data += chunk;
        });

        http_res.on("end", function () {
            res.status = http_res.statusCode;
            res.send(JSON.parse(data));
        });
    });
});

module.exports = router;