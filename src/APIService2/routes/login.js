module.exports = function(passport){
	"use strict"

	var router = require('express').Router();

	router.get('/', function(req, res){
	    res.render('login');
	});

	router.post('/', passport.authenticate('local'), function(req, res){
	    res.redirect('/');
	});

	return router;	
}
