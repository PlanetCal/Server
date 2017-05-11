'use strict'

var argv = require('minimist')(process.argv.slice(2));
var DocumentClient = require('documentdb-q-promises').DocumentClientWrapper;
var config = require('../../common/config.json')[argv['env'] || 'development'];
var triggers = require('../triggers/insertuniqueusertrigger.js');
var storedProcedures = require('../storedprocedures/grouplinksupdatestoredprocedure.js');
var util = require('util');
var constants = require('../../common/constants.json');
var Q = require('q');

var client = new DocumentClient(config.documentdbEndpoint, { "masterKey": config.documentdbAuthKey });
var helpers = require('../../common/helpers.js');
var databaseId = config.documentdbDatabaseName;

var querySpec = {
    query: 'SELECT * FROM root r WHERE r.id= @id',
    parameters: [{
        name: '@id',
        value: databaseId
    }]
};

var database;

client.queryDatabases(querySpec).toArrayAsync()
    .then(function(databasesFeed){
        var databases = databasesFeed.feed;
        database = databases[0];
        console.log(util.inspect(database));

        var groupLinksQuerySpec = {
            query: 'SELECT * FROM root r WHERE r.id= @id',
            parameters: [{
                name: '@id',
                value: config.groupLinksCollectionName
            }]
        };

        return client.queryCollections(database._self, groupLinksQuerySpec).toArrayAsync();
    })
    .then(function(collectionResponse){
        console.log(util.inspect(collectionResponse));
        var collection = collectionResponse.feed[0];

        if (collection){        
            return client.deleteCollectionAsync(collection._self);
        }
        return Q();
    })
    .then(function(deleteCollectionResponse){
        if (deleteCollectionResponse){
            console.log(util.inspect(deleteCollectionResponse));
        }
        return client.createCollectionAsync(database._self, {id : config.groupLinksCollectionName});
    })
    .then(function(collectionResponse){
        var collection = collectionResponse.resource;
        console.log(collection.id + ' created successfully.');
        console.log('Creating stored procedure' + constants.groupLinksUpdateStoredProcName + ' on collection ' + config.groupLinksCollectionName + '....');
        return client.createStoredProcedureAsync(collection._self, storedProcedures.groupLinksUpdateStoredProc, {});
    })
    .fail(function(err){ 
        console.log(err);
    });

