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

            var groupId = groupLinkDescriptor.groupId;

            var newParentGroupId = groupLinkDescriptor.parentGroupId;
            if (!newParentGroupId){
                newParentGroupId = emptyGuid;
            }

            var context = getContext();
            var response = context.getResponse();
            var collection = context.getCollection();

            var linkType = {
                "ancestor" : "ancestor",
                "descendant" : "descendant"
            }

            // step 1: check if newParentGroupId exists in tree
            //checkNodeExistence(newParentGroupId, function(){
                
                // step 2: make sure that group's self-link (ancestor = groupid, descendant = groupId, distance = 0)
                // exists
                //ensureSelf(groupLinkDescriptor.groupId, function(){
                    var allDescendantDescriptors = getGroupLinks(groupId, linkType.descendant, true, function(allDescendants){
                        response.setBody(allDescendants);
                    });
                //});
            //});


            /*
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
            function getGroupLinks(groupId, groupLinkType, includeSelf, onComplete){

                if (typeof(groupId) !== 'string'){
                    throw new Error('groupId is not a string.');
                }

                if (typeof(groupLinkType) !== 'string'){
                    throw new Error('groupLinkType is not a string.');
                }

                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }
                var accList = [];

                getGroupLinksRecursive(groupId, groupLinkType, includeSelf, accList, onComplete, undefined);
            }

            function getGroupLinksRecursive(groupId, groupLinkType, includeSelf, accList, onComplete, continuation){
                if (typeof(groupId) !== 'string'){
                    throw new Error('groupId is not a string.');
                }

                if (typeof(groupLinkType) !== 'string'){
                    throw new Error('groupLinkType is not a string.');
                }

                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }

                if (!Array.isArray(accList)){
                    throw new Error('accList is not an array.');
                }

                var result = __.filter(
                    function(doc){
                        switch(groupLinkType){
                            case linkType.ancestor:
                                return includeSelf 
                                    ? doc.descendant === groupId
                                    : doc.descendant === groupId && doc.ancestor !== groupId;
                            default:
                                return includeSelf 
                                    ? doc.ancestor === groupId
                                    : doc.ancestor === groupId && doc.descendant !== groupId;
                        }
                    },
                    {continuation : continuation},
                    function(err, feed, options){
                        if (err){
                            throw err;
                        }

                        if (feed && feed.length > 0){
                            for(var i in feed){
                                accList.push(feed[i]);
                            }
                        }

                        if (options.continuation){
                            getGroupLinksRecursive(groupId, groupLinkType, includeSelf, accList, onComplete, options.continuation);
                        }
                        else{
                            onComplete(accList);
                        }
                    });

                if (!result.isAccepted){
                    throw new Error('filter call in getGroupLinksRecursive is not accepted. groupId: ' + groupId + 
                        'groupLinkType: ' + groupLinkType);
                }
            }

            function ensureSelf(groupId, done, continuation){
                if (typeof(groupId) !== 'string'){
                    throw new Error('groupId is not a string.');
                }

                if (typeof(done) !== 'function'){
                    throw new Error('done is not a function.');
                }

                var filterResult = __.filter(
                    function(doc) {
                        return doc.ancestor === groupId && doc.descendant === groupId;
                    },
                    {continuation: continuation}, 
                    function(err, feed, options) {
                        if(err) {
                            throw err;
                        }

                        if (!feed || !feed.length) {
                            if (options.continuation){
                                // if the record doesn't exist
                                // but continuationToken is not null
                                // recursively searching for record
                                ensureSelf(groupId, options.continuation);
                            }
                            else{
                                // otherwise, we are done searching
                                // create if the record is not found.
                                var isAccepted = __.createDocument(__.getSelfLink(),
                                {
                                    "ancestor" : groupId,
                                    "descendant" : groupId,
                                    "distance" : "0"
                                },
                                function(err){
                                    if (err){
                                        throw err;
                                    }
                                    done();
                                });

                                if (!isAccepted){                                        
                                    throw new Error("createDocument call in ensureSelf is not accepted.");
                                }    
                            }                                
                        }
                        else{
                            done();
                        }
                    })

                if (!filterResult.isAccepted){
                    throw new Error('filter call in ensureSelf is not accepted.');
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

            function checkCircularDependencies(newParentGroupId, groupId, continutation){
                var result = __.filter(
                    function(doc){
                        return doc.ancestor === groupId; // include groupId self-link (i.e. ancestor = descendant = groupId, distance = 0) 
                    },
                    {continuation : continuation},
                    function(err, feed, options){
                        if (err){
                            throw err;
                        }

                        if (options.continuation){
                            if (feed && feed.length > 0){

                            }
                        }
                    });

                for (var i in descendantDescriptors){
                    if (descendantDescriptors[i].descendant === newParentGroupId){
                        throw "Circular dependency detected.";
                    }
                }
            }

            function checkNodeExistence(groupId, done, continuation){
                var result = __.filter(
                    function(doc){
                        return doc.ancestor === groupId && doc.descendant === groupId;
                    },
                    {continuation : continuation},
                    function(err, feed, options){
                        if (!feed || !feed.length){
                            if (options.continuation){
                                checkNodeExistence(groupId, done, options.continuation);
                            }

                            throw new Error('groupId ' + groupId + ' does not exist in db.');
                        }
                        else{
                            done();
                        }
                    });

                if (!result.isAccepted){
                    throw new Error('filter call is not accepted in checkNodExistence');
                }
            }
        }
    }
}
