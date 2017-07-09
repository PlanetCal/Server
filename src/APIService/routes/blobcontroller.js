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
    var BadRequestException = require('../../common/error.js').BadRequestException;
    var errorcode = require('../../common/errorcode.json');
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

        var groupId = req.headers['groupid'];
        var eventId = req.headers['eventid'];

        if (!groupId && !eventId) {
            throw new BadRequestException('Cannot find groupId or eventId in the header for uploading file.', errorcode.GroupIdOrEventIdNotFound);
        } else if (groupId && eventId) {
            throw new BadRequestException('groupId and eventId are both present. Only one should be present in header.', errorcode.GroupIdAndEventIdBothFound);
        }
        var fileFirstPart = groupId ? groupId : eventId;

        var blobService = azure.createBlobService(blobStorage, blobStorageAccessKey);
        blobService.createContainerIfNotExists(blobContainer, { publicAccessLevel: 'blob' }, function (error, result, response) {
            if (!error) {
                var form = new multiparty.Form();
                form.on('part', function (part) {
                    if (part.filename) {
                        var size = part.byteCount;
                        var filename = part.filename;
                        //filename = "test";

                        var extension = ".data";
                        var indexOfdot = filename.lastIndexOf('.');
                        if (indexOfdot > 0) {
                            extension = filename.substr(indexOfdot).toLowerCase();
                        }

                        if (blobSizeLimitInBytes < size) {
                            throw new BadRequestException("Size of file to upload is bigger than " + blobSizeLimitInMB + " MB", errorcode.FileUploadSizeLimit);
                        }

                        logger.get().debug({ req: req }, 'Uploading file: ' + filename);
                        var newFileName = fileFirstPart + extension;
                        blobService.createBlockBlobFromStream(blobContainer, newFileName, part, size, function (error) {
                            if (error) {
                                throw new Error(error);
                            } else {
                                logger.get().debug({ req: req }, 'uploaded successfully: ' + filename);
                                var url = "https://" + blobStorage + ".blob.core.windows.net/" + blobContainer + "/" + newFileName;
                                res.status(200).json({ url: url, size: size });
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