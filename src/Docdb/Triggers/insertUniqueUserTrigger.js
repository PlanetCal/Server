function insertUniqueUser() {
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
                var error = new Error(err);
                error.code = 503;
                throw err;
            }

            if (documents.length > 0) {
                var error = new Error('User ' + userEmail + ' already exists');
                error.httpStatusCode = 409;
                throw error;
            }
            else {
                request.setBody(userToCreate);
            }
        });
    if (!accepted) {
        var error = new Error('Unable to complete user query.');
        error.http = 503;
        throw error;
    }
}
