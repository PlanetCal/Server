"use strict"
module.exports = {
	
	TokenGenerator : function TokenGenerator(){
		var jwtSimple = require('jwt-simple');
		var config = require('./config.js');

		this.encode = function encode(decodedObject){
			return jwtSimple.encode(JSON.stringify(decodedObject), config.jwtSecret)
		}

		this.decode = function decode(encodedToken){
			return JSON.parse(jwtSimple.decode(encodedToken, config.jwtSecret));
		}
	}	
}