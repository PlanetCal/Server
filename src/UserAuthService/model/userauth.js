"use strict"

var mongoose = require('mongoose');
var config = require('../config.js');
var mongoUrl = config.url;

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error to ' + mongoUrl));
db.once('open', function() {
    console.log('Connection to ' + mongoUrl + ' successful.');
});

mongoose.connect(config.url);

// define the schema for our user model
var userAuthSchema = mongoose.Schema(
	{
		email: String,
	    passwordHash: String
	},
    {
    	collection : config.userCollection
	}
    /*
    ,
    facebook: {
        id: String,
        token: String,
        email: String,
        name: String
    },
    twitter: {
        id: String,
        token: String,
        displayName: String,
        username: String
    },
    google: {
        id: String,
        token: String,
        email: String,
        name: String
    }
	*/
);

// create the model for users and expose it to our app
module.exports = mongoose.model('userAuth', userAuthSchema);