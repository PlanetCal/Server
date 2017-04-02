'use strict'

module.exports = {
    PasswordCrypto : function PasswordCrypto(){
        var bcrypt = require('bcrypt-nodejs');
        var helpers = require('../common/helpers.js');
        var InternalServerException = require('../common/error.js').InternalServerException;

        this.generateHash = function generateHash(decryptedValue){
            if (typeof(decryptedValue)!== 'string'){
                throw new InternalServerException('decryptedValue passed in is not an object.');
            }
            return bcrypt.hashSync(decryptedValue, bcrypt.genSaltSync(8), null);
        }

        this.compareValues = function compareValues(decryptedValue, encryptedValue){
            if (typeof(decryptedValue)!== 'string'){
                throw new InternalServerException('decryptedValue passed in is not an object.');
            }
            if (typeof(encryptedValue)!== 'string'){
                throw new InternalServerException('encryptedValue passed in is not an object.');
            }
            return bcrypt.compareSync(decryptedValue, encryptedValue);
        }
    }
}

