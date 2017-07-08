'use strict'

module.exports = function (config, logger) {
    var router = require('express').Router();
    var request = require('request-promise');
    var azure = require('azure-storage');
    var cors = require('cors');
    var etag = require('etag');
    var multiparty = require('multiparty');

    var serviceNames = require('../../common/constants.json')['serviceNames'];
    var urlNames = require('../../common/constants.json')['urlNames'];
    var helpers = require('../../common/helpers.js');

    var blobStorage = config.blobStorage;
    var blobStorageAccessKey = config.blobStorageAccessKey;
    var blobContainer = config.blobContainer;

    var corsOptions = {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['Version'],
        optionsSuccessStatus: 200,
        preflightContinue: true,
        credentials: true
    };

    // router.post('/', cors(corsOptions), upload.single('blobdata'), helpers.wrap(function* (req, res) {
    //     // req.file is the `avatar` file
    //     // req.body will hold the text fields, if there were any
    //     logger.get().debug({ req: req }, 'Uploading the blob.');
    //     helpers.uploadBlob(blobStorage, blobContainer, blobStorageAccessKey, req.file);
    //     res.status(201).json({ id: "hi how are you" });
    // }));

    router.post('/', cors(corsOptions), helpers.wrap(function* (req, res) {
        var blobService = azure.createBlobService(blobStorage, blobStorageAccessKey);
        blobService.createContainerIfNotExists(blobContainer, { publicAccessLevel: 'blob' }, function (error, result, response) {
            if (!error) {
                var form = new multiparty.Form();
                form.on('part', function (part) {
                    if (part.filename) {
                        var size = part.byteCount;
                        var filename = part.filename;
                        logger.get().debug({ req: req }, 'Uploading file: ' + filename);
                        blobService.createBlockBlobFromStream(blobContainer, filename, part, size, function (error) {
                            if (error) {
                                throw new Error(error);
                            } else {
                                logger.get().debug({ req: req }, 'uploaded successfully: ' + filename);
                                res.send('OK');
                            }
                        });
                    } else {
                        form.handlePart(part);
                    }
                });
                form.parse(req);
            } else {
                throw new Error(error);
            }
        });
    }));

    return router;
}