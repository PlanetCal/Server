"use strict"

module.exports = function(passport, userAuthModel){

    var router = require('express').Router();
    var TokenGenerator = new require('../../common/tokengenerator.js').TokenGenerator;
    var PasswordCrypto = require('../passwordcrypto.js').PasswordCrypto;

    router.post('/', function(req, res){
        if (!req.body || !req.body.email || !req.body.password){
            res.status(400);
            res.send({ 'message' : 'Invalid body'});        
        }
        else{
            var passwordCrypto = new PasswordCrypto();
            var passwordHash = passwordCrypto.generateHash(req.body.password);
            var model = new userAuthModel({ email: req.body.email, passwordHash: passwordHash });
            model.save(function (err) {
                if (err){
                    // TODO: Is it really 409? What else?
                    res.status(409);
                    res.send({ 'err': err.message });
                }
                else{
                    res.status(201);
                    res.send({ 'email' : req.body.email });
                }
            });
        }
    });

    router.put('/:id', function(req, res){
        if (!req.body || !req.body.email || !req.body.password){
            res.status(400);
            res.send({ 'message' : 'Invalid body'});
        }
        //all small letters even if header name has capitals
        else if (req.headers['auth-identity'] !== req.body.email){
            res.status(403);
            res.send({ 'message' : 'Forbidden'});
        }
        else{
            var passwordCrypto = new PasswordCrypto();
            var passwordHash = passwordCrypto.generateHash(req.body.password);

            userAuthModel.findOneAndUpdate({ email: req.params.id }, 
                { email: req.body.email, passwordHash: passwordHash }, 
                function (err, userAuth) {
                    if (err){
                        // TODO: Is it really 409? What else?
                        res.status(409);
                        res.send({ 'err': err.message });
                    }
                    else{
                        res.status(200);
                        res.send({ 'email' : userAuth.email });
                    }
                });
        }
    })

    router.delete('/:id', function(req, res){
        if (!req.params.id){
            res.status(400);
            res.send({ 'message' : 'Invalid email in query string'});                    
        }
        //all small letters even if header name has capitals
        else if (req.headers['auth-identity'] !== req.params.id){
            res.status(403);
            res.send({ 'message' : 'Forbidden'});
        }
        else {
            userAuthModel.findOne({'email': req.params.id}, function(err, userAuth) {
                if (err){
                    // TODO: Really 500?
                    res.status(500);
                    res.send({ 'message' : err.message })
                }
                else{
                    userAuth.remove(function(err){
                        if (err){
                            // TODO: Really 500 again?
                            res.status(500);
                            res.send({ 'message' : err.message });
                        }
                        else{
                            res.status(200);
                            res.send({ email: req.params.id });
                        }
                    });
                }
            });
        }
    })
    return router;  
}
