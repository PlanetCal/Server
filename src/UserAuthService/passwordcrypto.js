"use strict"

module.exports = {
    PasswordCrypto : function PasswordCrypto(){
        var bcrypt = require('bcrypt-nodejs');

        this.generateHash = function generateHash(decrytedValue){
            return bcrypt.hashSync(decrytedValue, bcrypt.genSaltSync(8), null);
        }

        this.compareValues = function compareValues(decryptedValue, encryptedValue){
            return bcrypt.compareSync(decryptedValue, encryptedValue);
        }
    }
}

