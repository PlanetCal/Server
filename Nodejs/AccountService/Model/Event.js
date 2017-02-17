//Event.js
"use strict";

module.exports = {
    Event: function (name, startTime, endTime) {
        this.name = name;
        this.startTime = startTime;
        this.endTime = endTime;
        this.hasExpired = function () {
            var now = new Date();        
            return this.startTime <= now && this.endTime >= now;
        };
    }
};