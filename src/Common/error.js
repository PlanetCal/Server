'use strict'

module.exports = {

    BadRequestException : function BadRequestException (message, innerException) {
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'BadRequestException';
        this.message = message;                
        this.code = 400;
    },

    NotFoundException : function NotFoundException (message, innerException) {
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'NotFoundException';
        this.message = message;
        this.code = 404;
        this.innerException = innerException;
    },

    ForbiddenException : function ForbiddenException (message, innerException) {
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'ForbiddenException';
        this.message = message;
        this.code = 403;
        this.innerException = innerException;
    },

    UnauthorizedException : function UnauthorizedException (message, innerException){
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'UnauthorizedException';
        this.message = message;
        this.code = 401;
        this.innerException = innerException;
    },

    VersionNotFoundException : function VersionNotFoundException (message, innerException){
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'VersionNotFoundException';
        this.message = message;
        this.code = 400; // Badrequest
        this.innerException = innerException;
    },

    InternalServerException : function InternalServerException (message, innerException){
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'InternalServerException';
        this.message = message;
        this.code = 500;
        this.innerException = innerException;
    },

    DatabaseException : function DatabaseException (docdbErr){
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'DatabaseException';
        this.code = docdbErr.code;
        this.serviceName = 'Database';

        var parsedBody;
        try{
            parsedBody = JSON.parse(docdbErr.body);
        }
        catch(e){
        }

        if (parsedBody){
            this.message = parsedBody.message;
        }
        else{
            this.message = 'Unknown database error';
        }
        // intentionally left innerError undefined.
    },

    UserAuthServiceException : function UserAuthServiceException (req, message, code, innerException){
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, UserAuthServiceException);
        this.name = 'UserAuthServiceException';
        this.code = code || 503;
        this.serviceName = 'UserAuthService';
        this.activityId = innerException.activityId || req.headers['activityid'];
        this.message = message;
        this.innerException = innerException;
    },

    UserDetailsServiceException : function UserDetailsServiceException (req, message, code, innerException){
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, UserDetailsServiceException);
        this.name = 'UserDetailsServiceException';
        this.code = code || 503;
        this.serviceName = 'UserDetailsService';
        this.activityId = innerException.activityId || req.headers['activityid'];
        this.message = message;
        this.innerException = innerException;
    },

    EventsServiceException : function EventsServiceException (req, message, code, innerException){
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, EventsServiceException);
        this.name = 'EventsServiceException';
        this.code = code || 503;
        this.serviceName = 'EventsService';
        this.activityId = innerException.activityId || req.headers['activityid'];
        this.message = message;
        this.innerException = innerException;
    },

    GroupsServiceException : function GroupsServiceException (req, message, code, innerException){
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, GroupsServiceException);
        this.name = 'GroupsServiceException';
        this.code = code || 503;
        this.serviceName = 'GroupsService';
        this.activityId = innerException.activityId || req.headers['activityid'];
        this.message = message;
        this.innerException = innerException;
    },

    APIServiceException : function APIServiceException(req, message, code, innerException){
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, APIServiceException);
        this.name = 'APIServiceException';
        this.code = code || 503;
        this.serviceName = 'APIService';
        this.activityId = innerException.activityId || req.headers['activityid'];
        this.message = message;
        this.innerException = innerException;        
    }
}
