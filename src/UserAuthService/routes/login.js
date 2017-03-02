module.exports = function(passport){
	"use strict"

	var router = require('express').Router();
	var TokenGenerator = new require('../tokengenerator.js').TokenGenerator;

	router.post('/', passport.authenticate('local'), function(req, res){
		if (req.user && req.user.email){
			var tokenGenerator = new TokenGenerator();
		    var token = tokenGenerator.encode({ 'email' : req.user.email, 'time': Date.now() });
		    res.send({ 'token' : token });
		}
		else{
			res.send({ 'message' : 'Unauthorized'});
		}	
 	});

	return router;	
}
