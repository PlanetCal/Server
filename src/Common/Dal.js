'use strict'

var DocumentClient = require('documentdb-q-promises').DocumentClientWrapper;
var DatabaseException = require('./error.js').DatabaseException;

module.exports = {

    DataAccessLayer: function DataAccessLayer(databaseName, collectionName, documentdbEndpoint, documentdbAuthKey) {
        this.databaseName = databaseName;
        this.collectionName = collectionName;
        this.documentdbEndpoint = documentdbEndpoint;
        this.documentdbAuthKey = documentdbAuthKey;

        var collectionLink = 'dbs/' + databaseName + '/colls/' + collectionName;

        this.insertAsync = function insertAsync(obj, options, errorHandler) {
            var client = this.getClient();

            if (typeof(options) === 'function' && typeof(errorHandler) === 'undefined'){
                errorHandler = options;
                options = {};
            }
            else if (typeof(options) === 'undefined'){
            	options = {};
            }

            return client.createDocumentAsync(collectionLink, obj, options).fail(function(err){
                if (typeof(errorHandler) === 'function'){
                    errorHandler(err);
                }
                else{
                    throw new DatabaseException(err);
                }
            });
        }

        this.getAsync = function getAsync(querySpec, options) {
            var client = this.getClient();
            if (typeof(options) === 'undefined'){
            	options = {};
            }
            return client.queryDocuments(collectionLink, querySpec, options).toArrayAsync().fail(function(err){
                throw new DatabaseException(err);
            });
        }

        this.getAsync = function getAsync(querySpec, options) {
            var client = this.getClient();
            if (typeof(options) === 'undefined'){
                options = {};
            }
            return client.queryDocuments(collectionLink, querySpec, options).toArrayAsync().fail(function(err){
                throw new DatabaseException(err);
            });
        }

        this.updateAsync = function updateAsync(id, document, options) {
            // this assumes that all objects have id property
            var client = this.getClient();
            var documentLink = collectionLink + '/docs/' + id;
            if (typeof(options) === 'undefined'){
            	options = {};
            }
            return client.replaceDocumentAsync(documentLink, document).fail(function(err){
                throw new DatabaseException(err);
            });
        }

        // delete is a reserved keyword
        this.removeAsync = function removeAsync(id, options) {
            // this assumes that all objects have id property
            var client = this.getClient();
            var documentLink = collectionLink + '/docs/' + id;
            if (typeof(options) === 'undefined'){
            	options = {};
            }
            return client.deleteDocumentAsync(documentLink, options).fail(function(err){
                throw new DatabaseException(err);
            });
        }

        this.executeStoredProcedureAsync = function executeStoredProcedureAsync(storedProcedureName, params, options){
            var client = this.getClient();

            var storedProcedureLink = collectionLink + '/sprocs/' + storedProcedureName;
            if (typeof(options) === 'undefined'){
                options = {};
            }
            return client.executeStoredProcedureAsync(link, params, options).fail(function(err){
                throw new DatabaseException(err);
            });
        }

        this.getClient = function getClient() {
            return new DocumentClient(this.documentdbEndpoint, { "masterKey": this.documentdbAuthKey });
        }
    }
}