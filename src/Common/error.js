'use strict'

module.exports = {

    BadRequestError : function BadRequestError (message) {
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.message = message;                
        this.code = 400;
    },

    NotFoundError : function NotFoundError (message) {
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.message = message;
        this.code = 404;
    },

    ForbiddenError : function ForbiddenError (message) {
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.message = message;
        this.code = 403;
    },

    UnauthorizedError : function UnauthorizedError (message){
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.message = message;
        this.code = 401;
    },

    VersionNotFoundError : function VersionNotFoundError (message){
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.message = message;
        this.code = 400; // Badrequest
    },

    InternalServerError : function InternalServerError (message){
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.message = message;
        this.code = 500;
    }
}
