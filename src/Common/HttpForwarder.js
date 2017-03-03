"use strict"

var http = require('http');

module.exports = {

    HttpForwarder: function HttpForwarder() {
        this.get = function get(options, callback) {
            try {
                var clientRequest = http.get(options, function (http_res) {
                    http_res.setEncoding('utf8');

                    var data = "";

                    http_res.on("error", function (err) {
                        callback(http_res.statusCode, null, err);
                    });

                    http_res.on("data", function (chunk) {
                        data += chunk;
                    });

                    http_res.on("end", function () {
                        callback(http_res.statusCode, JSON.parse(data), null);
                    });
                });

                clientRequest.on("error", function (err) {
                    callback(503, null, err);
                });
            }
            catch(err){
                callback(500, null, err);
            }
        }

        this.post = function post(options, callback){
            try {
                var clientRequest = http.post(options, function (http_res) {
                    http_res.setEncoding('utf8');

                    var data = "";

                    http_res.on("error", function (err) {
                        callback(http_res.statusCode, null, err);
                    });

                    http_res.on("data", function (chunk) {
                        data += chunk;
                    });

                    http_res.on("end", function () {
                        callback(http_res.statusCode, JSON.parse(data), null);
                    });
                });

                clientRequest.on("error", function (err) {
                    callback(503, null, err);
                });
            }
            catch(err){
                callback(500, null, err);
            }

        }
    }
}