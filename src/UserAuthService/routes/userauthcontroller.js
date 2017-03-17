'use strict'

module.exports = function(passport){

    var router = require('express').Router();
    var TokenGenerator = new require('../../common/tokengenerator.js').TokenGenerator;
    var PasswordCrypto = require('../passwordcrypto.js').PasswordCrypto;
    var DataAccessLayer = require('../../common/dal.js').DataAccessLayer;
    var config = require('../../common/config.js');
    //var uuidGen = require('node-uuid');
    var dal = new DataAccessLayer(config.documentdbDatabaseName, config.usersCollectionName);

    router.post('/', function(req, res){
        if (!req.body || !req.body.email || !req.body.password){
            res.status(400);
            res.send({ 'message' : 'Invalid body'});        
        }
        else{
            var passwordCrypto = new PasswordCrypto();
            var passwordHash = passwordCrypto.generateHash(req.body.password);
            var options = { preTriggerInclude: config.insertUniqueUserTriggerName };            
            dal.insert({ email: req.body.email, passwordHash: passwordHash }, options, function(err, document){
                if (err){
                    res.status(err.code);
                    res.send({ 'err': err });
                }
                else{
                    res.status(201);
                    res.send({ 'email' : req.body.email, 'id' : document.id });
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
        else if (req.headers['auth-identity'] !== req.params.id){
            console.log('dsdsad');
            res.status(403);
            res.send({ 'message' : 'Forbidden'});
        }
        else{
            var passwordCrypto = new PasswordCrypto();
            var passwordHash = passwordCrypto.generateHash(req.body.password);

            dal.update(req.params.id, { email: req.body.email, passwordHash : passwordHash, id : req.params.id },
                function(err, obj){
                    if (err){
                        res.status(err.code);
                        res.send({ 'err': err });
                    }
                    else{
                        res.status(200);
                        res.send({ id : obj.id });
                    } 
                });
        }
    })

    router.delete('/:id', function(req, res){
        if (!req.params.id){
            res.status(400);
            res.send({ 'message' : 'Invalid user id in query string'});                    
        }
        //all small letters even if header name has capitals
        else if (req.headers['auth-identity'] !== req.params.id){
            res.status(403);
            res.send({ 'message' : 'Forbidden'});
        }
        else {
            dal.remove(req.params.id, function(err){
                if (err){
                    res.status(err.code);
                    res.send({ 'err': err });
                }
                else{
                    res.status(200);
                    res.send({ 'id' : req.params.id });
                }                
            });
        }
    })
    return router;  
}
