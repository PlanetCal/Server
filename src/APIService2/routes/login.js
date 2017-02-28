module.exports = function(passport){
	"use strict"

	var router = require('express').Router();
	var TokenGenerator = new require('../tokengenerator.js').TokenGenerator;

	router.get('/', function(req, res){
	    res.render('login');
	});

	router.post('/', passport.authenticate('local'), function(req, res){
		if (req.user && req.user.email){
			var tokenGenerator = new TokenGenerator();
		    var token = tokenGenerator.encode({ 'email' : req.user.email });

		    res.json({ 'token' : token })
		}	
 	});

	return router;	
}
