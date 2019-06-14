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

        // if more than two people are waiting to pair
        if (waitingUsers.length > 0) {
            // remove uid from waiting queue
            await pairingDb.child(waitingUsers[0].pushId).set(null);

            const uid1 = pairRequestUid;
            const uid2 = waitingUsers[0].uid;
            console.log('pairing ' + uid1 + ' and ' + uid2);
            const roomId = uid1 + "_" + uid2;

            // get tags, tokens and rooms
            let tag1 = '';
            let tag2 = '';
            let token1 = '';
            let token2 = '';
            let rooms1 = [];
            let rooms2 = [];

            await usersDb.child(uid1).once('value').then((snapshot) => {
                tag1 = snapshot.val()['tags'][0];
                token1 = snapshot.val()['token'];
                rooms1 = snapshot.val()['rooms'];
            });

            await usersDb.child(uid2).once('value').then((snapshot) => {
                tag2 = snapshot.val()['tags'][0];
                token2 = snapshot.val()['token'];
                rooms2 = snapshot.val()['rooms'];
            });

            console.log('create room ' + roomId);

            // create room and set tags
            await roomsDb.child(roomId + '/tags/' + uid1).set([tag1]);
            await roomsDb.child(roomId + '/tags/' + uid2).set([tag2]);

            // add room to users
            if (typeof rooms1 === 'undefined')
                rooms1 = [roomId];
            else
                rooms1.push(roomId);
            if (typeof rooms2 === 'undefined')
                rooms2 = [roomId];
            else
                rooms2.push(roomId);

            await usersDb.child(uid1 + '/rooms').set(rooms1);
            await usersDb.child(uid2 + '/rooms').set(rooms2);

            // send notification
            const payload = {
                notification: {
                    title: roomId,
                    body: '配對成功'
                },
                match: true
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
