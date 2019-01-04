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
	await goStage(chatServer, dbServer, roomID, 'readyToGame', preSetupArr);
	res.status(200).json({ success: true });
})
app.get('/play/:roomID/do', (req, res) => {
	const updateData = JSON.parse(req.query.action);
	const roomID = req.params.roomID;
	if (updateData.roleAction && updateData.roleAction.seeID) {
		res.status(200).json({ success: true, seeRole: -1 });
	} else {
		dbServer.updatePlayRoom(roomID, updateData);
		res.status(200).json({ success: true });
	}
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
		res.status(200).json(users);
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