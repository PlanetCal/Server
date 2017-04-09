'use strict'

var router = require('express').Router();
var TokenGenerator = new require('../../common/tokengenerator.js').TokenGenerator;
var helpers = require('../../common/helpers.js');
var ForbiddenException = require('../../common/error.js').ForbiddenException;

module.exports = function(passport){

    router.post('/', passport.authenticate('local'), helpers.wrap(function *(req, res){
        if (req.user && req.user.email && req.user.id ){
            var tokenGenerator = new TokenGenerator();
            var token = tokenGenerator.encode({ email : req.user.email, id : req.user.id, time : Date.now() });
            res.status(200).json({ token : token, id : req.user.id });
        }
        else{
            throw new ForbiddenException('Forbidden.');
        }   
    }));

    return router;
}
