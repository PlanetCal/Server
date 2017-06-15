'use strict'

var Ajv = require('ajv');

module.exports = {
    BodySchemaValidator : function BodySchemaValidator(){

        this.ajv = Ajv({ allErrors:true, removeAdditional:'all' });

        this.addSchema = function addSchema(schema, schemaName){
            this.ajv.addSchema(schema, schemaName);
        }

        this.errorResponse = function errorResponse(schemaErrors) {
            var errors = schemaErrors.map((error) => {
                return {
                    path: error.dataPath,
                    message: error.message
                }
            });
            return {
                status: 'failed',
                errors: errors
            };
        },

        this.validateSchema = function validateSchema(schemaName){
            return (req, res, next) => {
                var valid = this.ajv.validate(schemaName, req.body);
                if (!valid) {
                    return res.status(400).send(this.errorResponse(this.ajv.errors));
                }
                next();
            }       
        }
    }
}
