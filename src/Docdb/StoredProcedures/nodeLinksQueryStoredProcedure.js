'use strict'

var constants = require('../common/constants.json');

module.exports = {
    'nodeLinksQueryStoredProc': {
        id: constants.nodeLinksQueryStoredProcName,
        /*
        @nodeId (string): node Guid used in query
        @queryType (string): search for ancestor or descendant. The value should either be ancestor or descendant
        @distance (integer): distance from nodeId to target nodes.
        @continuation (string): continution token
        */
        serverScript: function nodeLinksQueryStoredProc(nodeId, queryType, distance, continuation) {

            var context = getContext();
            var response = context.getResponse();

            var nodeQueryType = {
                "ancestor": "ancestor",
                "descendant": "descendant"
            }

            if (typeof (nodeId) !== 'string') {
                throw new Error('nodeId should be a string.');
            }

            if (typeof (queryType) !== 'string'
                || (queryType !== nodeQueryType.ancestor && queryType !== nodeQueryType.descendant)) {
                throw new Error('nodeQueryType should be a string with value either ancestor or descendant.');
            }

            if (typeof (distance) !== 'number') {
                throw new Error('distance should be a number.');
            }

            var result = __.chain()
                .filter(function (link) {
                    var linkNode = queryType === nodeQueryType.ancestor ? link.descendant : link.ancestor;
                    return linkNode === nodeId && link.distance === distance;
                })
                .map(function (link) {
                    return {
                        ancestor: link.ancestor,
                        descendant: link.descendant,
                        distance: link.distance
                    };
                }).
                value({ continuation: continuation },
                function (err, nodeLinkFeed, options) {
                    if (err) {
                        throw err;
                    }

                    if (nodeLinkFeed && nodeLinkFeed.length > 0) {
                        response.setBody({
                            continuation: continuation,
                            links: nodeLinkFeed
                        });
                    }
                });

            if (!result.isAccepted) {
                throw new Error('filter call in getNodeLinks is not accepted. nodeId: ' + nodeId +
                    'nodeLinkType: ' + nodeLinkType);
            }
        }
    }
}

