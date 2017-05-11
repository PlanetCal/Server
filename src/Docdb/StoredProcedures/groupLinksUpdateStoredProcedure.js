'use strict'

var constants = require('../../common/constants.json');

module.exports = {
    'groupLinksUpdateStoredProc': {
        id : constants.groupLinksUpdateStoredProcName,
        serverScript : function groupLinksUpdateStoredProc() {
	        var context = getContext();
	        var response = context.getResponse();

	        response.setBody("Hello, World");
    	}
    }
}
