"use strict"

var documentClient = require('documentdb').DocumentClient;
var endpoint = 'https://planetcal.documents.azure.com:443/';
var authKey = 'UCAhQVjUx8iR4ICIWuF0ElSadxhm1AeIaj62FWRQzkkdYeXaxpaUz8WFFC8jGbdR0P6Jty7ZjGTfRHhC2uoAYQ==';

module.exports = {
    DataAccessLayer: function DataAccessLayer(databaseName, collectionName) {
        this.databaseName = databaseName;
        this.collectionName = collectionName;

        var collectionLink = 'dbs/' + databaseName + '/colls/' + collectionName;

        this.insert = function insert(obj, callback) {
            var client = this.getClient();
            client.createDocument(collectionLink, obj, function (err, document) {
                callback(err, document);
            });
        }

        this.get = function get(querySpec, callback) {
            var client = this.getClient();
            client.queryDocuments(collectionLink,
                querySpec).toArray(
                function (err, results) {
                    callback(err, results);
                }
            );
        }

        this.update = function update(id, obj, callback) {
            // this assumes that all objects have id property
            var client = this.getClient();
            var documentLink = collectionLink + '/docs/' + id;
            client.replaceDocument(documentLink, obj, (err, result) => {
                callback(err, result);
            });
        }

        // delete is a reserved keyword
        this.remove = function remove(objectId, callback) {
            // this assumes that all objects have id property
            var client = this.getClient();
            var documentLink = collectionLink + '/docs/' + objectId;
            client.deleteDocument(documentLink, function (err) {
                callback(err);
            });
        }

        this.getClient = function getClient() {
            return new documentClient(endpoint, { "masterKey": authKey });
        }
    }
}