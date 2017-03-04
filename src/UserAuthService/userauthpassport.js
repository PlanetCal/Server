"use strict"

module.exports = function(passport, userAuth){

    var config = require('../common/config.js');
    var LocalStrategy = require('passport-local').Strategy;

    var PasswordCrypto = require('./passwordcrypto.js').PasswordCrypto;
    var TokenGenerator = require('../common/tokengenerator.js').TokenGenerator;

    passport.use('local', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField: 'email',
            passwordField: 'password',
            passReqToCallback: true
        },    
        function(req, email, password, done){
            userAuth.findOne({'email': email}, function(err, user) {
                if (err){
                    return done(err, null);
                }
                var passwordCrypto = new PasswordCrypto();

                if (user && passwordCrypto.compareValues(password, user.passwordHash)){
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
        userAuthModel.findById(id, function(err, user) {
            done(err, user);
        });
    });
}