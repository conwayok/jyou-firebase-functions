// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

exports.requestpair = functions.https.onRequest(async (request, response) => {
    if (request.method === 'POST') {
        const pairRequestUid = request.body;
        console.log("pair uid: " + pairRequestUid);

        const pairingDb = admin.database().ref('/pairing');
        const usersDb = admin.database().ref('/users');
        const roomsDb = admin.database().ref('/rooms');

        // get waiting users
        let waitingUsers = [];
        await pairingDb.once('value').then((snapshot) => {
            snapshot.forEach((child) => {
                waitingUsers.push({pushId: child.key, uid: child.val()['uid']});
            });
        });

        console.log(waitingUsers);

        // if more than two people are waiting to pair
        if (waitingUsers.length > 0) {
            // remove uid from waiting queue
            await pairingDb.child(waitingUsers[0].pushId).set(null);

            const uid1 = pairRequestUid;
            const uid2 = waitingUsers[0].uid;
            console.log('pairing ' + uid1 + ' and ' + uid2);
            const roomId = uid1 + "_" + uid2;

            // get tags and tokens
            let tag1 = '';
            let tag2 = '';
            let token1 = '';
            let token2 = '';

            await usersDb.once('value').then((snapshot) => {
                snapshot.forEach((child) => {
                    if (child.val()['uid'] === uid1) {
                        tag1 = child.val()['tags'][0];
                        token1 = child.val()['token'];
                    } else if (child.val()['uid'] === uid2) {
                        tag2 = child.val()['tags'][0];
                        token2 = child.val()['token'];
                    }
                })
            });

            console.log(tag1, token1, tag2, token2);

            // create room
            await roomsDb.child(roomId + '/tags').set([tag1, tag2]);

            // send notification
            // const payload = "{notification:{title:" + roomId + ",body: \"配對成功\"}}";
            const payload = {
                notification: {
                    title: roomId,
                    body: '配對成功'
                }
            };

            console.log('send notification to ' + token1);
            await admin.messaging().sendToDevice(token1, payload);
            console.log('send notification to ' + token2);
            await admin.messaging().sendToDevice(token2, payload);

        } else {
            // else push uid into waiting queue
            await pairingDb.push({uid: pairRequestUid});
        }

        response.statusCode = 200;
        response.send(pairRequestUid);
        response.end();
    } else {
        response.statusCode = 405;
        response.send('HTTP Method ' + request.method + ' not allowed');
    }
});

exports.cancelpair = functions.https.onRequest(async (request, response) => {
    if (request.method === 'POST') {
        const cancelpairuid = request.body;
        console.log("cancel pair uid: " + cancelpairuid);
        const db = admin.database().ref('/pairing');

        await db.once('value').then((snapshot) => {
            snapshot.forEach((child) => {
                if (child.val()['uid'] === cancelpairuid)
                    db.child(child.key).set(null);
            });
        });

        response.statusCode = 200;
        response.send(cancelpairuid);
        response.end();
    } else {
        response.statusCode = 405;
        response.send('HTTP Method ' + request.method + ' not allowed');
    }
});
