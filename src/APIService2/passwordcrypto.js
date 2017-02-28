"use strict"

var bcrypt = require('bcrypt-nodejs');

module.exports = {
	PasswordCrypto : function PasswordCrypto(){

		this.generateHash = function generateHash(decrytedValue){
			return bcrypt.hashSync(decrytedValue, bcrypt.genSaltSync(8), null);
		}

		this.compareValues = function compareValues(decryptedValue, encryptedValue){
		    return bcrypt.compareSync(decryptedValue, encryptedValue);
		}
	}
}

