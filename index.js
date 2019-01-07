const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

const ChatServer = require('./chatkit');
const chatServer = new ChatServer();
const DBServer = require('./mongodb');
const dbServer = new DBServer()
const { randomRole, goStage, endGame } = require('./MaSoi');

const app = express()

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())

var roomIngame = [];

app.get('/play/:roomID/end', (req, res) => {
	const roomID = req.params.roomID;
	console.log(`Phòng ${roomID}: ENDGAME BETA: stopping game...`);
	roomIngame[roomID] = false;
	endGame(roomID, dbServer, chatServer);
	res.status(200).json({ success: true });
})
app.get('/play/:roomID/start', async (req, res) => {
	const roomID = req.params.roomID;
	const preSetupArr = JSON.parse(req.query.setup);
	if (roomIngame[roomID]) {
		res.status(200).json({ success: false, message: 'Game already started!' });
		return;
	}
	console.log(`Phòng ${roomID}: Bắt đầu trò chơi...`);
	roomIngame[roomID] = true;
	// kick notReady player out of chatRoom
	let notReadyPlayers = [];
	dbServer.getPlayRoom(roomID, { _id: 0, "players.ready": 1 }).then((playRoom) => {
		chatServer.getUserFromChatRoom(roomID).then(users => {
			users.forEach((userID) => {
				if (!playRoom.players.ready[userID]) {
					notReadyPlayers = [...notReadyPlayers, userID]
				}
			});
		});
	})
	chatServer.leaveRoom(roomID, notReadyPlayers);
	// start game: first stage
	await goStage(chatServer, dbServer, roomID, 'readyToGame', preSetupArr);
	res.status(200).json({ success: true });
})
app.get('/play/:roomID/do', (req, res) => {
	const updateData = JSON.parse(req.query.action);
	const roomID = req.params.roomID;
	dbServer.updatePlayRoom(roomID, updateData);
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
app.get('/chatRoom/:roomID', (req, res) => {
	const roomID = req.params.roomID;
	chatServer.getChatkit().getRoom({ roomId: roomID }).then(room => {
		res.status(200).json(room)
	}).catch(err => console.error(err))
})
app.get('/play/:roomID/:onOff-ready/:userID', async (req, res) => {
	const roomID = req.params.roomID;
	const userID = req.params.userID;
	const onOff = req.params.onOff === 'on' ? true : false;
	// var ret = await chatServer.ready(userID, onOff);
	await dbServer.updatePlayRoom(roomID, {
		[`players.ready.${userID}`]: onOff
	});
	console.log(`GET: /play/${roomID}/${onOff}-ready/${userID}`);
	res.status(200).json({ success: true });
})
app.get('/play/:roomID/join/:userID', async (req, res) => {
	const roomID = req.params.roomID;
	const userID = req.params.userID;
	console.log(`GET: /play/${roomID}/join/${userID}`);
	await dbServer.getPlayRoom(roomID, { _id: 0, "state.status": 1 }).then(playRoom => {
		if (playRoom.state.status === "waiting") {
			chatServer.joinRoom(roomID, userID);
			res.status(200).json({ success: true });
		} else {
			res.status(200).json({ success: false });
		}
	})
})
app.get('/play/:roomID/leave/:userID', async (req, res) => {
	const roomID = req.params.roomID;
	const userID = req.params.userID;
	console.log(`GET: /play/${roomID}/leave/${userID}`);
	await dbServer.getPlayRoom(roomID, { _id: 0, "state.status": 1, "roleInfo.deathList":1 }).then(playRoom => {
		if (!playRoom.state.status === "waiting") {
			if (new Date(playRoom.state.stageEnd) <= new Date()) {
				res.status(200).json({ success: false });
				return;
			}
		}
		chatServer.leaveRoom(roomID, [userID]);
		dbServer.updatePlayRoom(roomID, {
			"roleInfo.deathList": [...playRoom.roleInfo.deathList, userID]
		});
		res.status(200).json({ success: true });
	})
})
app.get('/play/:roomID/users', (req, res) => {
	const roomID = req.params.roomID;
	console.log(`GET: /play/${roomID}/users`);
	chatServer.getUserFromChatRoom(roomID).then((users) => {
		res.status(200).json(users);
	})
})
app.get('/room/:roomID/status', (req, res) => {
	const roomID = req.params.roomID;
	console.log(`GET: /room/${roomID}/status`);
	dbServer.connectRoom((collection) => {
		collection.findOne({ roomChatID: roomID }, function (err, result) {
			if (err) throw err;
			res.status(200).json(result)
		});
	})
})
app.get('/room', (req, res) => {
	console.log(`GET: /room/`);
	dbServer.connectRoom((collection) => {
		collection.find({}, { projection: { _id: 0, roomChatID: 1, hostUserID: 1, "state.status": 1, "players.ready": 1 } }).toArray(function (err, result) {
			if (err) throw err;
			res.status(200).json(result)
		})
	})
})
app.listen(process.env.PORT || 3001)
console.log(`MA SÓI BOT Server đang chạy tại cổng ${process.env.PORT || 3001}...`)