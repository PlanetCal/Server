'use strict'

var DocumentClient = require('documentdb-q-promises').DocumentClientWrapper;
var config = require('./config.js');

module.exports = {
    DataAccessLayer: function DataAccessLayer(databaseName, collectionName) {
        this.databaseName = databaseName;
        this.collectionName = collectionName;

        var collectionLink = 'dbs/' + databaseName + '/colls/' + collectionName;

        this.insertAsync = function insertAsync(obj, options) {
            var client = this.getClient();
            if (typeof(options) === 'undefined'){
            	options = {};
            }
            return client.createDocumentAsync(collectionLink, obj, options);
        }

        this.getAsync = function getAsync(querySpec, options) {
            var client = this.getClient();
            if (typeof(options) === 'undefined'){
            	options = {};
            }
            return client.queryDocuments(collectionLink, querySpec, options).toArrayAsync();
        }

        this.updateAsync = function updateAsync(id, document, options) {
            // this assumes that all objects have id property
            var client = this.getClient();
            var documentLink = collectionLink + '/docs/' + id;
            if (typeof(options) === 'undefined'){
            	options = {};
            }
            return client.replaceDocumentAsync(documentLink, document);
        }

        // delete is a reserved keyword
        this.removeAsync = function removeAsync(id, options) {
            // this assumes that all objects have id property
            var client = this.getClient();
            var documentLink = collectionLink + '/docs/' + id;
            if (typeof(options) === 'undefined'){
            	options = {};
            }
            return client.deleteDocumentAsync(documentLink, options);
        }

        this.getClient = function getClient() {
            return new DocumentClient(config.documentdbEndpoint, { "masterKey": config.documentdbAuthKey });
        }
    }
}