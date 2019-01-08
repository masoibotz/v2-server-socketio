const MongoClient = require('mongodb').MongoClient;
module.exports = class DBServer {
    connectRoom(callback) {
        MongoClient.connect('mongodb+srv://root:root@cluster0-7wmps.mongodb.net/test?retryWrites=true', { useNewUrlParser: true }, function (err, client) {
            const collection = client.db("masoi").collection("room");
            callback(collection);
            client.close();
        });
    }
    connectUser(callback) {
        MongoClient.connect('mongodb+srv://root:root@cluster0-7wmps.mongodb.net/test?retryWrites=true', { useNewUrlParser: true }, function (err, client) {
            const collection = client.db("masoi").collection("user");
            callback(collection);
            client.close();
        });
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
                    console.log(`Phòng ${roomID}: Cập nhật `, updateData);
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