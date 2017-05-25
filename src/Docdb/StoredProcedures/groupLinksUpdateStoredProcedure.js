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

            if (groupLinkDescriptor.groupId === emptyGuid){
                throw new Error('Group of empty guid is special and that should not be altered.');
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
                "descendant" : "descendant",
                "self" : "self"
            }

            // step 1: check if newParentGroupId exists in tree
            checkNodeExistence(newParentGroupId, function(){
                // step 2: Check circular dependencies
                checkCircularDependencies(groupId, newParentGroupId, function(){
                    // step 3: make sure that group's self-link (ancestor = groupid, descendant = groupId, distance = 0)
                    // exists
                    ensureSelf(groupId, function(result){
                        // step 4: delete group links from old ancestors
                        deleteGroupLinks(groupId, function(ancestorsLinksForDeletion, descendantsLinksForDeletion, linksDeleted){
                            // step 5: add group links to new ancestors
                            addGroupLinks(groupId, newParentGroupId, function(ancestorsLinksForAddition, descendantsLinksForAddition, linksAdded){
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

            function getGroupLinks(groupId, groupLinkType, includeSelf, onLinkFeed, onComplete, continuation){
                if (typeof(groupId) !== 'string'){
                    throw new Error('groupId is not a string.');
                }

                if (typeof(groupLinkType) !== 'string'){
                    throw new Error('groupLinkType is not a string.');
                }

                if (typeof(includeSelf) !== 'boolean'){
                    throw new Error('includeSelf is not a boolean.');
                }

                if (typeof(onLinkFeed) !== 'function'){
                    throw new Error('onLinkFeed is not a function.');
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
                            switch(groupLinkType){
                                case linkType.ancestor:
                                    return includeSelf 
                                        ? link.descendant === groupId
                                        : link.descendant === groupId && link.ancestor !== groupId;
                                case linkType.descendant:
                                    return includeSelf 
                                        ? link.ancestor === groupId
                                        : link.ancestor === groupId && link.descendant !== groupId;
                                default:
                                    return link.ancestor === groupId && link.descendant === groupId;
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
                        function(err, linkFeed, options){
                            if (err){
                                throw err;
                            }

                            if (linkFeed && linkFeed.length > 0){
                                onLinkFeed(linkFeed);
                            }
                            
                            if (options.continuation){
                                getGroupLinks(groupId, groupLinkType, includeSelf, onLinkFeed, onComplete, options.continuation);
                            }
                            else if (onComplete){
                                onComplete();
                            }
                        });

                if (!result.isAccepted){
                    throw new Error('filter call in getGroupLinks is not accepted. groupId: ' + groupId + 
                        'groupLinkType: ' + groupLinkType);
                }
            }

            function getAncestorsLinks(groupId, includeSelf, onComplete){
                if (typeof(groupId) !== 'string'){
                    throw new Error('groupId is not a string.');
                }
                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }
                var resultList = [];

                getGroupLinks(
                    groupId, 
                    linkType.ancestor, 
                    includeSelf, 
                    function(ancestorsLinks){
                        resultList = resultList.concat(ancestorsLinks);
                    }, 
                    function(){ 
                        onComplete(resultList)
                    });
            }

            function getDescendantsLinks(groupId, onComplete){
                if (typeof(groupId) !== 'string'){
                    throw new Error('groupId is not a string.');
                }
                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }
                var resultList = [];

                getGroupLinks(groupId, 
                    linkType.descendant, 
                    true, 
                    function(descendantsLinks){
                        resultList = resultList.concat(descendantsLinks);
                    },
                    function(){ 
                        onComplete(resultList);
                    });
            }

            function getGroupLinkToSelf(groupId, onComplete){
                if (typeof(groupId) !== 'string'){
                    throw new Error('groupId is not a string.');
                }
                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }

                var resultList = [];

                getGroupLinks(groupId, 
                    linkType.self, 
                    true, 
                    function(selfLinks){
                        resultList = resultList.concat(selfLinks);
                    }, 
                    function(){ 
                        onComplete(resultList)
                    });
            }

            function deleteGroupLinks(childRootGroupId, onComplete){
                if (typeof(childRootGroupId) !== 'string'){
                    throw new Error('childRootGroupId is not a string.');
                }
                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }

                // get all ancestors of currnet node and all descndants of current node
                // generate combination of links to be deleted
                getAncestorsLinks(childRootGroupId, false, function(ancestorsLinks){
                    getDescendantsLinks(childRootGroupId, function(descendantsLinks){
                        var links = [];
                        for (var i in ancestorsLinks){
                            for (var j in descendantsLinks){
                                links.push({
                                    ancestor : ancestorsLinks[i].ancestor,
                                    descendant : descendantsLinks[j].descendant
                                });
                            }
                        }
                        var cachedLinks = links.slice();
                        deleteGroupLinksFromOldAncestors(links, function(){
                            onComplete(ancestorsLinks, descendantsLinks, cachedLinks);
                        });
                    });
                });
            }

            function deleteGroupLinksFromOldAncestors(links, onComplete, continuation){
                if (!Array.isArray(links)){
                    throw new Error('links  is not an array.');
                }
                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }

                if (links && links.length > 0)
                {
                    var result = __.filter(function(link){
                            return link.ancestor === links[0].ancestor && link.descendant === links[0].descendant;
                        },
                        {continuation : continuation},
                        function(err, linkFeed, options){
                            if (!linkFeed || linkFeed.length <= 0){
                                if (options.continuation){
                                    // can't find the entry, continue searching for it
                                    deleteGroupLinksFromOldAncestors(links, onComplete, options.continuation);
                                }
                                else{
                                    throw new Error('Cannot find ancestor: ' + links[0].ancestor + ' descendant: ' + links[0].descendant);
                                }
                            }
                            else{
                                // found the entity (and there should only be one)
                                // delete that link
                                var isAccepted = __.deleteDocument(linkFeed[0]._self, {}, 
                                    function (err, responseOptions) {
                                        if (err){
                                            throw err;
                                        } 
                                        // remove the first element, and recursively calling
                                        // this function 
                                        links.shift();
                                        deleteGroupLinksFromOldAncestors(links, onComplete);
                                    });

                                if (!isAccepted){
                                    throw new Error('deleteDocument call in deleteGroupLinksFromOldAncestors is not accepted.');
                                }
                            }
                        });

                    if (!result.isAccepted){
                        throw new Error('filter call is not accepted in deleteGroupLinksFromOldAncestors');
                    }
                }
                else{
                    onComplete();
                }
            }


            function addGroupLinks(childRootGroupId, newParentGroupId, onComplete){
                if (typeof(childRootGroupId) !== 'string'){
                    throw new Error('childRootGroupId is not a string.');
                }
                if (typeof(newParentGroupId) !== 'string'){
                    throw new Error('newParentGroupId is not a string.');
                }
                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }

                getAncestorsLinks(newParentGroupId, true, function(ancestorsLinks){
                    getDescendantsLinks(childRootGroupId, function(descendantsLinks){
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
                        addGroupLinksToNewAncestors(links, function(){
                            onComplete(ancestorsLinks, descendantsLinks, cachedLinks);
                        });
                    });
                });
            }

            function addGroupLinksToNewAncestors(links, onComplete){
                if (!Array.isArray(links)){
                    throw new Error('links is not an array.');
                }
                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }

                if (links && links.length > 0){
                    var isAccepted = __.createDocument(__.getSelfLink(), links[0],
                        function(err){
                            if (err){
                                throw err;
                            }

                            links.shift();

                            addGroupLinksToNewAncestors(links, onComplete);
                        });
                    if (!isAccepted){
                        throw new Error('createDocument call in addGroupLinksToNewAncestors is not accepted.');
                    }
                }
                else{
                    onComplete();
                }
            }

            function ensureSelf(groupId, onComplete){
                if (typeof(groupId) !== 'string'){
                    throw new Error('groupId is not a string.');
                }

                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }

                getGroupLinkToSelf(groupId, function(selfLinks){
                    if (!selfLinks || selfLinks.length <= 0){
                        var isAccepted = __.createDocument(__.getSelfLink(),
                            {
                                "ancestor" : groupId,
                                "descendant" : groupId,
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

            function checkCircularDependencies(groupId, newParentGroupId, onComplete){
                if (typeof(groupId) !== 'string'){
                    throw new Error('groupId is not a string.');
                }
                if (typeof(newParentGroupId) !== 'string'){
                    throw new Error('newParentGroupId is not a string.');
                }
                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }
                getDescendantsLinks(groupId, function(descendantsLinks){
                    var result = true;
                    for (var i in descendantsLinks){
                        if (descendantsLinks.descendant === newParentGroupId){
                            throw new Error(newParentGroupId + ' is found in desendants of ' + groupId);
                        }
                    }
                    onComplete();
                });
            }

            function checkNodeExistence(groupId, onComplete){
                if (typeof(groupId) !== 'string'){
                    throw new Error('groupId is not a string.');
                }
                if (typeof(onComplete) !== 'function'){
                    throw new Error('onComplete is not a function.');
                }
                getGroupLinkToSelf(groupId, function(selfLinks){
                    if (!selfLinks || selfLinks.length <= 0){
                        throw new Error(groupId + ' is not found.');
                    }
                    onComplete();
                });
            }
        }
    }
}
