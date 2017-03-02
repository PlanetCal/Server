"use strict"
module.exports = function(){

    var http = require('http');

    HttpWrapper: function HttpWrapper() {
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
    }
}