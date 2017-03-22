'use strict'

module.exports = function(passport){

    var router = require('express').Router();
    var TokenGenerator = new require('../../common/tokengenerator.js').TokenGenerator;

    router.post('/', passport.authenticate('local'), function(req, res){
        if (req.user && req.user.email && req.user.id){
            var tokenGenerator = new TokenGenerator();
            var token = tokenGenerator.encode({ email : req.user.email, id : req.user.id, time : Date.now() });
            res.status(200);
            res.json({ token : token });
        }
        else{
            res.status(401);
            res.json({ code : 401, name: 'Unauthorized', message: 'Operation unauthorized.'});
        }   
    });

    return router;
}
