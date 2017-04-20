'use strict'

module.exports = function(passport, config, logger){
    var helpers = require('../common/helpers.js');
    var BearerStrategy = require('passport-http-bearer').Strategy;
    var TokenGenerator = require('../common/tokengenerator.js').TokenGenerator;
    var UnauthorizedException = require('../common/error.js').UnauthorizedException;

    passport.use('token-bearer', new BearerStrategy(
        function(token, done) {
            logger.get().debug({req : req}, 'Attempt to decode token %s.', token);
            var tokenGenerator = new TokenGenerator(config);
            try{
                var decodedObject = tokenGenerator.decode(token);
                    
                if (!decodedObject || !decodedObject.id){
                    logger.get().debug({req : req}, 'Failed to decode token %s.', token);
                    return done(new UnauthorizedException('Invalid token'), false);
                }
            }
            catch(err){
                logger.get().debug({req : req}, 'Failed to decode token %s.', token);
                return done(new UnauthorizedException('Invalid token'), false);                
            }

            logger.get().debug({req : req}, 'Successfully decode token %s to user id %s.', token, decodedObject.id);
            return done(null, decodedObject.id);
        }
    ));
}