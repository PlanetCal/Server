'use strict'
module.exports = {
    TokenGenerator : function TokenGenerator(){
        var jwtSimple = require('jwt-simple');
        var config = require('./config.js');
        var helpers = require('./helpers.js');

        this.encode = function encode(decodedObject){
            if (typeof(decodedObject) !== 'string'){
                throw helpers.createError(500, 'decodedObject passed in is not an object.');
            }

            return jwtSimple.encode(JSON.stringify(decodedObject), config.jwtSecret)
        }

        this.decode = function decode(encodedToken){
            if (typeof(encodedToken) !== 'string'){
                throw helpers.createError(500, 'encodedToken passed in is not an object.');
            }
            return JSON.parse(jwtSimple.decode(encodedToken, config.jwtSecret));
        }
    }   
}