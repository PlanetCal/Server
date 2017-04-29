'use strict'

module.exports = function(passport, config, logger){
    var helpers = require('../common/helpers.js');
    var BearerStrategy = require('passport-http-bearer').Strategy;
    var TokenGenerator = require('../common/tokengenerator.js').TokenGenerator;
    var UnauthorizedException = require('../common/error.js').UnauthorizedException;

    passport.use('token-bearer', new BearerStrategy(
        function(token, done) {
            logger.get().debug('Attempt to decode token %s.', token);
            var tokenGenerator = new TokenGenerator(config);
            try{
                var decodedObject = tokenGenerator.decode(token);
                    
                if (!decodedObject || !decodedObject.id){
                    return done(new UnauthorizedException('Invalid token'), false);
                }
            }
            catch(err){
                return done(new UnauthorizedException('Invalid token'), false);                
            }

            logger.get().debug('Successfully decode token %s to user id %s.', token, decodedObject.id);
            return done(null, decodedObject.id);
        }
    ));
}