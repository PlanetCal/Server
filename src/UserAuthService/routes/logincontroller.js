'use strict'

var router = require('express').Router();
var TokenGenerator = new require('../../common/tokengenerator.js').TokenGenerator;
var helpers = require('../../common/helpers.js');
var ForbiddenException = require('../../common/error.js').ForbiddenException;

module.exports = function(passport, config, logger){

    router.post('/', passport.authenticate('local'), helpers.wrap(function *(req, res){        
        logger.get().debug({req : req, userAuth : req.user}, 'User authenticatd.');

        if (req.user && req.user.email && req.user.id && req.user.name){
            logger.get().debug({req : req}, 'Generating token...');
            var tokenGenerator = new TokenGenerator(config);
            var token = tokenGenerator.encode({ email : req.user.email, id : req.user.id, name : req.user.name, time : Date.now() });
            logger.get().debug({req : req}, 'Token generated successfully.');
            res.status(200).json({ token : token, id : req.user.id, name : req.user.name });
        }
        else{
            throw new ForbiddenException('Forbidden');
        }   
    }));

    return router;
}
