const Chatkit = require('@pusher/chatkit-server')
const chatkit = new Chatkit.default({
    instanceLocator: 'v1:us1:754dee8b-d6c4-41b4-a6d6-7105da589788',
    key: '04873650-fd91-476c-9e94-f821f7727fe7:/BcAzTp7GDueJVCKaCc+ZbuY6O340bjmk9Ux8dKryns='
})
module.exports = class ChatServer {
    async regNewUser(id, name) {
        var ret = {}
        await chatkit.createUser({
            id: id,
            name: name,
            customData: { ready: false },
        }).then(() => {
            console.log(`New User @${id}: ${name}`);
            ret = {
                success: true,
                id: id,
                name: name
            };
        }).catch((err) => {
            if (err.error === 'services/chatkit/user_already_exists') {
                ret = {
                    success: false,
                    err: "Mã bí mật trùng lặp!"
                }
            } else if (err.error === 'services/chatkit/unprocessable_entity/validation_failed') {
                ret = {
                    success: false,
                    err: "Vui lòng nhập đủ tên đăng nhập và mã bí mật!"
                }
            } else {
                ret = {
                    success: false,
                    err: err.error
                }
            }
        });
        return ret;
    }
    async login(user_id) {
        return await chatkit.authenticate({
            userId: user_id
        });
    }
    sendMessage(roomID, text) {
        chatkit.sendMessage({
            userId: 'botquantro',
            roomId: roomID,
            text: text,
        })
            .then(res => console.log('bot send'))
            .catch(err => console.error(err))
    }
    sendAction(roomID, actionName, data = {}) {
        this.sendMessage(roomID, JSON.stringify({
            action: actionName,
            text: `${actionName}`,
            data: data
        }))
    }
    getUserFromChatRoom(roomID) {
        return new Promise((resolve, reject) => {
            chatkit.getRoom({
                roomId: roomID,
            }).then(room => {
                chatkit.getUsersById({
                    userIds: room.member_user_ids,
                }).then(users => {
                    resolve(users);
                }).catch(err => {
                    console.error(err);
                    reject(err);
                })
            }).catch(err => {
                console.error(err);
                reject(err);
            })
        })
    }
    async ready(userID, readyOrNot) {
        var ret = {
            success: false,
            err: ''
        };
        await chatkit.updateUser({
            id: userID,
            customData: {
                ready: readyOrNot,
            },
        }).then(() => {
            console.log(`User ${userID} ready: ${readyOrNot}`);
            ret.success = true;
        }).catch((err) => {
            ret.err = err.error;
            ret.success = false;
        });
        return ret;
    }
}