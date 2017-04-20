'use strict'

module.exports = {

    BadRequestException : function BadRequestException (message, innerException) {
        const defaultHttpCode = 400;
        this.code = defaultHttpCode;
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'BadRequestException';
        this.message = message;                
        if (innerException){    
            this.code = innerException.code || defaultHttpCode;
        }
        this.innerException = innerException;
    },

    NotFoundException : function NotFoundException (message, innerException) {
        const defaultHttpCode = 404;
        this.code = defaultHttpCode;
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'NotFoundException';
        this.message = message;
        if (innerException){    
            this.code = innerException.code || defaultHttpCode;
        }
        this.innerException = innerException;
    },

    ForbiddenException : function ForbiddenException (message, innerException) {
        const defaultHttpCode = 403;
        this.code = defaultHttpCode;
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'ForbiddenException';
        this.message = message;
        if (innerException){    
            this.code = innerException.code || defaultHttpCode;
        }
        this.innerException = innerException;
    },

    UnauthorizedException : function UnauthorizedException (message, innerException){
        const defaultHttpCode = 401;
        this.code = defaultHttpCode;
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'UnauthorizedException';
        this.message = message;
        if (innerException){    
            this.code = innerException.code || defaultHttpCode;
        }
        this.innerException = innerException;
    },

    InternalServerException : function InternalServerException (message, innerException){
        const defaultHttpCode = 500;
        this.code = defaultHttpCode;
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'InternalServerException';
        this.message = message;
        if (innerException){    
            this.code = innerException.code || defaultHttpCode;
        }
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
        const defaultHttpCode = 503;
        this.code = defaultHttpCode;
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'HttpRequestException';
        this.message = message;
        if (innerException){    
            this.code = innerException.code || defaultHttpCode;
        }
        this.innerException = innerException;   
        this.url = url;     
    }
}
