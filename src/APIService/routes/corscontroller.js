'use strict'

module.exports = function (config, logger) {
  var router = require('express').Router();
  var helpers = require('../common/helpers.js');
  var cors = require('cors');

  const origin = '*'; //TODO: For now

  var corsOptions = {
    origin: '*',
    methods: ['GET', 'POST'],
    optionsSuccessStatus: 200
  };

  router.options('/login', cors(corsOptions));

  corsOptions = {
    origin: '*',
    methods: ['POST', 'PUT', 'DELETE'],
    optionsSuccessStatus: 200
  };

  router.options('/userauth', cors(corsOptions));
  router.options('/userauth/*', cors(corsOptions));

  corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    optionsSuccessStatus: 200
  };

  router.options('/userdetails', cors(corsOptions));
  router.options('/userdetails/*', cors(corsOptions));

  router.options('/blob', cors(corsOptions));
  router.options('/blob/*', cors(corsOptions));

  router.options('/groups', cors(corsOptions));
  router.options('/groups/*', cors(corsOptions));

  router.options('/events', cors(corsOptions));
  router.options('/eventsanonymous', cors(corsOptions));
  router.options('/events/*', cors(corsOptions));

  corsOptions = {
    origin: '*',
    methods: ['GET', 'PUT'],
    optionsSuccessStatus: 200
  };

  router.options('/grouplinks', cors(corsOptions));

  return router;
}
