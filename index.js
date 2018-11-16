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
	"night": 10 * 1000,
	"discuss": 10 * 1000,
	"voteyesno": 10 * 1000
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
				$set: { status: 'ingame', dayStage: 'night', stageTimeout: new Date(Date.now() + stageTimeoutArr['night']).toISOString(), setup: setup }
			}, { returnOriginal: false }, function (err, res) {
				if (err) throw err;
				console.log(`Phòng ${roomID}: Chọn ngẫu nhiên nhân vật...`);
				sendAction(roomID, 'loadRole', res.value);
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
			sendAction(roomID, `goStage${stage}`, res.value);

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
	console.log(`Phòng ${roomID}: Bắt đầu trò chơi...`);
	randomRole(roomID);
	goStage(roomID, 'night');
}
function endGame(roomID) {
	console.log(`Phòng ${roomID}: ENDGAME BETA...`);
	schedule.cancelJob();
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
app.get('/end', (req, res) => {
	const roomID = req.params.roomID;
	endGame(roomID);
	res.status(200).json({ success: true });
})
app.get('/play/:roomID/start', (req, res) => {
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
	const { id, name } = req.body;
	console.log(`[+] REG for user: ${req.id}`);
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
	console.log(`[+] LOGIN for user: ${req.query.user_id}`);
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
app.get('/play/:roomID/ready', (req, res) => {
	const userID = req.query.user_id;
	const value = req.query.value === 'true' ? true : false;
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
})
app.get('/play/:roomID/getUser', (req, res) => {
	const roomID = req.params.roomID;
	console.log(`GET: /play/${roomID}/getUser`);
	chatkit.getRoom({
		roomId: "20509498",
	}).then(room => {
		chatkit.getUsersById({
			userIds: room.member_user_ids,
		}).then(users => {
			var resRoom = {
				id: room.id,
				name: room.name,
				status: 'waiting',
				players: users
			}
			res.status(200).json(resRoom)
		}).catch(err => console.error(err))
	}).catch(err => console.error(err))
})
app.get('/loadRole', (req, res) => {
	const userID = req.query.user_id;
	res.status(200).json({
		success: true,
		role: -1 //wolf
	});
})
app.get('/room/:roomID/status', (req, res) => {
	const roomID = req.params.roomID;
	console.log(`GET: /room/${roomID}/status`);
	MongoClient.connect('mongodb+srv://root:root@cluster0-7wmps.mongodb.net/test?retryWrites=true', { useNewUrlParser: true }, function (err, client) {
		const collection = client.db("masoi").collection("room");
		collection.findOne({ roomChatID: roomID }, function (err, result) {
			if (err) throw err;
			res.status(200).json(result)
		});
		client.close();
	});
})
app.listen(process.env.PORT || 3001)
console.log(`MA SÓI BOT Server đang chạy tại cổng ${process.env.PORT || 3001}...`)