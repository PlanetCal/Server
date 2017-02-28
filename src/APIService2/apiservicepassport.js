module.exports = function(passport){
	"use strict"

	var config = require('./config.js');
	var LocalStrategy = require('passport-local').Strategy;
	var BearerStrategy = require('passport-http-bearer').Strategy;

	var userLogin = require('./model/userlogin.js');
	var TG = new require('./tokengenerator.js');

	passport.use('local', new LocalStrategy({
	        // by default, local strategy uses username and password, we will override with email
	        usernameField: 'email',
	        passwordField: 'password',
	        passReqToCallback: true
	    },    
	    function(req, email, password, done){

	        userLogin.findOne({'email': email}, function(err, user) {
	            if (err){
	                return done(err, null);
	            }

	            if (user && user.passwordHash === password){
	                return done(null, user);
	            }

	            return done(null, null);
	    });
	}));

	passport.use('token-bearer', new BearerStrategy(
		function(token, done) {
			var tokenGenerator = new TG.TokenGenerator();
			try{
				var decodedObject = tokenGenerator.decode(token);
				if (!decodedObject || !decodedObject.email){
					return done(null, false);
				}
			}
			catch(err){
				return done(null, null); 
			}
			return done(null, decodedObject.email);
		}
	));

	passport.serializeUser(function(user, done) {
		done(null, user._id);
	});

	// used to deserialize the user
	passport.deserializeUser(function(id, done) {
		userLogin.findById(id, function(err, user) {
			done(err, user);
		});
	});
}