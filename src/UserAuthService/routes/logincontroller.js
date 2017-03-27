'use strict'

module.exports = function(passport){

    var router = require('express').Router();
    var TokenGenerator = new require('../../common/tokengenerator.js').TokenGenerator;
    var helpers = require('../../common/helpers.js');
    var ForbiddenError = require('../../common/error.js').ForbiddenError;

    router.post('/', passport.authenticate('local'), helpers.wrap(function *(req, res){
        if (req.user && req.user.email && req.user.id){
            var tokenGenerator = new TokenGenerator();
            var token = tokenGenerator.encode({ email : req.user.email, id : req.user.id, time : Date.now() });
            res.status(200);
            res.json({ token : token });
        }
        else{
            throw new ForbiddenError('Forbidden.');
        }   
    }));

    return router;
}
