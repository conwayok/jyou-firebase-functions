// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

exports.requestpair = functions.https.onRequest((request, response) => {
    if (request.method === 'POST') {
        const pairRequestUid = request.body;
        console.log("pair uid: " + pairRequestUid);
        const db = admin.database().ref('/pairing');

        db.once('value').then(async (snapshot) => {
            let waitingUsers = [];
            snapshot.forEach((child) => {
                waitingUsers.push({pushId: child.key, uid: child.val()['uid']});
            });

            console.log(waitingUsers);

            // if more than two people are waiting to pair
            if (waitingUsers.length > 0) {
                const uid1 = pairRequestUid;
                const uid2 = waitingUsers[0].uid;
                console.log('pairing ' + uid1 + ' and ' + uid2);
                const roomId = uid1 + "_" + uid2;

                await admin.database().ref('/users').once('value').then((snapshot) => {
                    snapshot.forEach(async (child) => {
                        if (child.val()['uid'] === uid1 || child.val()['uid'] === uid2) {
                            await admin.database().ref('/rooms/' + roomId).child('tags').set(['fuck', 'you']);


                            // send notification
                            const token = child.val()['token'];
                            const payload = "{notification:{title:" + roomId + ",body: \"配對成功\"}}";
                            console.log('send notification');
                            await admin.messaging().sendToDevice(token, payload);
                        }
                    })
                });
                console.log('paired ' + pairRequestUid + ' ' + waitingUsers[0].uid);
                console.log('remove pushId ' + waitingUsers[0].pushId);
                await db.child(waitingUsers[0].pushId).set(null);
            } else {
                await db.push({uid: pairRequestUid});
            }
        });
        response.statusCode = 200;
        response.send(pairRequestUid);
        response.end();
    } else {
        response.statusCode = 405;
        response.send('HTTP Method ' + request.method + ' not allowed');
    }
});

exports.cancelpair = functions.https.onRequest((request, response) => {
    if (request.method === 'POST') {
        const cancelpairuid = request.body;
        console.log("cancel pair uid: " + cancelpairuid);
        const db = admin.database().ref('/pairing');

        db.once('value').then((snapshot) => {
            snapshot.forEach(async (child) => {
                if (child.val()['uid'] === cancelpairuid)
                    await db.child(child.key).set(null);
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

exports.test = functions.https.onRequest(async (req, resp) => {
    const token = "dMMyQabd5bw:APA91bG9OVMOjOFKfOgXXS3jhUvHD0nz7hHFJ6a-40EtOxXxqJuLH7JDzy2yoA767IsJUxQnpxIurPilS1p4njVg1vM4y2Fg3TuDXJxBGNK1iaQN4VNfkhIGVX3NmBIgFf1rzPaM7f6F";
    const payload = "{notification: {title: \"title1\", body: \"body1\"}}";

    const roomId = 'werqwer';

    await admin.database().ref('/rooms/' + roomId).child('tags').set(['fuck', 'you']);


    console.log('send notification');
    await admin.messaging().sendToDevice(token, [payload]);
    resp.statusCode = 200;
    resp.end();
});