'use strict'

var config = require('../common/config.js');
var helpers = require('../common/helpers.js');
var BearerStrategy = require('passport-http-bearer').Strategy;
var TokenGenerator = require('../common/tokengenerator.js').TokenGenerator;
var UnauthorizedException = require('../common/error.js').UnauthorizedException;

module.exports = function(passport){

    passport.use('token-bearer', new BearerStrategy(
        function(token, done) {
            var tokenGenerator = new TokenGenerator();
            try{
                var decodedObject = tokenGenerator.decode(token);
                    
                if (!decodedObject || !decodedObject.id){
                    return done(new UnauthorizedException('Invalid token'), false);
                }
            }
            catch(err){
                return done(new UnauthorizedException('Invalid token'), false);                
            }

            return done(null, decodedObject.id);
        }
    ));
}