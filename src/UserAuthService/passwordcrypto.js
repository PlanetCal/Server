'use strict'

module.exports = {
    PasswordCrypto : function PasswordCrypto(){
        var bcrypt = require('bcrypt-nodejs');
        var helpers = require('../common/helpers.js');
        var InternalServerError = require('../common/error.js').InternalServerError;

        this.generateHash = function generateHash(decryptedValue){
            if (typeof(decryptedValue)!== 'string'){
                throw new InternalServerError('decryptedValue passed in is not an object.');
            }
            return bcrypt.hashSync(decryptedValue, bcrypt.genSaltSync(8), null);
        }

        this.compareValues = function compareValues(decryptedValue, encryptedValue){
            if (typeof(decryptedValue)!== 'string'){
                throw new InternalServerError('decryptedValue passed in is not an object.');
            }
            if (typeof(encryptedValue)!== 'string'){
                throw new InternalServerError('encryptedValue passed in is not an object.');
            }
            return bcrypt.compareSync(decryptedValue, encryptedValue);
        }
    }
}

