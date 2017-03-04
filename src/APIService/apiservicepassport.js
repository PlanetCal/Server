"use strict"

module.exports = function(passport){

    var config = require('../common/config.js');
    var BearerStrategy = require('passport-http-bearer').Strategy;
    var TokenGenerator = require('../common/tokengenerator.js').TokenGenerator;

    passport.use('token-bearer', new BearerStrategy(
        function(token, done) {
            var tokenGenerator = new TokenGenerator();
            try{
                var decodedObject = tokenGenerator.decode(token);
                
                if (!decodedObject || !decodedObject.email){
                    return done(null, false);
                }
            }
            catch(err){
                return done(null, null); 
            }
            return done(null, decodedObject.email);
        }
    ));
}