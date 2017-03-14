"use strict"

module.exports = {
    'url': 'mongodb://localhost:27017/PlanetCal', // looks like mongodb://<user>:<pass>@mongo.onmodulus.net:27017/Mikha4ot
    'userCollection' : 'User',

    "jwtSecret" : '395b2bdd68bf70b057d49ac75982dda0fdb70cf46b54b9e3476e05e81feceb6f',  //PlanetCal20170227

    'documentdbEndpoint' : 'https://planetcal.documents.azure.com:443/',
    'documentdbAuthKey' : 'scIZw13Y9sSHreezIEOqnXl5t8SajGjdSKRaW5uDPTG7izMIunHlQHG9q80S2e4P5QMsGNPe6bwymDfvrMeByA==',
    'documentdbDatabaseName' : 'planetcaldatabase',
    'userCollectionName' : 'userCollection',
    'userDetailsCollectionName' : 'userDetailsCollection',
    'eventsCollectionName' : 'eventsCollection',
    'groupsCollectionName' : 'groupsCollection',

    'apiServicePort' : 1337,
    'userAuthServicePort' : 1338,
    'userAuthServiceEndpoint' : 'http://localhost:1338',
    'userDetailsServicePort' : 1339,
    'userDetailsServiceEndpoint' : 'http://localhost:1339',
    'eventsServicePort' : 1340,
    'eventsServiceEndpoint' : 'http://localhost:1340',
    'groupsServicePort' : 1341,
    'groupsServiceEndpoint' : 'http://localhost:1341'
};