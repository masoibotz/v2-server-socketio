var schedule = require('node-schedule')
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
function randomRole(chatServer, dbServer, roomID) {
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
			chatServer.sendAction(roomID, 'loadRole', res.value);
		})
	}).catch(err => console.log(err))
}
function goStage(chatServer, dbServer, roomID, stage) {
	let endTimer = new Date(Date.now() + stageTimeoutArr[stage]);
	dbServer.updatePlayRoom(roomID, { dayStage: stage, stageTimeout: endTimer.toISOString() }, (res) => {
		console.log(`Phòng ${roomID}: Stage ${stage}`);
		chatServer.sendAction(roomID, `goStage${stage}`, res.value);

		//next stage
		const nextStage = nextStageArr[stage];
		if (res.status != 'ending') {
			schedule.scheduleJob(endTimer, () => {
				goStage(chatServer, dbServer, roomID, nextStage);
			})
		};
	})
}
function endGame(){
    schedule.cancel();
}

module.exports = {
    randomRole: randomRole,
    goStage: goStage,
    endGame: endGame
}