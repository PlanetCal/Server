'use strict'
module.exports = {
    TokenGenerator : function TokenGenerator(){
        var jwtSimple = require('jwt-simple');
        var config = require('./config.js');
        var helpers = require('./helpers.js');
        var InternalServerError = require('./error.js').InternalServerError;

        this.encode = function encode(decodedObject){
            if (typeof(decodedObject) !== 'object'){
                throw new InternalServerError('decodedObject passed in is not an object.');
            }

            return jwtSimple.encode(JSON.stringify(decodedObject), config.jwtSecret)
        }

        this.decode = function decode(encodedToken){
            if (typeof(encodedToken) !== 'string'){
                throw new InternalServerError('encodedToken passed in is not an string.');
            }
            return JSON.parse(jwtSimple.decode(encodedToken, config.jwtSecret));
        }
    }   
}