'use strict'

module.exports = function (config, logger) {
    var express = require('express');
    var router = express.Router();
    var request = require('request-promise');

    var blobStorage = config.blobStorage;
    var blobStorageAccessKey = config.blobStorageAccessKey;
    var blobContainer = config.blobContainer;

    var helpers = require('../../common/helpers.js');
    var BadRequestException = require('../../common/error.js').BadRequestException;
    var ForbiddenException = require('../../common/error.js').ForbiddenException;
    var errorcode = require('../../common/errorcode.json');

    router.post('/', helpers.wrap(function* (req, res) {
        // TODO: Validate userdetails objects in body
        // var userDetails = req.body;

        logger.get().debug({ req: req }, 'Uploading the blob.');

        res.status(201).json({ id: "hi how are you" });
    }));

    return router;
}

