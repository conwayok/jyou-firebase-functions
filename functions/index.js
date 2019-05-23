// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

exports.requestpair = functions.https.onRequest(async (request, response) => {
    if (request.method === 'POST') {
        const uid = request.body;
        console.log(uid);
        await admin.database().ref('/pairing').push({uid: uid});
        response.statusCode = 200;
        response.send(uid);
        response.end();
    } else {
        response.statusCode = 405;
        response.send('HTTP Method ' + request.method + ' not allowed');
    }
});