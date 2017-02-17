//Account.js
"use strict";

module.exports = {
    Account: function (name, accountType, events) {
        this.name = name;
        this.accountType = accountType;
        this.events = events;
    }
};