'use strict'

module.exports = function (config, logger) {
    var router = require('express').Router();
    var request = require('request-promise');
    var cors = require('cors');
    var etag = require('etag');
    var multer = require('multer');
    var upload = multer({ storage: multer.memoryStorage() });

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

    router.post('/', cors(corsOptions), upload.single('blobdata'), helpers.wrap(function* (req, res) {
        // req.file is the `avatar` file
        // req.body will hold the text fields, if there were any
        logger.get().debug({ req: req }, 'Uploading the blob.');
        helpers.uploadBlob(blobStorage, blobContainer, blobStorageAccessKey, req.file);
        res.status(201).json({ id: "hi how are you" });
    }));

    return router;
}