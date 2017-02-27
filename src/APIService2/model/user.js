"use strict"

var bcrypt = require('bcrypt-nodejs');
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
var userSchema = mongoose.Schema(
	{
		email: String,
	    password: String,
	    name: String
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

userSchema.methods.generateHash = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.local.password);
};

// create the model for users and expose it to our app
module.exports = mongoose.model('userDetails', userSchema);