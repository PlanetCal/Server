module.exports = function(passport){
	"use strict"

	var LocalStrategy = require('passport-local').Strategy;
	var config = require('./config.js');
	var userDetails = require('./model/user.js');

	passport.use('local', new LocalStrategy({
	        // by default, local strategy uses username and password, we will override with email
	        usernameField: 'email',
	        passwordField: 'password',
	        passReqToCallback: true
	    },    
	    function(req, email, password, done){

	        userDetails.findOne({'email': email}, function(err, user) {
	            if (err){
	                return done(err, null);
	            }

	            console.log('user: ' + user);
	            if (user && user.password === password){
	                return done(null, user);
	            }

	            return done(null, null);
	    });
	}));


	passport.serializeUser(function(user, done) {
	  done(null, user._id);
	});

	// used to deserialize the user
	passport.deserializeUser(function(id, done) {
	  userDetails.findById(id, function(err, user) {
	    done(err, user);
	  });
	});
}