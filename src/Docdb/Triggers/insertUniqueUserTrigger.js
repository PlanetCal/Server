'use strict'

var config = require('../../common/config.json')['development'];

module.exports = {
    'insertUniqueUserTrigger': {
        id: config.insertUniqueUserTriggerName,
        serverScript: function insertUniqueUser() {
            var context = getContext();
            var request = context.getRequest();

            var userToCreate = request.getBody();

            var collection = context.getCollection();
            var collectionLink = collection.getSelfLink();
            var userEmail = userToCreate["email"];

            var accepted = collection.queryDocuments(collectionLink,
                'SELECT * FROM p where p.email = "' + userEmail + '"',
                function (err, documents, responseOptions) {
                    if (err) {
                        throw new Error(err);
                    }

                    if (documents.length > 0) {
                        throw new Error('User ' + userEmail + ' already exists');
                    }
                    else {
                        request.setBody(userToCreate);
                    }
                });
            if (!accepted) {
                throw new Error('Unable to complete user query.');
            }
        },
        triggerType: "pre",
        triggerOperation : "create"
    }
}
