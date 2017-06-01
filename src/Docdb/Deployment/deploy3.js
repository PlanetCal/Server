'use strict'

var argv = require('minimist')(process.argv.slice(2));
var DocumentClient = require('documentdb-q-promises').DocumentClientWrapper;
var config = require('../../common/config.json')[argv['env'] || 'development'];
var triggers = require('../triggers/insertuniqueusertrigger.js');
var util = require('util');
var constants = require('../../common/constants.json');
var grouplinksdata = require('../testdata/grouplinksdata1.json');
var co = require('co');

var client = new DocumentClient(config.documentdbEndpoint, { "masterKey": config.documentdbAuthKey });
var helpers = require('../../common/helpers.js');
var databaseId = config.documentdbDatabaseName;
var collectionId = config.groupLinksCollectionName;
var emptyGuid = "00000000-0000-0000-0000-000000000000";

var queryDatabaseSpec = {
    query: 'SELECT * FROM root r WHERE r.id= @id',
    parameters: [{
        name: '@id',
        value: databaseId
    }]
};

var queryCollectionsSpec = {
    query: 'SELECT * FROM root r WHERE r.id= @id',
    parameters: [{
        name: '@id',
        value: collectionId
    }]
};

co(function*() {

    var databaseResponse = yield client.queryDatabases(queryDatabaseSpec).toArrayAsync();

    if (!databaseResponse.feed || databaseResponse.feed.length < 1){
        throw new Error('Database ' + config.documentdbDatabaseName + ' not found.');
    }
    var database = databaseResponse.feed[0];

    var collectionResponse = yield client.queryCollections(database._self, queryCollectionsSpec).toArrayAsync();

    if (!collectionResponse.feed || collectionResponse.feed.length < 1){
        throw new Error('Collection ' + config.groupLinksCollectionName + ' not found.');
    }

    var collection = collectionResponse.feed[0];

    for (var i in grouplinksdata){
        var documentResponse = yield client.createDocumentAsync(collection._self, grouplinksdata[i]);
        if (documentResponse.resource){
            var document = documentResponse.resource;
            console.log('Success!');
            console.log(util.inspect(document));
        }
        else{
            console.log('Fail to upload data.');
            console.log(util.inspect(grouplinksdata[i]));
        }
    }
    return collectionResponse;

}).then(undefined, function (err) {
    console.log(err);
});