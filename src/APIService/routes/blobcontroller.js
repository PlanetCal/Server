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
    var FileUploadSizeLimitException = require('../../common/error.js').FileUploadSizeLimitException;
    var blobStorage = config.blobStorage;
    var blobStorageAccessKey = config.blobStorageAccessKey;
    var blobContainer = config.blobContainer;
    var blobSizeLimitInMB = config.blobSizeLimitInMB;
    var blobSizeLimitInBytes = blobSizeLimitInMB * 1024 * 1024;

    var corsOptions = {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['Version'],
        optionsSuccessStatus: 200,
        preflightContinue: true,
        credentials: true
    };

    router.post('/', cors(corsOptions), helpers.wrap(function* (req, res) {
        var blobService = azure.createBlobService(blobStorage, blobStorageAccessKey);
        blobService.createContainerIfNotExists(blobContainer, { publicAccessLevel: 'blob' }, function (error, result, response) {
            if (!error) {
                var form = new multiparty.Form();
                form.on('part', function (part) {
                    if (part.filename) {
                        var size = part.byteCount;
                        var filename = part.filename;
                        if (blobSizeLimitInBytes < size) {
                            throw new FileUploadSizeLimitException("Size of file to upload is bigger than " + blobSizeLimitInMB + " MB");
                        }

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