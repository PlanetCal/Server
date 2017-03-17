'use strict'

var DocumentClient = require('documentdb').DocumentClient;
var config = require('../../common/config.js');
var triggers = require('../triggers/insertuniqueusertrigger.js');

var client = new DocumentClient(config.documentdbEndpoint, { "masterKey": config.documentdbAuthKey });
var Helpers = require('../../common/helpers.js').Helpers;
var helpers = new Helpers();

var dbDefinition = {id : config.documentdbDatabaseName};

client.createDatabase(dbDefinition, function (err, createdDatabase) {
    if (err) {
        throw helpers.convertErrorToJson(helpers.createErrorFromDocumentDbError(err), true);
    }

    console.log('Creating database ' + config.documentdbDatabaseName + '....');
    client.readDatabase('dbs/' + config.documentdbDatabaseName, function (err, db) {
        if (err) {
            throw helpers.convertErrorToJson(helpers.createErrorFromDocumentDbError(err), true);
        }

        console.log(config.documentdbDatabaseName + ' created successfully.');

        var dbLink = db._self;

        console.log('Creating collection ' + config.usersCollectionName + '....');
        createPlanetcalCollection(dbLink, config.usersCollectionName, function(err, collection){
            if (err) {
                throw helpers.convertErrorToJson(helpers.createErrorFromDocumentDbError(err), true);
            }            
            console.log(config.usersCollectionName + ' created successfully.');

            var usersCollectionLink = 'dbs/' + config.documentdbDatabaseName + '/colls/' + config.usersCollectionName;
            console.log('Creating trigger insertUniqueUserTrigger on collection ' + config.usersCollectionName + '....');
            
            client.createTrigger(usersCollectionLink, triggers.insertUniqueUserTrigger, {}, function(err, trigger){
                console.log('Trigger insertUniqueUserTrigger on collection ' + config.usersCollectionName + 'created successfully.');
    
                console.log('Creating collection ' + config.userDetailsCollectionName + '....');
                createPlanetcalCollection(dbLink, config.userDetailsCollectionName, function(err, collection){
                    if (err) {
                        throw helpers.convertErrorToJson(helpers.createErrorFromDocumentDbError(err), true);
                    }
                    console.log(config.userDetailsCollectionName + ' created successfully.');

                    console.log('Creating collection ' + config.eventsCollectionName + '....');
                    createPlanetcalCollection(dbLink, config.eventsCollectionName, function(err, collection){
                        if (err) {
                            throw helpers.convertErrorToJson(helpers.createErrorFromDocumentDbError(err), true);
                        }
                        console.log(config.eventsCollectionName + ' created successfully.');

                        console.log('Creating collection ' + config.groupsCollectionName + '....');
                        createPlanetcalCollection(dbLink, config.groupsCollectionName, function(err, collection){
                            if (err) {
                                throw helpers.convertErrorToJson(helpers.createErrorFromDocumentDbError(err), true);
                            } 
                            console.log(config.groupsCollectionName + ' created successfully.');
                        });
                    });
                });
            });
        });
    });
});

function createPlanetcalCollection(databaseLink, collectionId, callback){
    var collSpec = { id: collectionId };

    var options = { offerType: "S1" };

    client.createCollection(databaseLink, collSpec, options, callback);
}

function createCollectionCallback(err, collection, continueCallback){
    if (err){
        throw helpers.convertErrorToJson(err, true);
    }

    continueCallback(collection);
}