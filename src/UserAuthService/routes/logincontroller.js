'use strict'

var router = require('express').Router();
var TokenGenerator = new require('../../common/tokengenerator.js').TokenGenerator;
var helpers = require('../../common/helpers.js');
var ForbiddenException = require('../../common/error.js').ForbiddenException;

module.exports = function(passport){

    router.post('/', passport.authenticate('local'), helpers.wrap(function *(req, res){
        console.log('user: ' + JSON.stringify(req.user));
        if (req.user && req.user.email && req.user.id && req.user.name){
            var tokenGenerator = new TokenGenerator();
            var token = tokenGenerator.encode({ email : req.user.email, id : req.user.id, name : req.user.name, time : Date.now() });
            res.status(200).json({ token : token, id : req.user.id, name : req.user.name });
        }
        else{
            throw new ForbiddenException('Forbidden. Please make sure that user has email, id and name.');
        }   
    }));

    return router;
}
