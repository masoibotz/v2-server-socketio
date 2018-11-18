const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
// const Chatkit = require('@pusher/chatkit-server')
const MongoClient = require('mongodb').MongoClient;
// const assert = require('assert');
var schedule = require('node-schedule')

const ChatServer = require('./chatkit');
const chatServer = new ChatServer();
const DBServer = require('./mongodb');
const dbServer = new DBServer()

const app = express()

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())

const stageTimeoutArr = {
	"night": 10 * 1000,
	"discuss": 1 * 60 * 1000,
	"voteyesno": 10 * 1000
}
const nextStageArr = {
	"night": "discuss",
	"discuss": "voteyesno",
	"voteyesno": "night"
}

function randomRole(roomID) {
	chatServer.getUserFromChatRoom(roomID).then(users => {
		var readyUser = users.filter(u => {
			return u.custom_data.ready;
		})
		var setup = { "0": [], "-1": [] }
		readyUser.forEach(u => {
			let roleID = Math.random() <= 0.5 ? -1 : 0;
			setup[roleID] = [...setup[roleID], u.id];
		})
		dbServer.updatePlayRoom(roomID, { status: 'ingame', dayStage: 'night', stageTimeout: new Date(Date.now() + stageTimeoutArr['night']).toISOString(), setup: setup }, (res) => {
			console.log(`Phòng ${roomID}: Chọn ngẫu nhiên nhân vật...`);
			sendAction(roomID, 'loadRole', res.value);
		})
	}).catch(err => console.log(err))
}
function goStage(roomID, stage) {
	let endTimer = new Date(Date.now() + stageTimeoutArr[stage]);
	dbServer.updatePlayRoom(roomID, { dayStage: stage, stageTimeout: endTimer.toISOString() }, (res) => {
		console.log(`Phòng ${roomID}: Stage ${stage}`);
		sendAction(roomID, `goStage${stage}`, res.value);

		//next stage
		const nextStage = nextStageArr[stage];
		if (res.status != 'ending') {
			schedule.scheduleJob(endTimer, () => {
				goStage(roomID, nextStage);
			})
		};
	})
}
function startGame(roomID) {
	console.log(`Phòng ${roomID}: Bắt đầu trò chơi...`);
	randomRole(roomID);
	goStage(roomID, 'night');
}
function endGame(roomID) {
	console.log(`Phòng ${roomID}: ENDGAME BETA...`);
	schedule.cancel();
}

app.get('/end/:roomID', (req, res) => {
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

app.post('/reg', async (req, res) => {
	const { id, name } = req.body;
	console.log(`[+] REG for user: ${req.id}`);
	var ret = await chatServer.regNewUser(id, name);
	res.status(200).json(ret);
})
app.post('/auth', async (req, res) => {
	console.log(`[+] LOGIN for user: ${req.query.user_id}`);
	const authData = await chatServer.login(req.query.user_id);
	res.status(authData.status).send(authData.body);
})
app.get('/room', (req, res) => {
	chatkit.getRoom({ roomId: "20509498" }).then(room => {
		res.status(200).json(room)
	}).catch(err => console.error(err))
})
app.get('/play/:roomID/ready', async (req, res) => {
	const userID = req.query.user_id;
	const value = req.query.value === 'true' ? true : false;
	var ret = await chatServer.ready(userID, value);
	res.status(200).json(ret);
})
app.get('/play/:roomID/getUser', (req, res) => {
	const roomID = req.params.roomID;
	console.log(`GET: /play/${roomID}/getUser`);
	chatServer.getUserFromChatRoom(roomID).then((users) => {
		var resRoom = {
			id: room.id,
			name: room.name,
			status: 'waiting',
			players: users
		}
		res.status(200).json(resRoom);
	})
})
app.get('/room/:roomID/status', (req, res) => {
	const roomID = req.params.roomID;
	console.log(`GET: /room/${roomID}/status`);
	dbServer.getPlayRoom((collection) => {
		collection.findOne({ roomChatID: roomID }, function (err, result) {
			if (err) throw err;
			res.status(200).json(result)
		});
	})
})
app.listen(process.env.PORT || 3001)
console.log(`MA SÓI BOT Server đang chạy tại cổng ${process.env.PORT || 3001}...`)