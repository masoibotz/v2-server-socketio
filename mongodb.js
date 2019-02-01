const MongoClient = require('mongodb').MongoClient;
module.exports = class DBServer {
    connectRoom(callback) {
        MongoClient.connect('mongodb+srv://admin:admin@cluster0-bkueo.mongodb.net/test?retryWrites=true', { useNewUrlParser: true }, function (err, client) {
            const collection = client.db("masoi").collection("room");
            callback(collection);
            client.close();
        });
    }
    connectUser(callback) {
        MongoClient.connect('mongodb+srv://admin:admin@cluster0-bkueo.mongodb.net/test?retryWrites=true', { useNewUrlParser: true }, function (err, client) {
            const collection = client.db("masoi").collection("user");
            callback(collection);
            client.close();
        });
    }
    newUser(userID, name, avatar) {
        return new Promise((resolve, reject) => {
            this.connectUser(collection => {
                collection.insertOne({ userID: userID, name: name, avatar: avatar }, function (err, result) {
                    if (err) throw err;
                    resolve(result);
                });
            })
        })
    }
    getUser(userID, filter = {}, params = {}) {
        return new Promise((resolve, reject) => {
            this.connectUser(collection => {
                collection.findOne({ ...{ userID: userID }, ...params }, { projection: filter }, function (err, result) {
                    if (err) throw err;
                    resolve(result);
                });
            })
        })
    }
    updateUser(userID, updateData, callback = () => { }) {
        return new Promise((resolve, reject) => {
            this.connectUser(collection => {
                collection.findOneAndUpdate({ userID: userID }, {
                    $set: updateData,
                }, { returnOriginal: false }, function (err, res) {
                    if (err) throw err;
                    console.log(`Người ${userID}: Cập nhật `, updateData);
                    callback(res.value);
                    resolve(res.value);
                });
            })
        })
    }
    getPlayRoom(roomID, filter = {}, params = {}) {
        return new Promise((resolve, reject) => {
            this.connectRoom(collection => {
                collection.findOne({ ...{ roomChatID: roomID }, ...params }, { projection: filter }, function (err, result) {
                    if (err) throw err;
                    resolve(result);
                });
            })
        })
    }
    updatePlayRoom(roomID, updateData, callback = () => { }) {
        return new Promise((resolve, reject) => {
            this.connectRoom(collection => {
                collection.findOneAndUpdate({ roomChatID: roomID }, {
                    $set: updateData,
                }, { returnOriginal: false }, function (err, res) {
                    if (err) throw err;
                    console.log(`Phòng ${roomID}: Cập nhật `);
                    callback(res.value);
                    resolve(res.value);
                });
            })
        })
    }
    pushPlayRoom(roomID, pushData, callback = () => { }) {
        return new Promise((resolve, reject) => {
            this.connectRoom(collection => {
                collection.findOneAndUpdate({ roomChatID: roomID }, {
                    $push: pushData,
                }, { returnOriginal: false }, function (err, res) {
                    if (err) throw err;
                    console.log(`Phòng ${roomID}: Cập nhật mảng `, pushData);
                    callback(res);
                    resolve(res);
                });
            })
        })
    }
}