'use strict'

var errorcode = require('./errorcode.json');

module.exports = {

    BadRequestException: function BadRequestException(message, errorcode, innerException) {
        if (typeof (errorcode) === 'object') {
            innerException = errorcode;
            errorcode = errorcode.GenericBadRequestException;
        }
        const defaultHttpCode = 400;
        this.code = defaultHttpCode;
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'BadRequestException';
        this.errorcode = errorcode;
        this.message = message;
        if (innerException) {
            this.code = innerException.code || defaultHttpCode;
            this.errorcode = innerException.errorcode || errorcode.GenericBadRequestException;
        }
        this.innerException = innerException;
    },

    NotFoundException: function NotFoundException(message, errorcode, innerException) {
        if (typeof (errorcode) === 'object') {
            innerException = errorcode;
            errorcode = errorcode.GenericNotFoundException;
        }
        const defaultHttpCode = 404;
        this.code = defaultHttpCode;
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'NotFoundException';
        this.errorcode = errorcode;
        this.message = message;
        if (innerException) {
            this.code = innerException.code || defaultHttpCode;
            this.errorcode = innerException.errorcode || errorcode.GenericNotFoundException;
        }
        this.innerException = innerException;
    },

    ForbiddenException: function ForbiddenException(message, innerException) {
        const defaultHttpCode = 403;
        this.code = defaultHttpCode;
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'ForbiddenException';
        this.errorcode = errorcode.GenericForbiddenException;
        this.message = message;
        if (innerException) {
            this.code = innerException.code || defaultHttpCode;
            this.code = innerException.errorcode || errorcode.GenericForbiddenException;
        }
        this.innerException = innerException;
    },

    EmailValidationPendingException: function EmailValidationPendingException(message, innerException) {
        const defaultHttpCode = 403;
        this.code = defaultHttpCode;
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'EmailValidationPendingException';
        this.errorcode = errorcode.EmailValidationPending;
        this.message = message;
        if (innerException) {
            this.code = innerException.code || defaultHttpCode;
            this.code = innerException.errorcode || errorcode.EmailValidationPending;
        }
        this.innerException = innerException;
    },

    FileUploadSizeLimitException: function FileUploadSizeLimitException(message, innerException) {
        const defaultHttpCode = 403;
        this.code = defaultHttpCode;
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'FileUploadSizeLimitException';
        this.errorcode = errorcode.FileUploadSizeLimit;
        this.message = message;
        if (innerException) {
            this.code = innerException.code || defaultHttpCode;
            this.code = innerException.errorcode || errorcode.EmailValidationPending;
        }
        this.innerException = innerException;
    },

    UnauthorizedException: function UnauthorizedException(message, errorcode, innerException) {
        if (typeof (errorcode) === 'object') {
            innerException = errorcode;
            errorcode = errorcode.GenericUnauthorizedException;
        }
        const defaultHttpCode = 401;
        this.code = defaultHttpCode;
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'UnauthorizedException';
        this.errorcode = errorcode;
        this.message = message;
        if (innerException) {
            this.code = innerException.code || defaultHttpCode;
            this.errorcode = innerException.errorcode || errorcode.GenericUnauthorizedException;
        }
        this.innerException = innerException;
    },

    InternalServerException: function InternalServerException(message, innerException) {
        const defaultHttpCode = 500;
        this.code = defaultHttpCode;
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'InternalServerException';
        this.message = message;
        this.errorcode = errorcode.GenericInternalServerException;
        if (innerException) {
            this.code = innerException.code || defaultHttpCode;
            this.errorcode = innerException.errorcode || errorcode.GenericInternalServerException;
        }
        this.innerException = innerException;
    },

    DatabaseException: function DatabaseException(docdbErr) {
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'DatabaseException';
        this.code = docdbErr.code;
        this.errorcode = errorcode.GenericDatabaseException;

        var parsedBody;
        try {
            parsedBody = JSON.parse(docdbErr.body);
        }
        catch (e) {
        }

        if (parsedBody) {
            this.message = parsedBody.message;
            if (parsedBody.errorcode) {
                this.errorcode = parsedBody.errorcode;
            }
        }
        else {
            this.message = 'Unknown database error';
        }
        // intentionally left innerError undefined.
    },

    HttpRequestException: function HttpRequestException(message, url, innerException) {
        const defaultHttpCode = 503;
        this.code = defaultHttpCode;
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.captureStackTrace(this, this.constructor);
        this.name = 'HttpRequestException';
        this.errorcode = errorcode.GenericHttpRequestException;
        this.message = message;
        if (innerException) {
            this.code = innerException.code || defaultHttpCode;
            this.errorcode = innerException.errorcode || errorcode.GenericHttpRequestException;
        }
        this.innerException = innerException;
        this.url = url;
    }
}
