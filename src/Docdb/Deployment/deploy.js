'use strict'

var argv = require('minimist')(process.argv.slice(2));
var DocumentClient = require('documentdb-q-promises').DocumentClientWrapper;
var config = require('../../common/config.json')[arv['env'] || 'development']; // TODO: Use express and app
var triggers = require('../triggers/insertuniqueusertrigger.js');

var client = new DocumentClient(config.documentdbEndpoint, { "masterKey": config.documentdbAuthKey });
var helpers = require('../../common/helpers.js');

var dbDefinition = {id : config.documentdbDatabaseName};

var database;
console.log('Creating database ' + config.documentdbDatabaseName + '....');
client.createDatabaseAsync(dbDefinition)
    .then(function(databaseResponse) {
        database = databaseResponse.resource;
        console.log(config.documentdbDatabaseName + ' created successfully.');
        console.log('Creating collection ' + config.usersCollectionName + '....');
        return client.createCollectionAsync(database._self, {id: config.usersCollectionName});
    })
    .then(function(collectionResponse) {
        var collection = collectionResponse.resource;
        console.log(collection.id + ' created successfully.');
        console.log('Creating trigger ' + config.insertUniqueUserTriggerName + ' on collection ' + config.usersCollectionName + '....');
        return client.createTriggerAsync(collection._self, triggers.insertUniqueUserTrigger, {});
    })
    .then(function(triggerResponse) {
        var trigger = triggerResponse.resource;
        console.log('Trigger ' + config.insertUniqueUserTriggerName + ' on collection ' + config.usersCollectionName + 'created successfully.');
        console.log('Creating collection ' + config.userDetailsCollectionName + '....');        
        return client.createCollectionAsync(database._self, {id: config.userDetailsCollectionName});
    })
    .then(function(collectionResponse) {
        var collection = collectionResponse.resource;
        console.log(collection.id + ' created successfully.');
        console.log('Creating collection ' + config.eventsCollectionName + '....');        
        return client.createCollectionAsync(database._self, {id: config.eventsCollectionName});
    })
    .then(function(collectionResponse) {
        var collection = collectionResponse.resource;
        console.log(collection.id + ' created successfully.');
        console.log('Creating collection ' + config.groupsCollectionName + '....');        
        return client.createCollectionAsync(database._self, {id: config.groupsCollectionName});
    })
    .fail(function(error) {
        console.log("An error occured", error);
    });