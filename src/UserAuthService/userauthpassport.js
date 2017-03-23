'use strict'

module.exports = function(passport){

    var config = require('../common/config.js');
    var LocalStrategy = require('passport-local').Strategy;

    var PasswordCrypto = require('./passwordcrypto.js').PasswordCrypto;
    var TokenGenerator = require('../common/tokengenerator.js').TokenGenerator;
    var DataAccessLayer = require('../common/dal.js').DataAccessLayer;
    var dal = new DataAccessLayer(config.documentdbDatabaseName, config.usersCollectionName);
    var Helpers = require('../common/helpers.js').Helpers;
    var helpers = new Helpers();

    passport.use('local', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField: 'email',
            passwordField: 'password',
            passReqToCallback: true
        },    
        function(req, email, password, done){
            var querySpec = getUserQuerySpecFromEmail(email);
            dal.get(querySpec)
                .then(function(documentResponse){
                    var passwordCrypto = new PasswordCrypto();

                    if (results && results.length > 0){
                        // should yield only one result if found
                        var user = results[0];

                        if (passwordCrypto.compareValues(password, user.passwordHash)){
                            return done(null, user);
                        }
                    }
                    return done(null, null);                    
                })
                .fail(function(err){
                    return done(err, null);
                });
    }));

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        var querySpec = getUserQuerySpecFromId(id);
        dal.get(querySpec)
            .then(function(documentResponse){
                done(err, user);
            })
            .fail(function(err){
                done(err, user);
            });
    });
}

function getUserQuerySpecFromEmail(email){
    if (typeof email !== 'object'){
        throw helpers.createError(500, 'InvalidArgument', 'email is not a proper object.');
    }

    var queryString = "SELECT e.id, e.email, e.passwordHash FROM root e WHERE e.email = @email";
                    
    var parameters = [
        {
            name: "@email",
            value: email
        }
    ];

    return {
        query: queryString,
        parameters: parameters
    };
}

function getUserQuerySpecFromId(id){
    if (typeof id !== 'object'){
        throw helpers.createError(500, 'InvalidArgument', 'id is not a proper object.');
    }

    var queryString = "SELECT e.id, e._self, e.email, e.passwordHash FROM root e WHERE e.id = @id";
                    
    var parameters = [
        {
            name: "@id",
            value: id
        }
    ];

    return {
        query: queryString,
        parameters: parameters
    };
}
