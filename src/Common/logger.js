'use strict'

var bunyan = require('bunyan');
var helpers = require('./helpers.js');

module.exports = {
    
    Logger : function Logger(serviceName, loggerName, isDebug){

        var loggedHeaders = ['version', 'auth-identity', 'authorization', 'activityid'];

        this.serviceName = serviceName;     
        if (!loggerName){
            loggerName = serviceName + 'Logger';
        }

        if (!isDebug){
            isDebug = false;
        }
        this.internalLogger = bunyan.createLogger(
        {
            name : loggerName,
            src : isDebug
        });

        this.internalLogger.addSerializers({req : reqSerializer});
        this.internalLogger.addSerializers({exception : exceptionSerializer});
        this.internalLogger.addSerializers({activityId : activityIdSerializer});

        if (isDebug) {
            this.internalLogger.addStream({stream : process.stdout, level : 'debug'});
        }

        this.get = function get(){
            return this.internalLogger;
        }

        function reqSerializer(req) {
            if (!req || !req.headers){
                return req;
            }

            var headers = {};

            Object.keys(req.headers).forEach(function(key) {
                if (loggedHeaders.indexOf(key) > -1){
                    headers[key] = req.headers[key];
                }
            });

            return {
                method: req.method,
                url: req.url,
                headers: headers
            };
        }

        function exceptionSerializer(exception) {
            if (!exception){
                return exception;
            }

            if (exception.code){
                if (exception.code > 399){
                    return constructLoggedExceptionObject(exception, exception.code > 499);
                }
            }

            return exception;
        }

        function constructLoggedExceptionObject(exception, isFatalError){
            if (exception){
                if (isFatalError){
                    return {
                        name: exception.name,
                        code : exception.code,
                        message : exception.message,
                        errorCode : exception.errorCode,
                        activityId : exception.activityId,
                        servieName : exception.serviceName,
                        innerException : constructLoggedExceptionObject(exception.innerException, isFatalError),
                        stack : exception.stack
                    };
                }
                else{
                    return {
                        name: exception.name,
                        code : exception.code,
                        message : exception.message,
                        errorCode : exception.errorCode,
                        activityId : exception.activityId,
                        servieName : exception.serviceName,
                        innerException : constructLoggedExceptionObject(exception.innerException, isFatalError)
                    };
                }
            }
        }

        function activityIdSerializer(req){
            return {
                activityId : req.activityId
            };
        }
    }
}