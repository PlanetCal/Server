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
var emptyGuid = "00000000-0000-0000-0000-000000000000";

var querySpec = {
    query: 'SELECT * FROM root r WHERE r.id= @id',
    parameters: [{
        name: '@id',
        value: databaseId
    }]
};

var database;
var collection;

client.queryDatabases(querySpec).toArrayAsync()
    .then(function(databasesFeed){
        var databases = databasesFeed.feed;
        database = databases[0];

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
        collection = collectionResponse.feed[0];

        if (collection){        
            console.log('About to delete ' + collection.id + '...');
            return client.deleteCollectionAsync(collection._self);
        }
        
        console.log('grouplinksCollection not found.');
        return Q();
    })
    .then(function(deleteCollectionResponse){
        console.log('grouplinksCollection deleted.');
        console.log('About to create grouplinksCollection...');
        return client.createCollectionAsync(database._self, {id : config.groupLinksCollectionName});
    })
    .then(function(collectionResponse){
        collection = collectionResponse.resource;
        console.log(collection.id + ' created successfully.');
        console.log('Creating stored procedure' + constants.groupLinksUpdateStoredProcName + ' on collection ' + config.groupLinksCollectionName + '....');
        return client.createStoredProcedureAsync(collection._self, storedProcedures.groupLinksUpdateStoredProc, {});
    })
    .then(function(storedProcedureResponse){
        console.log(storedProcedureResponse.resource.id + ' created successfully.');
        return client.createDocumentAsync(collection._self, 
            {
                ancestor : emptyGuid,
                descendant : emptyGuid, 
                distance : 0
            });
    })
    .fail(function(err){ 
        console.log(err);
    });

