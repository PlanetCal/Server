"use strict"

module.exports = {
    'url': 'mongodb://localhost:27017/PlanetCal', // looks like mongodb://<user>:<pass>@mongo.onmodulus.net:27017/Mikha4ot
    'userCollection' : 'User',

    "jwtSecret" : '395b2bdd68bf70b057d49ac75982dda0fdb70cf46b54b9e3476e05e81feceb6f',  //PlanetCal20170227

    'documentdbEndpoint' : 'https://planetcal.documents.azure.com:443/',
    'documentdbAuthKey' : 'UCAhQVjUx8iR4ICIWuF0ElSadxhm1AeIaj62FWRQzkkdYeXaxpaUz8WFFC8jGbdR0P6Jty7ZjGTfRHhC2uoAYQ==',

    'userAuthServiceEndpoint' : 'http://localhost:1338',
    'userDetailsServiceEndpoint' : 'http://localhost:1339',
    'eventServiceEndpoint' : 'http://localhost:1340'
};