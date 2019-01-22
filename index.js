const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

const ChatServer = require('./chatkit');
const chatServer = new ChatServer();
const DBServer = require('./mongodb');
const dbServer = new DBServer()
const { randomRole, goStage, endGame } = require('./MaSoi');
const { nextStageArr } = require('./Utils');

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
	const preSetup = req.query.setup;
	const preSetupArr = preSetup ? JSON.parse(preSetup) : [];
	if (roomIngame[roomID]) {
		res.status(200).json({ success: false, message: 'Game already started!' });
		return;
	}
	console.log(`Phòng ${roomID}: Bắt đầu trò chơi...`);
	roomIngame[roomID] = true;
	setTimeout(() => {
		roomIngame[roomID] = false;
	}, 15000);
	// kick notReady player out of chatRoom
	await dbServer.getPlayRoom(roomID, { _id: 0, state: 1, "players.ready": 1 }).then(async (playRoom) => {
		if (playRoom.state.status != "waiting") {
			res.status(200).json({ success: false, message: 'Game already started!' });
			return;
		}
		await chatServer.getUserFromChatRoom(roomID).then(users => {
			let notReadyPlayers = [];
			users.forEach((user) => {
				if (!playRoom.players.ready[user.id]) {
					notReadyPlayers = [...notReadyPlayers, user.id];
				}
			});
			return notReadyPlayers;
		}).then(async notReadyPlayers => {
			if (notReadyPlayers.length > 0) {
				console.log(`===> KICK NOT READY`, notReadyPlayers);
				chatServer.leaveRoom(roomID, notReadyPlayers);
			}
			// start game: first stage
			await goStage(chatServer, dbServer, roomID, 'readyToGame', preSetupArr);
			res.status(200).json({ success: true });
		})
	})
})
app.get('/play/:roomID/goStage', async (req, res) => {
	const roomID = req.params.roomID;
	const dayStage = req.query.stage;
	await goStage(chatServer, dbServer, roomID, dayStage, [], false);
	let resHtml = ``;
	Object.keys(nextStageArr).map(stage => {
		return resHtml += `<a href='/play/${roomID}/goStage?stage=${stage}'>${stage}</a> | `
	})
	res.status(200).send(resHtml)
})
app.get('/play/:roomID/do', (req, res) => {
	const updateData = JSON.parse(req.query.action);
	const roomID = req.params.roomID;
	dbServer.updatePlayRoom(roomID, updateData);
	res.status(200).json({ success: true });
})
app.get('/login', async (req, res) => {
	const userID = req.query.user_id;
	console.log(`[+] LOGIN for user: ${userID}`);
	chatServer.login(userID).then(user => {
		res.status(200).send({ success: true, data: user });
	}).catch(err => {
		let message;
		if (err.error == "services/chatkit/not_found/user_not_found") {
			message = "Tên đăng nhập không tồn tại!"
		} else {
			message = err.error ? err.error : "Lỗi không xác định!";
		}
		res.status(200).send({
			success: false,
			message: message
		});
		console.log(`Lỗi đăng nhập: ${err.error}`);
	})
})
app.post('/reg', async (req, res) => {
	var { id, name, avatar } = req.body;
	console.log(`[+] REG for user: ${req.id}`);
	if (avatar == "") {
		avatar = "https://sites.google.com/site/masoibot/user/user.png";
	}
	var ret = await chatServer.regNewUser(id, name, avatar);
	if (ret.success) {
		await dbServer.newUser(id, name, avatar);
	}
	res.status(200).json(ret);
})
app.post('/auth', async (req, res) => {
	console.log(`[+] AUTH for user: ${req.query.user_id}`);
	const authData = await chatServer.auth(req.query.user_id);
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
	var updateData = {
		[`players.ready.${userID}`]: onOff
	};
	if (onOff) { // ready
		await chatServer.getUserFromChatRoom(roomID).then(users => {
			let name = users.find((u) => {
				return u.id == userID;
			}).name;
			updateData = {
				...updateData, ...{
					[`players.names.${userID}`]: name
				}
			}
		})
	}
	await dbServer.updatePlayRoom(roomID, updateData).then(playRoom => {
		chatServer.sendAction(roomID, 'ready', playRoom);
	});
	console.log(`GET: /play/${roomID}/${onOff}-ready/${userID}`);
	res.status(200).json({ success: true });
})
app.get('/play/:roomID/join/:userID', async (req, res) => {
	const roomID = req.params.roomID;
	const userID = req.params.userID;
	console.log(`GET: /play/${roomID}/join/${userID}`);
	await dbServer.getPlayRoom(roomID, { _id: 0, "state.status": 1, "players.ready": 1 }).then(playRoom => {
		if (playRoom.state.status === "waiting") {
			chatServer.joinRoom(roomID, userID).then(user => {
				dbServer.updatePlayRoom(roomID, {
					[`players.ready.${userID}`]: !!playRoom.players.ready[userID],
					[`players.names.${userID}`]: user.name
				}).then(data => {
					res.status(200).json({ success: true, ready: data.players.ready, names: data.players.names });
				})
			})
		} else {
			res.status(200).json({ success: false });
		}
	})
})
app.get('/play/:roomID/leave/:userID', async (req, res) => {
	const roomID = req.params.roomID;
	const userID = req.params.userID;
	console.log(`GET: /play/${roomID}/leave/${userID}`);
	await dbServer.getPlayRoom(roomID, { _id: 0, "state.status": 1, "roleInfo.deathList": 1 }).then(playRoom => {
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
		collection.find({}, { projection: { _id: 0, roomChatID: 1, hostUserID: 1, state: 1, "players.ready": 1 } }).toArray(function (err, result) {
			if (err) throw err;
			res.status(200).json(result)
		})
	})
})
app.get("/app/update", (req, res) => {
	console.log(`GET: /app/update`);
	res.status(200).json({
		version: "1.0.1b",
		status: "beta",
		releaseDate: "2019-01-22T04:54:03.327Z",
		changeLog: "Sửa lỗi và thêm tính năng mới!",
		downloadLink: "http://bit.ly/masoiapk"
	})
})
app.listen(process.env.PORT || 3001)
console.log(`MA SÓI BOT Server đang chạy tại cổng ${process.env.PORT || 3001}...`)