'use strict'

module.exports = function(){

    var router = require('express').Router();
    var request = require('request-promise');
    var config = require('../../common/config.js');
    var bodyParser = require('body-parser');
    var helpers = require('../../common/helpers.js');
    var APIServiceException = require('../../common/error.js').APIServiceException;

    router.get('/', helpers.wrap(function *(req, res){
        res.render('login');
    }));

    router.post('/', helpers.wrap(function *(req, res){
        var options = helpers.getRequestOption(req, config.userAuthServiceEndpoint + '/login', 'POST');
        var results = yield request(options).catch(function(err){
            throw new APIServiceException(req, 'Request to UserAuthServ failed.', 503, JSON.parse(err.error));
        });
        res.status(200).json(JSON.parse(results));
    }));

    return router;  
}
