'use strict'

var constants = require('../../common/constants.json');

module.exports = {
    'nodeLinksUpdateStoredProc': {
        id : constants.nodeLinksUpdateStoredProcName,
        /*
        @nodeLinkDescriptor: Contains nodeId field and parentNodeId field. parentNodeId can 
        be undefined. (see code on handling)
        */
        serverScript : function nodeLinksUpdateStoredProc(nodeLinkDescriptor) {
            
            var emptyGuid = "00000000-0000-0000-0000-000000000000";

            if (!nodeLinkDescriptor.nodeId){
                throw new Error('nodeId not found.');
            }

            if (nodeLinkDescriptor.nodeId === emptyGuid){
                throw new Error('Node of empty guid is special and that should not be altered.');
            }

            var nodeId = nodeLinkDescriptor.nodeId;

            var newParentNodeId = nodeLinkDescriptor.parentNodeId;
            if (!newParentNodeId){
                newParentNodeId = emptyGuid;
            }

            var context = getContext();
            var response = context.getResponse();

            var linkType = {
                "ancestor" : "ancestor",
                "descendant" : "descendant",
                "self" : "self"
            }

            // step 1: check if newParentNodeId exists in tree
            checkNodeExistence(newParentNodeId, function(){
                // step 2: Check circular dependencies
                checkCircularDependencies(nodeId, newParentNodeId, function(){
                    // step 3: make sure that node's self-link (ancestor = nodeId, descendant = nodeId, distance = 0)
                    // exists
                    ensureSelf(nodeId, function(result){
                        // step 4: delete node links from old ancestors
                        deleteNodeLinks(nodeId, function(ancestorsLinksForDeletion, descendantsLinksForDeletion, linksDeleted){
                            // step 5: add node links to new ancestors
                            addNodeLinks(nodeId, newParentNodeId, function(ancestorsLinksForAddition, descendantsLinksForAddition, linksAdded){
                                response.setBody({
                                    "linkToSelfAdded" : result.newEntity,
                                    "deletedLinksResult" : {
                                        linksDeleted,
                                        ancestorsLinksForDeletion,
                                        descendantsLinksForDeletion
                                    },
                                    "addedLinksResult" : {
                                        linksAdded,
                                        ancestorsLinksForAddition,
                                        descendantsLinksForAddition
                                    }
                                });
                            });
                        })
                    });
                });
            });

            function getNodeLinks(nodeId, nodeLinkType, includeSelf, onNodeLinkFeed, onComplete, continuation){
                if (typeof(nodeId) !== 'string'){
                    throw new Error('nodeId is not a string.');
                }

                if (typeof(nodeLinkType) !== 'string'){
                    throw new Error('nodeLinkType is not a string.');
                }

                if (typeof(includeSelf) !== 'boolean'){
                    throw new Error('includeSelf is not a boolean.');
                }

                if (typeof(onNodeLinkFeed) !== 'function'){
                    throw new Error('onNodeLinkFeed is not a function.');
                }

                if (typeof(onComplete) === 'string'){
                    continuation = onComplete;
                    onComplete = undefined;
                }
                else if (typeof(onComplete) !== 'undefined' && typeof(onComplete) !== 'function' && typeof(continuation) !== 'string'){
                    throw new Error('onComplete is either undefined or a function.');                    
                }

                var result = __.chain()
                    .filter(
                        function(link){
                            switch(nodeLinkType){
                                case linkType.ancestor:
                                    return includeSelf 
                                        ? link.descendant === nodeId
                                        : link.descendant === nodeId && link.ancestor !== nodeId;
                                case linkType.descendant:
                                    return includeSelf 
                                        ? link.ancestor === nodeId
                                        : link.ancestor === nodeId && link.descendant !== nodeId;
                                default:
                                    return link.ancestor === nodeId && link.descendant === nodeId;
                            }
                        })
                    .map(function(link){
                        return {
                            ancestor : link.ancestor,
                            descendant : link.descendant,
                            distance : link.distance
                        };
                    }).
                    value({continuation : continuation},
                        function(err, nodeLinkFeed, options){
                            if (err){
                                throw err;
                            }

                            if (nodeLinkFeed && nodeLinkFeed.length > 0){
                                onNodeLinkFeed(nodeLinkFeed);
                            }
                            
                            if (options.continuation){
                                getNodeLinks(nodeId, nodeLinkType, includeSelf, onNodeLinkFeed, onComplete, options.continuation);
                            }
                            else if (onComplete){
                                onComplete();
                            }
                        });

                if (!result.isAccepted){
                    throw new Error('filter call in getNodeLinks is not accepted. nodeId: ' + nodeId + 
                        'nodeLinkType: ' + nodeLinkType);
                }
            }

            function getAncestorsLinks(nodeId, includeSelf, onComplete){
                if (typeof(nodeId) !== 'string'){
                    throw new Error('nodeId is not a string.');
                }
                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }
                var resultList = [];

                getNodeLinks(
                    nodeId, 
                    linkType.ancestor, 
                    includeSelf, 
                    function(ancestorsLinks){
                        resultList = resultList.concat(ancestorsLinks);
                    }, 
                    function(){ 
                        onComplete(resultList)
                    });
            }

            function getDescendantsLinks(nodeId, onComplete){
                if (typeof(nodeId) !== 'string'){
                    throw new Error('nodeId is not a string.');
                }
                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }
                var resultList = [];

                getNodeLinks(nodeId, 
                    linkType.descendant, 
                    true, 
                    function(descendantsLinks){
                        resultList = resultList.concat(descendantsLinks);
                    },
                    function(){ 
                        onComplete(resultList);
                    });
            }

            function getNodeLinkToSelf(nodeId, onComplete){
                if (typeof(nodeId) !== 'string'){
                    throw new Error('nodeId is not a string.');
                }
                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }

                var resultList = [];

                getNodeLinks(nodeId, 
                    linkType.self, 
                    true, 
                    function(selfLinks){
                        resultList = resultList.concat(selfLinks);
                    }, 
                    function(){ 
                        onComplete(resultList)
                    });
            }

            function deleteNodeLinks(nodeId, onComplete){
                if (typeof(nodeId) !== 'string'){
                    throw new Error('nodeId is not a string.');
                }
                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }

                // get all ancestors of currnet node and all descndants of current node
                // generate combination of links to be deleted
                getAncestorsLinks(nodeId, false, function(ancestorsLinks){
                    getDescendantsLinks(nodeId, function(descendantsLinks){
                        var nodeLinks = [];
                        for (var i in ancestorsLinks){
                            for (var j in descendantsLinks){
                                nodeLinks.push({
                                    ancestor : ancestorsLinks[i].ancestor,
                                    descendant : descendantsLinks[j].descendant
                                });
                            }
                        }
                        var cachedNodeLinks = nodeLinks.slice();
                        deleteNodeLinksFromOldAncestors(nodeLinks, function(){
                            onComplete(ancestorsLinks, descendantsLinks, cachedNodeLinks);
                        });
                    });
                });
            }

            function deleteNodeLinksFromOldAncestors(nodeLinks, onComplete, continuation){
                if (!Array.isArray(nodeLinks)){
                    throw new Error('nodeLinks is not an array.');
                }
                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }

                if (nodeLinks && nodeLinks.length > 0)
                {
                    var result = __.filter(function(link){
                            return link.ancestor === nodeLinks[0].ancestor && link.descendant === nodeLinks[0].descendant;
                        },
                        {continuation : continuation},
                        function(err, nodeLinkFeed, options){
                            if (!nodeLinkFeed || nodeLinkFeed.length <= 0){
                                if (options.continuation){
                                    // can't find the entry, continue searching for it
                                    deleteNodeLinksFromOldAncestors(nodeLinks, onComplete, options.continuation);
                                }
                            }
                            else{
                                // found the entity (and there should only be one)
                                // delete that link
                                var isAccepted = __.deleteDocument(nodeLinkFeed[0]._self, {}, 
                                    function (err, responseOptions) {
                                        if (err){
                                            throw err;
                                        } 
                                        // remove the first element, and recursively calling
                                        // this function 
                                        nodeLinks.shift();
                                        deleteNodeLinksFromOldAncestors(nodeLinks, onComplete);
                                    });

                                if (!isAccepted){
                                    throw new Error('deleteDocument call in deleteNodeLinksFromOldAncestors is not accepted.');
                                }
                            }
                        });

                    if (!result.isAccepted){
                        throw new Error('filter call is not accepted in deleteNodeLinksFromOldAncestors');
                    }
                }
                else{
                    onComplete();
                }
            }


            function addNodeLinks(nodeId, parentNodeId, onComplete){
                if (typeof(nodeId) !== 'string'){
                    throw new Error('nodeId is not a string.');
                }
                if (typeof(parentNodeId) !== 'string'){
                    throw new Error('parentNodeId is not a string.');
                }
                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }

                getAncestorsLinks(parentNodeId, true, function(ancestorsLinks){
                    getDescendantsLinks(nodeId, function(descendantsLinks){
                        var links = [];
                        for (var i in ancestorsLinks){
                            for (var j in descendantsLinks){
                                links.push({
                                    ancestor : ancestorsLinks[i].ancestor,
                                    descendant : descendantsLinks[j].descendant,
                                    distance : ancestorsLinks[i].distance + descendantsLinks[j].distance + 1
                                });
                            }
                        }
                        var cachedLinks = links.slice();
                        addNodeLinksToNewAncestors(links, function(){
                            onComplete(ancestorsLinks, descendantsLinks, cachedLinks);
                        });
                    });
                });
            }

            function addNodeLinksToNewAncestors(nodeLinks, onComplete){
                if (!Array.isArray(nodeLinks)){
                    throw new Error('nodeLinks is not an array.');
                }
                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }

                if (nodeLinks && nodeLinks.length > 0){
                    var isAccepted = __.createDocument(__.getSelfLink(), nodeLinks[0],
                        function(err){
                            if (err){
                                throw err;
                            }

                            nodeLinks.shift();

                            addNodeLinksToNewAncestors(nodeLinks, onComplete);
                        });
                    if (!isAccepted){
                        throw new Error('createDocument call in addNodeLinksToNewAncestors is not accepted.');
                    }
                }
                else{
                    onComplete();
                }
            }

            function ensureSelf(nodeId, onComplete){
                if (typeof(nodeId) !== 'string'){
                    throw new Error('nodeId is not a string.');
                }

                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }

                getNodeLinkToSelf(nodeId, function(selfLinks){
                    if (!selfLinks || selfLinks.length <= 0){
                        var isAccepted = __.createDocument(__.getSelfLink(),
                            {
                                "ancestor" : nodeId,
                                "descendant" : nodeId,
                                "distance" : 0
                            },
                            function(err){
                                if (err){
                                    throw err;
                                }
                                onComplete({newEntity: true});
                            });

                        if (!isAccepted){                                        
                            throw new Error("createDocument call in ensureSelf is not accepted.");
                        }    
                    }
                    else{
                        onComplete({newEntity : false});
                    }
                });
            }

            function checkCircularDependencies(nodeId, newParentNodeId, onComplete){
                if (typeof(nodeId) !== 'string'){
                    throw new Error('nodeId is not a string.');
                }
                if (typeof(newParentNodeId) !== 'string'){
                    throw new Error('newParentNodeId is not a string.');
                }
                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }
                getDescendantsLinks(nodeId, function(descendantsLinks){
                    var result = true;
                    for (var i in descendantsLinks){
                        if (descendantsLinks.descendant === newParentNodeId){
                            throw new Error(newParentNodeId + ' is found in desendants of ' + nodeId);
                        }
                    }
                    onComplete();
                });
            }

            function checkNodeExistence(nodeId, onComplete){
                if (typeof(nodeId) !== 'string'){
                    throw new Error('nodeId is not a string.');
                }
                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }
                getNodeLinkToSelf(nodeId, function(selfLinks){
                    if (!selfLinks || selfLinks.length <= 0){
                        throw new Error(nodeId + ' is not found.');
                    }
                    onComplete();
                });
            }
        }
    }
}
