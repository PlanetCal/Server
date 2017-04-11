'use strict'

var jwtSimple = require('jwt-simple');
var helpers = require('./helpers.js');
var InternalServerException = require('./error.js').InternalServerException;

module.exports = {
    
    TokenGenerator : function TokenGenerator(config){

        this.config = config;

        this.encode = function encode(decodedObject){
            if (typeof(decodedObject) !== 'object'){
                throw new InternalServerException('decodedObject passed in is not an object.');
            }

            return jwtSimple.encode(JSON.stringify(decodedObject), this.config.jwtSecret)
        }

        this.decode = function decode(encodedToken){
            if (typeof(encodedToken) !== 'string'){
                throw new InternalServerException('encodedToken passed in is not an string.');
            }
            return JSON.parse(jwtSimple.decode(encodedToken, this.config.jwtSecret));
        }
    }   
}