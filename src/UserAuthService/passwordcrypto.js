'use strict'

module.exports = {
    PasswordCrypto : function PasswordCrypto(){
        var bcrypt = require('bcrypt-nodejs');
        var helpers = require('../common/helpers.js');

        this.generateHash = function generateHash(decryptedValue){
            if (typeof(decryptedValue)!== 'string'){
                throw helpers.createError(500, 'decryptedValue passed in is not an object.');
            }
            return bcrypt.hashSync(decryptedValue, bcrypt.genSaltSync(8), null);
        }

        this.compareValues = function compareValues(decryptedValue, encryptedValue){
            if (typeof(decryptedValue)!== 'string'){
                throw helpers.createError(500, 'decryptedValue passed in is not an object.');
            }
            if (typeof(encryptedValue)!== 'string'){
                throw helpers.createError(500, 'encryptedValue passed in is not an object.');
            }
            return bcrypt.compareSync(decryptedValue, encryptedValue);
        }
    }
}

