const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const Chatkit = require('@pusher/chatkit-server')
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
var schedule = require('node-schedule')


const chatkit = new Chatkit.default({
	instanceLocator: 'v1:us1:754dee8b-d6c4-41b4-a6d6-7105da589788',
	key: '04873650-fd91-476c-9e94-f821f7727fe7:/BcAzTp7GDueJVCKaCc+ZbuY6O340bjmk9Ux8dKryns='
})
const app = express()

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())

const stageTimeoutArr = {
	"night": 1 * 60 * 1000,
	"discuss": 5 * 60 * 1000,
	"voteyesno": 1 * 60 * 1000
}
const nextStageArr = {
	"night": "discuss",
	"discuss": "voteyesno",
	"voteyesno": "night"
}

function roomDB(callback) {
	MongoClient.connect('mongodb+srv://root:root@cluster0-7wmps.mongodb.net/test?retryWrites=true', { useNewUrlParser: true }, function (err, client) {
		const collection = client.db("masoi").collection("room");
		callback(collection);
		client.close();
	});
}
function sendMessage(roomID, text) {
	chatkit.sendMessage({
		userId: 'botquantro',
		roomId: roomID,
		text: text,
	})
		.then(res => console.log('bot send'))
		.catch(err => console.error(err))
}
function sendAction(roomID, actionName, data = {}) {
	sendMessage(roomID, JSON.stringify({
		action: actionName,
		text: `CMD:${actionName}`,
		data: data
	}))
}
function getUserFromChatRoom(roomID) {
	console.log("call");
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
function getRoomState(roomID) {
	return new Promise((resolve, reject) => {
		roomDB(collection => {
			collection.findOne({ roomChatID: roomID }, function (err, result) {
				if (err) throw err;
				resolve(result);
			});
		})
	})
}
function randomRole(roomID) {
	getUserFromChatRoom(roomID).then(users => {
		var readyUser = users.filter(u => {
			return u.custom_data.ready;
		})
		var setup = { "0": [], "-1": [] }
		readyUser.forEach(u => {
			let roleID = Math.random() <= 0.5 ? -1 : 0;
			setup[roleID] = [...setup[roleID], u.id];
		})
		roomDB(collection => {
			collection.findOneAndUpdate({ roomChatID: roomID }, {
				$set: { status: 'ingame', dayStage: 'day', stageTimeout: new Date(Date.now() + stageTimeoutArr['night']).toISOString(), setup: setup }
			}, { returnOriginal: false }, function (err, res) {
				if (err) throw err;
				console.log(`Phòng ${roomID}: Chọn ngẫu nhiên nhân vật...`);
				sendAction(roomID, 'goStage', res);
			});
		})
	}).catch(err => console.log(err))
}
function goStage(roomID, stage) {
	let endTimer = new Date(Date.now() + stageTimeoutArr[stage]);
	roomDB(collection => {
		collection.findOneAndUpdate({ roomChatID: roomID }, {
			$set: { dayStage: stage, stageTimeout: endTimer.toISOString() }
		}, { returnOriginal: false }, function (err, res) {
			if (err) throw err;
			console.log(`Phòng ${roomID}: Stage ${stage}`);
			sendAction(roomID, 'goStage', res);

			//next stage
			const nextStage = nextStageArr[stage];
			if (res.status != 'ending') {
				schedule.scheduleJob(endTimer, () => {
					goStage(roomID, nextStage);
				})
			};
		});
	})
}
function startGame(roomID) {
	randomRole(roomID);
	goStage(roomID, 'night');
}
function updateRoleAction(roomID, roleAction) {
	roomDB(collection => {
		collection.updateOne({ roomChatID: roomID }, {
			$set: roleAction
		}, function (err, res) {
			if (err) throw err;
			console.log(`Phòng ${roomID}: Cập nhật `, roleAction);
		});
	})
}
app.get('play/:roomID/start', (req, res) => {
	const roomID = req.params.roomID;
	startGame(roomID);
	res.status(200).json({ success: true });
})
app.get('/play/:roomID/do', (req, res) => {
	const roleAction = req.query.action;
	const roomID = req.params.roomID;
	updateRoleAction(roomID, JSON.parse(roleAction));
	res.status(200).json({ success: true });
})

app.post('/reg', (req, res) => {
	const { id, name } = req.body
	chatkit.createUser({
		id: id,
		name: name,
		customData: { ready: false },
	}).then(() => {
		console.log(`New User @${id}: ${name}`);
		res.status(200).json({
			success: true,
			id: id,
			name: name
		});
	}).catch((err) => {
		if (err.error === 'services/chatkit/user_already_exists') {
			res.status(200).json({
				success: false,
				err: "Mã bí mật trùng lặp!"
			})
		} else if (err.error === 'services/chatkit/unprocessable_entity/validation_failed') {
			res.status(200).json({
				success: false,
				err: "Vui lòng nhập đủ tên đăng nhập và mã bí mật!"
			})
		}
		console.log(err.error);
	});
})
app.post('/auth', (req, res) => {
	const authData = chatkit.authenticate({
		userId: req.query.user_id
	});
	res.status(authData.status).send(authData.body);
})
app.get('/room', (req, res) => {
	chatkit.getRoom({ roomId: "20509498" }).then(room => {
		res.status(200).json(room)
	}).catch(err => console.error(err))
})
// app.get('/play/:roomID/init', (req, res) => {
// 	const roomID = req.params.room_id;
// 	chatkit.getRoom({
// 		roomId: "20509498",
// 	}).then(room => {
// 		chatkit.getUsersById({
// 			userIds: room.member_user_ids,
// 		}).then(users => {
// 			var resRoom = {
// 				id: room.id,
// 				name: room.name,
// 				status: 'waiting',
// 				players: users
// 			}
// 			res.status(200).json(resRoom)
// 		}).catch(err => console.error(err))
// 	}).catch(err => console.error(err))
// })
app.get('/play/:roomID/:action', (req, res) => {
	const userID = req.query.user_id;
	const action = req.params.action;
	const value = req.query.value === 'true' ? true : false;
	if (action == 'ready') {
		chatkit.updateUser({
			id: userID,
			customData: {
				ready: value,
			},
		}).then(() => {
			console.log(`User ${userID} ready: ${value}`);
			res.status(200).json({
				success: true,
			})
		}).catch((err) => {
			console.log(err);
			res.status(200).json({
				success: false,
			})
		});
	} else if (action == 'start') {
		// random role ();
		sendAction('20509498', 'loadRole');
		res.status(200).json({
			success: true,
		})
	}
})
app.get('/loadRole', (req, res) => {
	const userID = req.query.user_id;
	res.status(200).json({
		success: true,
		role: -1 //wolf
	});
})
app.get('/room/:id/status', (req, res) => {
	const roomID = req.params.id;
	MongoClient.connect('mongodb+srv://root:root@cluster0-7wmps.mongodb.net/test?retryWrites=true', { useNewUrlParser: true }, function (err, client) {
		const collection = client.db("masoi").collection("room");
		collection.findOne({ roomChatID: "20509498" }, function (err, result) {
			if (err) throw err;
			res.status(200).json(result)
			console.log(result);
		});
		client.close();
	});
})
app.listen(3001)
console.log('MA SÓI BOT Server đang chạy tại cổng 3001...')