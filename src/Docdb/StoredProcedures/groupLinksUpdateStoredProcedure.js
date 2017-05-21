'use strict'

var constants = require('../../common/constants.json');

module.exports = {
    'groupLinksUpdateStoredProc': {
        id : constants.groupLinksUpdateStoredProcName,
        /*
        @groupLinkDescriptor: Contains groupId field and parentGroupId field. parentGroupId can 
        be undefined. (see code on handling)
        */
        serverScript : function groupLinksUpdateStoredProc(groupLinkDescriptor) {
            
            var emptyGuid = "00000000-0000-0000-0000-000000000000";

            if (!groupLinkDescriptor.groupId){
                throw new Error('groupId not found.');
            }

            var newParentGroupId = groupLinkDescriptor.parentGroupId;
            if (!newParentGroupId){
                newParentGroupId = emptyGuid;
            }

            ensureSelf(groupLinkDescriptor.groupId);
            /*
            var linkType = {
                "ancestor" : "ancestor",
                "descendant" : "descendant"
            };

            var context = getContext();
            var response = context.getResponse();
            var collection = context.getCollection();

            var groupId = groupLinkDescriptor.groupId;
            var newParentGroupId = groupLinkDescriptor.newParentGroupId;

            // Step 1: retriee all descendants of groupId
            var allDescendantDescriptors = getGroupLinks(groupId, linkType.descendant, true);

            // Step 2: Check circular dependency given newParentGroupId and all descendants
            checkCircularDependencies(newParentGroupId, allDescendantDescriptors);

            // Step 3: retrieve all ancestors of groupId
            var allOldAncestorDescriptors = getGroupLinks(groupId, linkType.ancestor, false);

            // Step 4: For each of nodes in groupId subtree, remove all old links from old ancestors
            deleteGroupLinks(allOldAncestorDescriptors, allDescendantDescriptors);

            // Step 5: retrieve all ancestors of new parent - since every ancestor in the new 
            // tree has to have a link to newly parented nodes.
            var allNewAncestorDescriptors = getGroupLinks(newParentGroupId, linkType.ancestor, false);

            // Step 6: For each of new ancestors, add a link for each of nodes in groupId subtree 
            */
            function getGroupLinks(groupId, groupLinkType, includeSelf){
                var query;

                if (groupLinkType === linkType.ancestor){
                    query = 'SELECT g.descendant, g.distance FROM root g WHERE g.ancestor = "' + groupId + '"';
                    if (includeSelf !== true){
                        query += " AND g.descendant != '" + groupId + "'";
                    }
                }
                else{
                    query = 'SELECT g.ancestor, g.distance FROM root g WHERE g.descendant = "' + groupId + '"';
                    if (includeSelf !== true){
                        query += " AND g.ancestor != '" + groupId + "'";
                    }                
                }

                var accept = collection.queryDocuments(collection.getSelfLink(), query, {},
                    function (err, documents, responseOptions) {
                        if (err){
                            throw err;  
                        }

                        return documents;
                    });

                if (!accept){
                    throw new Error("Query '" + query + "'' not accepted.");
                }
            }

            function ensureSelf(groupId){
                var results = __.filter(function(doc) {
                    return doc.ancestor === groupId && doc.descendant == groupId;
                });

                if (result.length > 0){
                    var response = context.getresponse();

                    response.setBody(results);
                }
                else{
                    response.setBody([]);
                }
            }

            function deleteGroupLinks(ancestors, descendants){
                var links = [];
                for (var i in descendants){
                    for (var j in ancestors){
                        var query = "SELECT g._self FROM root g WHERE g.ancestor = ancestors[j] AND g.descendant = descendants[i]";

                        bulkDelete(query);
                    }
                }
            }

            function bulkDelete(query){
                if (!query){
                    throw new Error("Query doesn't exist.");
                }

                var response = getContext().getResponse();
                var responseBody = {
                    deleted: 0,
                    continuation: true
                };

                queryAndDeleteRecursive(true);

                function queryAndDeleteRecursive(continuation){

                    var requestOptions = {continuation : continuation};

                    var isAccepted = collection.queryDocuments(collectionLink, query, requestOptions,
                        function (err, documents, responseOptions) {
                            if (err) {
                                throw err;
                            }

                            if (documents.length > 0) {
                                // Begin deleting documents as soon as documents are returned form the query results.
                                // deleteRecursive() resumes querying after deleting; no need to page through continuation tokens.
                                //  - this is to prioritize writes over reads given timeout constraints.
                                deleteRecursive(documents);
                            } else if (responseOptions.continuation) {
                                // Else if the query came back empty, but with a continuation token; repeat the query w/ the token.
                                queryAndDeleteRecursive(responseOptions.continuation);
                            } else {
                                // Else if there are no more documents and no continuation token - we are finished deleting documents.
                                responseBody.continuation = false;
                                response.setBody(responseBody);
                            }
                        });

                    // If we hit execution bounds - return continuation: true.
                    if (!isAccepted) {
                        response.setBody(responseBody);
                    }
                }

                function deleteRecursive(documents){
                    if (documents.length > 0) {

                        // Delete the first document in the array.
                        var isAccepted = collection.deleteDocument(documents[0]._self, {}, 
                            function (err, responseOptions) {
                                if (err) {
                                    throw err;
                                }

                                responseBody.deleted++;
                                documents.shift();
                                // Delete the next document in the array.
                                deleteRecursive(documents);
                            });

                        // If we hit execution bounds - return continuation: true.
                        if (!isAccepted) {
                            response.setBody(responseBody);
                        }
                    } 
                    else {
                        // If the document array is empty, query for more documents.
                        queryAndDeleteRecursive();
                    }
                }
            }

            function addGroupLinks(ancestors, subTreeRoot, descendantsDescriptor){

            }

            function checkCircularDependencies(newParentGroupId, descendantDescriptors){
                for (var i in descendantDescriptors){
                    if (descendantDescriptors[i].descendant === newParentGroupId){
                        throw "Circular dependency detected.";
                    }
                }
            }
        }
    }
}
