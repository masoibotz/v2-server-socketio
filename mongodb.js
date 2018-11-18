const MongoClient = require('mongodb').MongoClient;
module.exports = class DBServer {
    getPlayRoom(callback) {
        MongoClient.connect('mongodb+srv://root:root@cluster0-7wmps.mongodb.net/test?retryWrites=true', { useNewUrlParser: true }, function (err, client) {
            const collection = client.db("masoi").collection("room");
            callback(collection);
            client.close();
        });
    }
    getPlayRoomState(roomID) {
        return new Promise((resolve, reject) => {
            this.getPlayRoom(collection => {
                collection.findOne({ roomChatID: roomID }, function (err, result) {
                    if (err) throw err;
                    resolve(result);
                });
            })
        })
    }
    updatePlayRoom(roomID, updateData, callback = ()=>{}) {
        this.getPlayRoom(collection => {
            collection.findOneAndUpdate({ roomChatID: roomID }, {
				$set: updateData
			}, { returnOriginal: false }, function (err, res) {
				if (err) throw err;
				console.log(`Phòng ${roomID}: Cập nhật `, updateData);
				callback(res);
			});
        })
    }
}