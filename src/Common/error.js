'use strict'

module.exports = {

    BadRequestException : function BadRequestException (message, innerException) {
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'BadRequestException';
        this.message = message;                
        this.code = innerException.code || 400;
        this.innerException = innerException;
    },

    NotFoundException : function NotFoundException (message, innerException) {
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'NotFoundException';
        this.message = message;
        this.code = innerException.code || 404;
        this.innerException = innerException;
    },

    ForbiddenException : function ForbiddenException (message, innerException) {
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'ForbiddenException';
        this.message = message;
        this.code = innerException.code || 403;
        this.innerException = innerException;
    },

    UnauthorizedException : function UnauthorizedException (message, innerException){
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'UnauthorizedException';
        this.message = message;
        this.code = innerException.code || 401;
        this.innerException = innerException;
    },

    VersionNotFoundException : function VersionNotFoundException (message, innerException){
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'VersionNotFoundException';
        this.message = message;
        this.code = innerException.code || 400; // Badrequest
        this.innerException = innerException;
    },

    InternalServerException : function InternalServerException (message, innerException){
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'InternalServerException';
        this.message = message;
        this.code = innerException.code || 500;
        this.innerException = innerException;
    },

    DatabaseException : function DatabaseException (docdbErr){
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'DatabaseException';
        this.code = docdbErr.code;

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

    HttpRequestException : function HttpRequestException(message, url, innerException){
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'HttpRequestException';
        this.message = message;
        this.code = innerException.code || 503;
        this.innerException = innerException;   
        this.url = url;     
    }
}
