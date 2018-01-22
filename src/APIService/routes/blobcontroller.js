'use strict'

module.exports = function (config, logger) {
    var router = require('express').Router();
    var request = require('request-promise');
    var azure = require('azure-storage');
    var cors = require('cors');
    var etag = require('etag');
    var multiparty = require('multiparty');

    var serviceNames = require('../common/constants.json')['serviceNames'];
    var urlNames = require('../common/constants.json')['urlNames'];
    var helpers = require('../common/helpers.js');
    var FileUploadSizeLimitException = require('../common/error.js').FileUploadSizeLimitException;
    var BadRequestException = require('../common/error.js').BadRequestException;
    var errorcode = require('../common/errorcode.json');
    var blobStorage = config.blobStorage;
    var blobStorageAccessKey = config.blobStorageAccessKey;
    var blobGroupContainer = config.blobGroupContainer;
    var blobEventContainer = config.blobEventContainer;
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

    router.delete('/:blobContainer/:blob', cors(corsOptions), helpers.wrap(function* (req, res) {
        let blobService = azure.createBlobService(blobStorage, blobStorageAccessKey);
        let blobContainer = req.params.blobContainer;
        let fileName = req.params.blob;
        blobService.deleteBlobIfExists(blobContainer, fileName,
            function (error) {
                if (error) {
                    throw new Error(error);
                } else {
                    logger.get().info(`Deleted ${fileName} successfully.`);
                    res.status(200).json({ blob: fileName });
                }
            }
        );
    }));


    router.post('/', cors(corsOptions), helpers.wrap(function* (req, res) {

        var groupId = req.headers['groupid'];
        var eventId = req.headers['eventid'];

        if (!groupId && !eventId) {
            throw new BadRequestException('Cannot find groupId or eventId in the header for uploading file.', errorcode.GroupIdOrEventIdNotFound);
        } else if (groupId && eventId) {
            throw new BadRequestException('groupId and eventId are both present. Only one should be present in header.', errorcode.GroupIdAndEventIdBothFound);
        }
        var fileFirstPart = groupId ? groupId : eventId;
        var blobContainer = groupId ? blobGroupContainer : blobEventContainer;

        var blobService = azure.createBlobService(blobStorage, blobStorageAccessKey);
        blobService.createContainerIfNotExists(blobContainer, { publicAccessLevel: 'blob' }, function (error, result, response) {
            if (!error) {
                var form = new multiparty.Form();
                form.on('part', function (part) {
                    if (part.filename) {
                        var size = part.byteCount;
                        var filename = part.name;
                        var indexOfdot = filename.lastIndexOf('.');
                        var extension = (indexOfdot > 0) ? filename.substr(indexOfdot).toLowerCase() : '.data';

                        if (blobSizeLimitInBytes < size) {
                            throw new BadRequestException("Size of file to upload is bigger than " + blobSizeLimitInMB + " MB", errorcode.FileUploadSizeLimit);
                        }

                        logger.get().info(`uploading ${filename}.`);
                        var newFileName = fileFirstPart + extension;
                        blobService.createBlockBlobFromStream(blobContainer, newFileName, part, size, function (error) {
                            if (error) {
                                throw new Error(error);
                            } else {
                                logger.get().info(`uploaded ${filename} successfully.`);
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