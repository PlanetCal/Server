'use strict'

var morgan = require('morgan');

module.exports = {

    'getAccessLogger' : function getAccessLogger(logger){
         return morgan(function(tokens, req, res){
            return JSON.stringify({
                method : tokens.method(req, res),
                url: tokens.url(req, res),
                status: tokens.status(req, res),
                activityid : tokens.req(req, res, 'activityid'),
                authidentity : tokens.req(req, res, 'auth-identity'),
                responsetime: tokens['response-time'](req, res) + 'ms'
            });
        },
        {
            'stream': {
                write: function(accessLog) {
                    logger.get().info({accessLog : JSON.parse(accessLog)});
                }
            }
        });
    }
}
    
