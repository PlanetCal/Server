'use strict'
module.exports = {
    TokenGenerator : function TokenGenerator(){
        var jwtSimple = require('jwt-simple');
        var config = require('./config.js');
        var Helpers = require('./helpers.js').Helpers;
        var helpers  = new Helpers();

        this.encode = function encode(decodedObject){
            if (typeof decodedObject !== 'object'){
                throw helpers.createError(500, 'InvalidArgument', 'decodedObject passed in is not an object.');
            }

            return jwtSimple.encode(JSON.stringify(decodedObject), config.jwtSecret)
        }

        this.decode = function decode(encodedToken){
            if (typeof decodedObject !== 'object'){
                throw helpers.createError(500, 'InvalidArgument', 'encodedToken passed in is not an object.');
            }
            return JSON.parse(jwtSimple.decode(encodedToken, config.jwtSecret));
        }
    }   
}