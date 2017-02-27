"use strict"

var mongoose = require('mongoose');
var config = require('./config.js');

mongoose.connect(config.url);

module.exports = mongoose;