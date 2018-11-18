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
const roleName = {
    // PHE SÓI
    "-1": '🐺SÓI',
    "-2": '🐺BÁN SÓI',
    "-3": '🐺SÓI NGUYỀN',

    // PHE DÂN
    "1": '👁TIÊN TRI',
    "2": '🛡BẢO VỆ',
    "3": '🏹THỢ SĂN',
    "4": '🎅DÂN',
    "5": '🧙‍PHÙ THỦY',
    "6": '👴GIÀ LÀNG',
    "7": '👼THẦN TÌNH YÊU',
    "8": '👽NGƯỜI HÓA SÓI',
    "9": '🧚‍THIÊN SỨ',
}
var roomSchedule = [];
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
            roomSchedule[roomID] = schedule.scheduleJob(endTimer, () => {
                goStage(chatServer, dbServer, roomID, nextStage);
            })
        };
    })
}
function endGame(roomID) {
    roomSchedule[roomID].cancel();
}
function killAction(playRoom, victimID) {
    // không giết ai, thằng bị giết out rồi, thằng cần giết chết rồi
    // if (victimID == "" || !this.alivePlayer[this.players[victimID].joinID]) {
    //     return;
    // }
    var victimRole = getRole(playRoom.setup, victimID);
    if (victimRole == 9) { //người chết là thiên sứ
        // this.thienSuWin = true;
    }
    if (victimRole == 5) { //người chết là phù thủy
        // this.witchID = undefined;
        // this.witchKillRemain = false;
        // this.witchSaveRemain = false;
    }
    if (victimRole == -3) { //người chết là sói nguyền
        // this.soiNguyen = false;
        // this.soiNguyenID = undefined;
    }
    if (victimRole == 2) { //người chết là bảo vệ
        // this.saveID = -1;
    }

    // kill action MAIN
    // this.alivePlayer[this.players[victimID].joinID] = false;
    if (victimRole == -1 || victimRole == -3 || victimID == playRoom.roleAction.superWolfVictimID) {
        // this.wolfsCount--;
    } else {
        // this.villagersCount--;
    }

    if (victimRole == 3) { //người chết là thợ săn
        this.killAction(this.fireID);
        this.cupidKill(this.fireID);
    }
}
function cupidKill(playRoom, victimID) {
    // if (this.cupidsID.indexOf(this.players[victimID].joinID) != -1) { //là 1 người trong cặp đôi
    //     this.cupidsID.forEach((userID) => {
    //         if (victimID != userID && this.alivePlayer[userID]) {
    //             this.killAction(userID);
    //         }
    //     });
    //     this.cupidTeam = false;
    // }
}
function kill(playRoom) {
    var victimID = playRoom.roleAction.victimID;
    var saveID = playRoom.roleAction.saveID;
    var superWolfVictimID = playRoom.roleAction.superWolfVictimID;
    var isNight = playRoom.dayStage === 'night' ? true : false;
    console.log(`$ > KILL ${victimID} > SAVE ${saveID} !!!`);
    if (victimID != "") {
        if (!isNight || (isNight && victimID != saveID)) { // là ban ngày hoặc ban đêm bảo vệ sai
            if (getRole(playRoom.setup, victimID) === -2 && isNight) { //là BÁN SÓI
                // this.wolfsID.push(victimID);
                // this.villagersID.splice(this.villagersID.indexOf(victimID), 1);
                return false;
            }
            if (getRole(playRoom.setup, victimID) === 6) { //là Già làng
                if (isNight) {
                    let oldManLive = playRoom.roleAction;
                    oldManLive--;
                    // update DB oldManLive ///////////////////////////////////
                    if (oldManLive > 0) { // còn 1 mạng
                        return false;
                    }
                } else {
                    oldManLive = 0;
                    // update DB oldManLive //////////////////////////////////
                }
            }
            if (superWolfVictimID != "" && victimID == superWolfVictimID && isNight) { //là kẻ bị sói nguyền
                // nguyenAction();
                return false;
            }
            killAction(playRoom, victimID);
            cupidKill(playRoom, victimID);
            return true;
        } else { // bảo vệ thành công 
            return false;
        }
    } else { // sói không cắn ai
        return false;
    }
}
function getRole(setup, userID) {
    var userRole = 0;
    Object.keys(setup).every((roleCode) => {
        if (setup[roleCode].indexOf(userID) != -1) {
            userRole = roleCode;
            return false;
        }
        return true;
    })
    return userRole;
}
function findDeathUser(chatServer, dbServer, roomID) {
    var dieArr = [];
    var playRoom;
    dbServer.getPlayRoomState(roomID).then(data => {
        playRoom = data;
    })
    let victimID = playRoom.roleAction.victimID;
    // SÓI CẮN
    if (!witchSaved && kill()) {
        dieArr.push(victimID);
        newLog(`⚔️ *${victimID}* là ${roleName[getRole(playRoom.setup, victimID)]} đã bị SÓI cắn!`);
        console.log(`$ ROOM ${userRoom + 1} > ${deathTxt} DIED!`);
        if (getRole(playRoom.setup, victimID) === 3) { //người chết là thợ săn
            let fireID = playRoom.roleAction.fireID
            if (fireID != "") { //thợ săn không bắn lên trời
                if (dieArr.indexOf(fireID) == -1) {
                    dieArr.push(fireID);
                }
                // newLog(`🏹Thợ săn chết đã ghim ${roleName[getRole(playRoom.setup, fireID)]} *${fireID}*`);
                console.log(`$ ROOM ${userRoom + 1} > ${deathFireTxt} DIED!`);
            }
        }
    }
    return dieArr;
}

module.exports = {
    randomRole: randomRole,
    goStage: goStage,
    endGame: endGame,
    findDeathUser: findDeathUser
}