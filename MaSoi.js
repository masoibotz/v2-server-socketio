var schedule = require('node-schedule')
const stageTimeoutArr = {
    "readyToGame": 5 * 1000,
    "cupid": 15 * 1000,
    "night": 15 * 1000,
    "superwolf": 5 * 1000,
    "witch": 15 * 1000,
    "discuss": 15 * 1000,
    "vote": 10 * 1000,
    "voteResult": 5 * 1000,
    "lastWord": 10 * 1000,
    "voteYesNo": 5 * 1000,
    "voteYesNoResult": 5 * 1000
}
const nextStageArr = {
    "readyToGame": "cupid",
    "cupid": "night",
    "night": "superwolf",
    "superwolf": "witch",
    "witch": "discuss",
    "discuss": "vote",
    "vote": "voteResult",
    "voteResult": "lastWord",
    "lastWord": "voteYesNo",
    "voteYesNo": "voteYesNoResult",
    "voteYesNoResult": "cupid"
}
const roleName = {
    // PHE SÓI
    "-1": '🐺SÓI', //done
    "-2": '🐺BÁN SÓI', //done
    "-3": '🐺SÓI NGUYỀN',

    // PHE DÂN
    "1": '👁TIÊN TRI', //await 
    "2": '🛡BẢO VỆ', //done
    "3": '🏹THỢ SĂN', //done
    "4": '🎅DÂN', //self_done
    "5": '🧙‍PHÙ THỦY',
    "6": '👴GIÀ LÀNG', //done
    "7": '👼THẦN TÌNH YÊU',
    "8": '👽NGƯỜI HÓA SÓI', //await
    "9": '🧚‍THIÊN SỨ', //done
}
const defaultGameData = {
    logs: ["Tóm tắt game"],
    "state.day": 0,
    "state.deathList": [],
    "state.lastDeath": [],
    "roleInfo.oldManLive": 2,
    "roleInfo.witchSaveRemain": true,
    "roleInfo.witchKillRemain": true,
    "roleInfo.witchUseSave": false,
    "roleTarget.voteList": {},
    "roleTarget.victimID": "",
    "roleTarget.fireID": "",
    "roleTarget.superWolfVictimID": '',
}
var roomSchedule = [];
async function randomRole(chatServer, dbServer, roomID, preSetup, resCallback) {
    console.log(`Phòng ${roomID}: Đã SETUP XONG!!!`);
    await chatServer.getUserFromChatRoom(roomID).then(async (users) => {
        var readyUser = users.filter(u => {
            return u.custom_data.ready;
        })
        var setup = { "-3": [], "-2": [], "-1": [], "1": [], "2": [], "3": [], "4": [], "5": [], "6": [], "7": [], "8": [], "9": [] };
        var villagersID = [];
        var wolfsID = [];
        let preSet = preSetup ? preSetup : [-1, -1, -1, -1];
        readyUser.forEach((u, i) => {
            let roleID = preSet[i];
            if (roleID === -1) {
                wolfsID = [...wolfsID, u.id];
            } else {
                villagersID = [...villagersID, u.id];
            }
            setup[roleID] = [...setup[roleID], u.id];
        })
        resCallback({
            setup: setup,
            "players.villagersID": villagersID,
            "players.wolfsID": wolfsID,
        });
        // chatServer.sendAction(roomID, 'loadRole', res.value);
    }).catch(err => console.log(err))
}
// endGame missing......................................
async function goStage(chatServer, dbServer, roomID, stage, preSetup = []) {
    console.log(`>>>>>>>>>>>>>>>> Phòng ${roomID}: goStage ${stage} >>>>>>>>>>>>>>>>`);
    let endTimer = new Date(Date.now() + stageTimeoutArr[stage]);
    var updateData = { "state.dayStage": stage, "state.stageEnd": endTimer.toISOString() };

    var playRoom = {};
    await dbServer.getPlayRoomState(roomID).then(data => {
        playRoom = data;
    })

    switch (stage) {
        case 'readyToGame':
            roomSchedule[roomID] = null;
            //random role and reset room data
            await randomRole(chatServer, dbServer, roomID, preSetup, (resUpdateData) => {
                updateData = {
                    ...updateData, ...resUpdateData, ...defaultGameData, ...{
                        "state.status": "ingame"
                    }
                };
            });
            break;
        case 'cupid': //after_voteYesNoResult or after_readyToGame: Start NEW gameDAY
            // Start NEW gameDAY
            updateData = { ...updateData, ...{ "roleTarget.voteList": {}, "roleTarget.victimID": "", "state.day": playRoom.state.day + 1 } }
            // Thiên sứ thành dân vào ngày thứ 2
            if (playRoom.state.day + 1 == 2 && playRoom.setup[9].length > 0) {
                updateData = { ...updateData, ...{ "setup.9": [], "setup.4": [...playRoom.setup[4], ...playRoom.setup[9]] } }
            }
            // if (gameIsEnd(playRoom)) {
            //     endGame(playRoom.roomChatID);
            // }
            // kiểm tra có cupid không nếu không thì bỏ qua
            if (playRoom.setup[7].length == 0) {
                console.log(`<<<<<<<<<<<<<<<< Phòng ${roomID}: goStage ${stage} <<<<<<<<<<<<<<<<`);
                await dbServer.updatePlayRoom(roomID, updateData);
                goStage(chatServer, dbServer, roomID, nextStageArr[stage]);
                return;
            }
            break;
        case 'night': //after_cupid
            if (playRoom.state.day === 1 && playRoom.setup[7].length != 0 && playRoom.roleTarget.coupleList.length == 2) { // đã ghép đôi
                updateData = {
                    ...updateData, ...{
                        "players.coupleID": playRoom.roleTarget.coupleList,
                        "setup.4": [...playRoom.setup[4], playRoom.setup[7][0]],
                        "setup.7": [],
                        "roleTarget.coupleList": [],
                    }
                };
                if (getRole(playRoom.setup, playRoom.roleTarget.coupleList[0]) * getRole(playRoom.setup, playRoom.roleTarget.coupleList[1]) < 0) {
                    updateData = { ...updateData, ...{ "roleInfo.hasCouple": true } };
                }
            }
            break;
        case 'superwolf': //after_night
            var mostVotedUser = mostVoted(playRoom);
            updateData = { ...updateData, ...{ "roleTarget.victimID": mostVotedUser, "roleTarget.voteList": {} } };
            // kiểm tra có sói nguyền không nếu không thì bỏ qua
            if (playRoom.setup[-3].length == 0) {
                console.log(`<<<<<<<<<<<<<<<< Phòng ${roomID}: goStage ${stage} <<<<<<<<<<<<<<<<`);
                await dbServer.updatePlayRoom(roomID, updateData);
                goStage(chatServer, dbServer, roomID, nextStageArr[stage]);
                return;
            }
            break;
        case 'witch': //after_superwolf
            let superWolfVictimID = playRoom.roleTarget.superWolfVictimID;
            let victimID = playRoom.roleTarget.victimID;
            if (victimID != "" && victimID == superWolfVictimID) { //sói nguyền đã nguyền
                updateData = { ...updateData, ...{ "roleInfo.superWolfVictimID": superWolfVictimID, "roleTarget.victimID": "", logs: [...playRoom.logs, `🐺${superWolfVictimID} đã bị nguyền và theo phe sói!`] } };
                victimID = "";
                if (getRole(playRoom.setup, superWolfVictimID) > 0) {
                    updateData = {
                        ...updateData, ...{
                            "players.wolfsID": [...playRoom.players.wolfsID, superWolfVictimID],
                            "players.villagersID": deleteFromArray(playRoom.players.villagersID, superWolfVictimID)
                        }
                    }
                }
            }
            // kiểm tra có witch không nếu không thì bỏ qua
            if (playRoom.setup[5].length == 0 || ((victimID === "" || !playRoom.roleInfo.witchSaveRemain) && !playRoom.roleInfo.witchKillRemain)) {
                console.log(`<<<<<<<<<<<<<<<< Phòng ${roomID}: goStage ${stage} <<<<<<<<<<<<<<<<`);
                await dbServer.updatePlayRoom(roomID, updateData);
                goStage(chatServer, dbServer, roomID, nextStageArr[stage]);
                return;
            }
            break;
        case 'discuss': //after_witch
            if (playRoom.roleTarget.witchUseSave) {
                updateData = {
                    ...updateData, ...{
                        "roleTarget.victimID": "",
                        "roleTarget.witchUseSave": false,
                        "roleInfo.witchSaveRemain": false,
                        "logs": [...playRoom.logs, `🧙‍Phù thủy đã cứu *${playRoom.roleTarget.victimID}*`]
                    }
                };
                playRoom.roleTarget.victimID = "";
            }
            var deathArr = await KillVictim(chatServer, dbServer, playRoom, true);
            updateData = { ...updateData, ...{ "state.lastDeath": deathArr } };
            // if (gameIsEnd(playRoom)) {
            //     endGame(playRoom.roomChatID);
            // }
            break;
        case 'voteResult':// after_vote
            var mostVotedUser = mostVoted(playRoom);
            updateData = { ...updateData, ...{ "roleTarget.victimID": mostVotedUser } };
            break;
        case 'lastWord': //after_voteResult
            updateData = {
                ...updateData, ...{
                    "roleTarget.saveID": "",
                    "roleTarget.fireID": "",
                    "roleTarget.fireToKill": false,
                    "roleTarget.superWolfVictimID": "",
                    "state.lastSaveID": playRoom.roleTarget.saveID,
                    "state.lastFireID": playRoom.roleTarget.fireID
                }
            };
            // kiểm tra vote có bằng nhau không?
            if (playRoom.roleTarget.victimID === "") {
                console.log(`<<<<<<<<<<<<<<<< Phòng ${roomID}: goStage ${stage} <<<<<<<<<<<<<<<< EQUALS VOTE`);
                updateData = { ...updateData, ...{ "state.lastDeath": [] } };
                await dbServer.updatePlayRoom(roomID, updateData);
                goStage(chatServer, dbServer, roomID, "cupid");
                return;
            }
            break;
        case 'voteYesNoResult': // after_voteYesNo: END OF DAY
            if (playRoom.roleTarget.victimID != "" && voteYesNo(playRoom) > 0) { // kill > save
                var deathArr = await KillVictim(chatServer, dbServer, playRoom, false);
                updateData = { ...updateData, ...{ "state.lastDeath": deathArr } };
            }
            break;
    }
    await dbServer.updatePlayRoom(roomID, updateData, (res) => {
        console.log(`<<<<<<<<<<<<<<<< Phòng ${roomID}: goStage ${stage} <<<<<<<<<<<<<<<<`);
        let updateFlags = `goStage${stage}`;
        if (stage === 'readyToGame' || stage === 'discuss') {
            updateFlags = "loadRole";
        }
        chatServer.sendAction(roomID, updateFlags, res.value);

        //next stage
        const nextStage = nextStageArr[stage];
        endTimer = new Date(Date.now() + stageTimeoutArr[stage]);
        if (roomSchedule[roomID] === 'ended') {
            console.log("++++++++++++++++++++ DELAYED SCHEDULE +++++++++++++++++++++++++");
            roomSchedule[roomID] = null;
            return;
        }
        roomSchedule[roomID] = schedule.scheduleJob(endTimer, () => {
            goStage(chatServer, dbServer, roomID, nextStage);
        })

    })
}
function endGame(roomID, dbServer, chatServer) {
    roomSchedule[roomID].cancel();
    roomSchedule[roomID] = 'ended';
    // setTimeout(() => { roomSchedule[roomID] = null; }, 5000);
    let updateData = { ...defaultGameData, ...{ "state.status": "waiting" } }
    dbServer.updatePlayRoom(roomID, updateData, (res) => {
        chatServer.sendAction(roomID, 'endGame', res.value);
    })
}
//done
async function killAction(dbServer, playRoom, victimID) {
    // không giết ai, thằng bị giết out rồi, thằng cần giết chết rồi
    if (victimID == "" || !isAlive(playRoom, victimID)) {
        return;
    }
    var updateData = {};
    var victimRole = getRole(playRoom.setup, victimID);
    if (victimRole == 9 && playRoom.state.day === 1) { //người chết là thiên sứ
        updateData = { "roleInfo.angelWin": true }
    }
    if (victimRole == 5) { //người chết là phù thủy
        updateData = {
            "roleInfo.witchKillRemain": false,
            "roleInfo.witchSaveRemain": false
        }
    }
    if (victimRole == 2) { //người chết là bảo vệ
        updateData = {
            "roleTarget.saveID": '',
        }
    }
    // kill action MAIN
    playRoom.state.deathList = [...playRoom.state.deathList, victimID];
    console.log("-------- DEATH LIST: ", playRoom.state.deathList);
    updateData = { ...updateData, ...{ "state.deathList": playRoom.state.deathList } }
    if (victimRole == -1 || victimRole == -3 || victimID == playRoom.roleInfo.superWolfVictimID) { // giết sói
        playRoom.players.wolfsID = deleteFromArray(playRoom.players.wolfsID, victimID);
        updateData = { ...updateData, ...{ "players.wolfsID": playRoom.players.wolfsID } }
    } else { //  giết dân
        playRoom.players.villagersID = deleteFromArray(playRoom.players.villagersID, victimID);
        updateData = { ...updateData, ...{ "players.villagersID": playRoom.players.villagersID } }
    }
    await dbServer.updatePlayRoom(playRoom.roomChatID, updateData);

    if (victimRole == 3) { //người chết là thợ săn
        await killAction(dbServer, playRoom, playRoom.roleTarget.fireID);
        await cupidKill(dbServer, playRoom, playRoom.roleTarget.fireID);
    }
}
//done
async function cupidKill(dbServer, playRoom, victimID) {
    if (playRoom.players.coupleID && playRoom.players.coupleID.indexOf(victimID) != -1) { //là 1 người trong cặp đôi
        playRoom.players.coupleID.forEach(async (userID) => {
            if (victimID != userID && isAlive(playRoom, userID)) {
                await killAction(dbServer, playRoom, userID);
            }
        });
        await dbServer.updatePlayRoom(playRoom.roomChatID, { "roleInfo.hasCouple": false });
    }
}
//done
async function fireKillAction(dbServer, playRoom) {

}
//missing thông báo cắn mà không chết
async function KillVictim(chatServer, dbServer, playRoom, isNight) {
    var dieArr = [];
    let victimID = playRoom.roleTarget.victimID;
    let saveID = playRoom.roleTarget.saveID;
    let fireID = playRoom.roleTarget.fireID;
    let hunterID = playRoom.setup[3].length > 0 ? playRoom.setup[3][0] : '';
    let victimRole = getRole(playRoom.setup, victimID);
    let logs = [];
    let updateData = {};
    // var isNight = Object.keys(nextStageArr).indexOf(playRoom.state.dayStage) <= Object.keys(nextStageArr).indexOf('discuss') ? true : false;

    // THỢ SĂN
    if (hunterID != '' && fireID != "" && playRoom.roleTarget.fireToKill && isNight) { // chủ động
        let deathIDs = [];
        let fireVictimRole = getRole(playRoom.setup, fireID);
        updateData = {
            // bắn xong, dù đúng hay sai bạn về dân nhé :v
            "setup.3": deleteFromArray(playRoom.setup["3"], hunterID),
            "setup.4": [...playRoom.setup["4"], hunterID],
            "roleInfo.hunterID": "",
            "roleTarget.fireID": "",
            "roleTarget.fireToKill": false
        }
        if (fireVictimRole > 0) { // bắn trúng dân làng (giết thợ săn => thợ săn tự ghim nạn nhân)
            await killAction(dbServer, playRoom, hunterID);
            await cupidKill(dbServer, playRoom, hunterID);
            logs.push(`🏹Thợ săn đã bắn ${roleName[getRole(playRoom.setup, fireID)]} *${fireID}*\n⚔️Thợ săn phải đền mạng!`);
            deathIDs = [hunterID, fireID];
        } else { //chỉ giết nạn nhân
            await killAction(dbServer, playRoom, fireID);
            await cupidKill(dbServer, playRoom, fireID);
            logs.push(`🏹Thợ săn đã bắn chết sói *${fireID}*`);
            deathIDs = [fireID];
        }
        deathIDs.forEach(deathID => {
            if (dieArr.indexOf(deathID) == -1) {
                dieArr.push(deathID);
            }
        });
    }
    // BẢO VỆ ĐÚNG
    if (victimID != "" && victimID == saveID && isNight) {
        updateData = { ...updateData, ...{ "roleTarget.victimID": "" } };
        victimID = "";
    }
    // Cắn trúng BÁN SÓI
    if (victimID != "" && victimRole == -2 && isNight) {
        updateData = {
            ...updateData, ...{
                "roleTarget.victimID": "",
                "players.wolfsID": [...playRoom.players.wolfsID, victimID],
                "players.villagersID": deleteFromArray(playRoom.players.villagersID, victimID),
                "setup.-2": deleteFromArray(playRoom.setup[-2], victimID),
                "setup.-1": [...playRoom.setup[-1], victimID],
            }
        };
        logs.push(`☪ BÁN SÓI *${victimID}* trở thành 🐺SÓI`);
        victimID = "";
    }
    // GIÀ LÀNG
    if (victimID!="" && victimRole == 6) {
        if (isNight && playRoom.roleInfo.oldManLive - 1 > 0) {
            // còn 2 mạng
            updateData = { ...updateData, ...{ "roleInfo.oldManLive": playRoom.roleInfo.oldManLive - 1 } };
            logs.push(`⚠️ GIÀ LÀNG *${victimID}* đã bị cắn còn 1 mạng!`);
            victimID = "";
        } else {
            // bị treo cổ hoặc hết mạng
            updateData = { ...updateData, ...{ "roleInfo.oldManLive": 0 } };
        }
    }
    // SÓI CẮN / BỊ TREO CỔ
    if (victimID != "") {
        await killAction(dbServer, playRoom, victimID);
        await cupidKill(dbServer, playRoom, victimID);
        dieArr.push(victimID);
        logs.push(`⚔️ *${victimID}* là ${roleName[victimRole]} đã bị ${isNight ? 'SÓI cắn' : 'treo cổ'}!`);
        if (isNight && victimRole == 3) { //người chết là thợ săn
            let fireID = playRoom.roleTarget.fireID
            if (fireID != "") { //thợ săn không bắn lên trời
                if (dieArr.indexOf(fireID) == -1) {
                    dieArr.push(fireID);
                }
                logs.push(`🏹Thợ săn ghim (bị động) chết ${roleName[getRole(playRoom.setup, fireID)]} *${fireID}*`);
            }
        }
    }
    // PHÙ THỦY giết
    if (isNight && playRoom.roleTarget.witchKillID != "") {
        let witchKillID = playRoom.roleTarget.witchKillID;
        if (witchKillID != '' && playRoom.roleInfo.witchKillRemain) {
            await killAction(dbServer, playRoom, witchKillID);
            await cupidKill(dbServer, playRoom, witchKillID);
            updateData = { ...updateData, ...{ "roleTarget.witchKillID": "", "roleInfo.witchKillRemain": false } }
            if (dieArr.indexOf(witchKillID) == -1) {
                dieArr.push(witchKillID);
            }
            logs.push(`🧙‍Phù thủy đã giết ${roleName[getRole(playRoom.setup, witchKillID)]} *${witchKillID}*`);
        }
    }

    // CẶP ĐÔI CHẾT:
    dieArr.every(dieID => {
        let indexOfFirst = playRoom.players.coupleID.indexOf(dieID);
        if (indexOfFirst != -1) { // có 1 trong 2 người chết
            let indexOfSecond = indexOfFirst == 0 ? 1 : 0;
            let secondID = playRoom.players.coupleID[indexOfSecond]; // ID người còn lại
            if (dieArr.indexOf(secondID) == -1) { // người còn lại chưa chết
                dieArr.push(secondID);
            }
            logs.push(`💘Do là cặp đôi, ${roleName[getRole(playRoom.setup, secondID)]} *${secondID}* cũng chết theo`);
        }
    });
    // update logs
    updateData = {
        ...updateData, ...{
            logs: [...playRoom.logs, ...logs]
        }
    }
    // kiểm tra updateData có rỗng không?
    if (!(Object.keys(updateData).length === 0 && updateData.constructor === Object)) {
        await dbServer.updatePlayRoom(playRoom.roomChatID, updateData);
    }
    return dieArr;
}
function isAlive(playRoom, userID) {
    return playRoom.state.deathList.indexOf(userID) == -1;
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
function deleteFromArray(array, itemToFind) {
    var indexOfItem = array.indexOf(itemToFind);
    return [...array.slice(0, indexOfItem), ...array.slice(indexOfItem + 1)]
}
function mostVoted(playRoom) {
    let maxVoted = -1;
    let mostVotedUserID = "";
    let voted = {};
    Object.keys(playRoom.roleTarget.voteList).forEach((user) => {
        let beVotedUser = playRoom.roleTarget.voteList[user];
        if (voted[beVotedUser]) {
            voted[beVotedUser]++;
        } else {
            voted[beVotedUser] = 1;
        }
        if (voted[beVotedUser] > maxVoted) {
            maxVoted = voted[beVotedUser];
            mostVotedUserID = beVotedUser;
        } else if (voted[beVotedUser] == maxVoted) {
            mostVotedUserID = "";
        }
    });
    return mostVotedUserID;
}
function voteYesNo(playRoom) {
    var count = 0;
    Object.keys(playRoom.roleTarget.voteList).forEach((user) => {
        count += playRoom.roleTarget.voteList[user] == playRoom.roleTarget.victimID ? 1 : 0;
    });
    return count;
}
function gameIsEnd(playRoom) {
    console.log(`Phòng ${playRoom.roomChatID}: Game check: ${playRoom.players.wolfsID.length} SÓI / ${playRoom.players.villagersID.length} DÂN `);
    if (this.thienSuWin) {
        // thiên sứ thắng
        return 9;
    } else if (playRoom.hasCouple && playRoom.players.wolfsID.length + playRoom.players.villagersID.length == 2 && playRoom.players.wolfsID.length > 0) {
        // cặp đôi thắng
        return 3;
    } else if (playRoom.players.wolfsID.length >= playRoom.players.villagersID.length) {
        //SÓI THẮNG
        return -1;
    } else if (playRoom.players.wolfsID.length === 0) {
        //DÂN THẮNG
        return 1;
    } else {
        return 0;
    }
}
module.exports = {
    randomRole: randomRole,
    goStage: goStage,
    endGame: endGame,
}