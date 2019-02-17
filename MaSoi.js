var schedule = require('node-schedule')
const { defaultGameData, nextStageArr, phe, roleName, shuffleArray, stageTimeoutArr, roleSetup, random } = require('./Utils');
const stageActionText = require("./clientUtils");

var roomSchedule = [];
function randomRole(chatServer, dbServer, playRoom, roomID, customSetup) {
    return chatServer.getUserFromChatRoom(roomID).then(users => {
        return users.filter(u => {
            return playRoom.players.ready[u.id];
        });
    }).then(readyUser => {
        console.log(`Phòng ${roomID}: SETUP cho ${readyUser.length} NGƯỜI`);
        if (readyUser.length <= 3 || readyUser.length >= 12) {
            endGame(roomID, dbServer, chatServer, playRoom, 0);
            return;
        }

        var setup = { "-3": [], "-2": [], "-1": [], "1": [], "2": [], "3": [], "4": [], "5": [], "6": [], "7": [], "8": [], "9": [] };
        var allID = [], villagersID = [], wolfsID = [], playersName = {};
        var preSet;
        if (customSetup.length > 0) {
            preSet = customSetup;
        } else {
            let countPlayer = readyUser.length;
            let numOfSetup = roleSetup[countPlayer] ? roleSetup[countPlayer].length : 0;
            if (numOfSetup > 0) {
                preSet = roleSetup[countPlayer][random(0, numOfSetup - 1)];
            }
        }
        preSet = shuffleArray(preSet);
        readyUser.forEach((u, i) => {
            let roleID = preSet[i] ? preSet[i] : 4;
            if (roleID === -1 || roleID === -3) {
                wolfsID = [...wolfsID, u.id];
            } else {
                villagersID = [...villagersID, u.id];
            }
            allID = [...allID, u.id];
            playersName[u.id] = u.name;
            setup[roleID] = [...setup[roleID], u.id];
        })
        return ({
            setup: setup,
            "players.names": playersName,
            "players.allID": allID,
            "players.villagersID": villagersID,
            "players.wolfsID": wolfsID,
        });
    });
}
// MAIN flow
async function goStage(chatServer, dbServer, roomID, stage, preSetup = [], autoNextStage = true) {
    console.log(`>>>>>>>>>>>>>>>> Phòng ${roomID}: goStage ${stage} >>>>>>>>>>>>>>>>`);
    // get playRoom from DB
    var playRoom = {}; await dbServer.getPlayRoom(roomID).then(data => { playRoom = data; })
    // init
    var endTimer = new Date(Date.now() + stageTimeoutArr[stage]);
    var updateData = { "state.dayStage": stage, "state.stageEnd": endTimer.toISOString() };
    var names = playRoom.players.names;
    switch (stage) {
        case 'readyToGame':
            roomSchedule[roomID] = null;
            //random role and reset room data
            await randomRole(chatServer, dbServer, playRoom, roomID, preSetup).then(randomData => {
                updateData = {
                    ...updateData, ...randomData, ...defaultGameData, ...{
                        logs: [],
                        "state.status": "ingame"
                    }
                };
            });
            break;
        case 'cupid': //after_voteYesNoResult or after_readyToGame: Start NEW gameDAY
            // Start NEW gameDAY
            updateData = {
                ...updateData, ...{
                    "roleTarget.voteList": {},
                    "roleInfo.victimID": "", "state.day": playRoom.state.day + 1,
                    logs: [...playRoom.logs, `ĐÊM THỨ ${playRoom.state.day + 1}`]
                }
            }
            // Thiên sứ thành dân vào ngày thứ 2
            if (playRoom.state.day + 1 == 2 && playRoom.setup[9].length > 0) {
                updateData = { ...updateData, ...{ "setup.9": [], "setup.4": [...playRoom.setup[4], ...playRoom.setup[9]] } }
            }
            // kiểm tra có cupid không nếu không thì bỏ qua
            if (playRoom.setup[7].length == 0) {
                console.log(`<<<<<<<<<<<<<<<< Phòng ${roomID}: goStage ${stage} <<<<<<<<<<<<<<<<`);
                await dbServer.updatePlayRoom(roomID, updateData);
                await goStage(chatServer, dbServer, roomID, nextStageArr[stage], [], autoNextStage);
                return;
            }
            break;
        case 'night': //after_cupid
            if (playRoom.setup[7].length != 0 && playRoom.roleTarget.coupleList.length == 2) { // đã ghép đôi
                let coupleID = playRoom.roleTarget.coupleList;
                updateData = {
                    ...updateData, ...{
                        "players.coupleID": playRoom.roleTarget.coupleList,
                        "setup.4": [...playRoom.setup[4], playRoom.setup[7][0]],
                        "setup.7": [],
                        "roleTarget.coupleList": [],
                        logs: [...playRoom.logs, `Ghép đôi ${names[coupleID[0]]} với ${names[coupleID[1]]}`]
                    }
                };
                if (getRole(playRoom.setup, playRoom.roleTarget.coupleList[0]) * getRole(playRoom.setup, playRoom.roleTarget.coupleList[1]) < 0) {
                    updateData = { ...updateData, ...{ "roleInfo.hasCouple": true } };
                }
            }
            break;
        case 'superwolf': //after_night
            var mostVotedUser = mostVoted(playRoom);
            let newlog = [];
            playRoom.roleTarget.seeID ? newlog = [...newlog, `Tiên tri soi ${names[playRoom.roleTarget.seeID]}`] : [];
            playRoom.roleTarget.saveID ? newlog = [...newlog, `Bảo vệ cho ${names[playRoom.roleTarget.saveID]}`] : [];
            updateData = {
                ...updateData, ...{
                    "roleInfo.victimID": mostVotedUser,
                    "roleTarget.voteList": {},
                    logs: [...playRoom.logs, ...newlog]
                }
            };
            // kiểm tra có sói nguyền không nếu không thì bỏ qua
            if (playRoom.setup[-3].length == 0) {
                console.log(`<<<<<<<<<<<<<<<< Phòng ${roomID}: goStage ${stage} <<<<<<<<<<<<<<<<`);
                await dbServer.updatePlayRoom(roomID, updateData);
                await goStage(chatServer, dbServer, roomID, nextStageArr[stage], [], autoNextStage);
                return;
            }
            break;
        case 'witch': //after_superwolf
            let superWolfVictimID = playRoom.roleTarget.superWolfVictimID;
            let victimID = playRoom.roleInfo.victimID;
            if (victimID != "" && victimID == superWolfVictimID) { //sói nguyền đã nguyền
                updateData = {
                    ...updateData, ...{
                        "roleInfo.superWolfVictimID": superWolfVictimID, "roleInfo.victimID": "",
                        logs: [...playRoom.logs, `🐺${names[superWolfVictimID]} đã bị nguyền và theo phe sói!`]
                    }
                };
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
                await goStage(chatServer, dbServer, roomID, nextStageArr[stage], [], autoNextStage);
                return;
            }
            break;
        case 'discuss': //after_witch
            if (playRoom.roleTarget.witchUseSave) {
                updateData = {
                    ...updateData, ...{
                        "roleInfo.victimID": "",
                        "roleTarget.witchUseSave": false,
                        "roleInfo.witchSaveRemain": false,
                        "roleInfo.lastSaveID": playRoom.roleTarget.saveID,
                        "roleInfo.lastFireID": playRoom.roleTarget.fireID,
                        "logs": [...playRoom.logs, `🧙‍Phù thủy đã cứu *${playRoom.roleInfo.victimID}*`]
                    }
                };
                playRoom.roleInfo.victimID = "";
            }
            var deathArr = await KillVictim(chatServer, dbServer, playRoom, true, (killUpdateData) => {
                updateData = { ...updateData, ...killUpdateData };
            });
            updateData = { ...updateData, ...{ "roleInfo.lastDeath": deathArr } };
            break;
        case 'voteResult':// after_vote
            var mostVotedUser = mostVoted(playRoom);
            updateData = { ...updateData, ...{ "roleInfo.victimID": mostVotedUser } };
            break;
        case 'lastWord': //after_voteResult
            updateData = {
                ...updateData, ...{
                    "roleTarget.saveID": "",
                    "roleTarget.fireID": "",
                    "roleTarget.seeID": "",
                    "roleTarget.fireToKill": false,
                    "roleTarget.superWolfVictimID": ""
                }
            };
            // kiểm tra vote có bằng nhau không?
            if (playRoom.roleInfo.victimID === "") {
                console.log(`<<<<<<<<<<<<<<<< Phòng ${roomID}: goStage ${stage} <<<<<<<<<<<<<<<< EQUALS VOTE`);
                updateData = { ...updateData, ...{ "roleInfo.lastDeath": [] } };
                await dbServer.updatePlayRoom(roomID, updateData);
                await goStage(chatServer, dbServer, roomID, "cupid", [], autoNextStage);
                return;
            }
            break;
        case 'voteYesNoResult': // after_voteYesNo: END OF DAY
            if (playRoom.roleInfo.victimID != "" && voteYesNo(playRoom) > 0) { // kill > save
                var deathArr = await KillVictim(chatServer, dbServer, playRoom, false, (killUpdateData) => {
                    updateData = { ...updateData, ...killUpdateData };
                });
                updateData = { ...updateData, ...{ "roleInfo.lastDeath": deathArr } };
            }
            break;
    }
    await dbServer.updatePlayRoom(roomID, updateData, (playRoom) => {
        // if (!autoNextStage) return;
        let roleWin = gameIsEnd(playRoom);
        if (roleWin) {
            endGame(playRoom.roomChatID, dbServer, chatServer, playRoom, roleWin);
            return;
        }
        console.log(`<<<<<<<<<<<<<<<< Phòng ${roomID}: goStage ${stage} <<<<<<<<<<<<<<<<`);
        let updateFlags = `${stage}`;
        if (stage === 'readyToGame' || stage === 'discuss') {
            updateFlags = "loadRole";
        }
        var actionText = stageActionText(playRoom);
        chatServer.sendAction(roomID, playRoom, updateFlags, actionText);
        if (!autoNextStage) return;

        //next stage
        if (stage != "endGame") {
            const nextStage = nextStageArr[stage];
            endTimer = new Date(Date.now() + stageTimeoutArr[stage]);
            if (roomSchedule[roomID] === 'ended') {
                console.log("++++++++++++++++++++ DELAYED SCHEDULE +++++++++++++++++++++++++");
                return;
            }
            roomSchedule[roomID] = schedule.scheduleJob(endTimer, () => {
                goStage(chatServer, dbServer, roomID, nextStage);
            })
        }
    })
}
function endGame(roomID, dbServer, chatServer, playRoom, roleWin) {
    if (roomSchedule[roomID]) {
        roomSchedule[roomID].cancel();
        roomSchedule[roomID] = 'ended';
    }
    var updateData = { ...defaultGameData, ...{ "state.status": "waiting", "state.dayStage": "endGame", roleWin: roleWin } }
    var updateReady = {};
    Object.keys(playRoom.players.ready).filter((uid) => playRoom.players.ready[uid]).forEach((uid) => {
        updateReady = {
            ...updateReady, ...{
                [`players.ready.${uid}`]: false
            }
        };
    })
    console.log("UPDATE READY", updateReady);
    updateData = { ...updateData, ...updateReady };

    // setTimeout(() => { roomSchedule[roomID] = null; }, 5000);

    dbServer.updatePlayRoom(roomID, updateData, (playRoom) => {
        // chatServer.sendMessage(roomID, ["TRÒ CHƠI ĐÃ KẾT THÚC", `${phe[roleWin]} thắng`, ...playRoom.logs].join('\n'));
        chatServer.sendAction(roomID, playRoom, 'endGame', ["TRÒ CHƠI ĐÃ KẾT THÚC", `${phe[roleWin]} thắng`, ...playRoom.logs].join('\n'));
    })
}
//done
async function killAction(dbServer, playRoom, victimID, updateDataCallback = () => { }) {
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
    playRoom.roleInfo.deathList = [...playRoom.roleInfo.deathList, victimID];
    console.log("-------- DEATH LIST: ", playRoom.roleInfo.deathList);
    updateData = { ...updateData, ...{ "roleInfo.deathList": playRoom.roleInfo.deathList } }
    if (victimRole == -1 || victimRole == -3 || victimID == playRoom.roleInfo.superWolfVictimID) { // giết sói
        playRoom.players.wolfsID = deleteFromArray(playRoom.players.wolfsID, victimID);
        updateData = { ...updateData, ...{ "players.wolfsID": playRoom.players.wolfsID } }
    } else { //  giết dân
        playRoom.players.villagersID = deleteFromArray(playRoom.players.villagersID, victimID);
        updateData = { ...updateData, ...{ "players.villagersID": playRoom.players.villagersID } }
    }
    await dbServer.updatePlayRoom(playRoom.roomChatID, updateData);

    if (victimRole == 3) { //người chết là thợ săn
        await killAction(dbServer, playRoom, playRoom.roleTarget.fireID, (killActionUpdateData) => {
            Object.assign(updateData, killActionUpdateData);
        });
        await cupidKill(dbServer, playRoom, playRoom.roleTarget.fireID, (cupidKillUpdateData) => {
            Object.assign(updateData, cupidKillUpdateData);
        });
    }
    updateDataCallback(updateData);
}
//done
async function cupidKill(dbServer, playRoom, victimID, updateDataCallback = () => { }) {
    let updateData = {};
    if (playRoom.players.coupleID && playRoom.players.coupleID.indexOf(victimID) != -1) { //là 1 người trong cặp đôi
        playRoom.players.coupleID.forEach(async (userID) => {
            if (victimID != userID && isAlive(playRoom, userID)) {
                await killAction(dbServer, playRoom, userID, (killActionUpdateData) => {
                    Object.assign(updateData, killActionUpdateData);
                });
            }
        });
        updateData = { ...updateData, ...{ "roleInfo.hasCouple": false } };
        updateDataCallback(updateData);
        await dbServer.updatePlayRoom(playRoom.roomChatID, { "roleInfo.hasCouple": false });
    }
}
//done
async function fireKillAction(dbServer, playRoom) {

}
//missing thông báo cắn mà không chết
async function KillVictim(chatServer, dbServer, playRoom, isNight, updateDataCallback) {
    var dieArr = [];
    let victimID = playRoom.roleInfo.victimID;
    let saveID = playRoom.roleTarget.saveID;
    let fireID = playRoom.roleTarget.fireID;
    let hunterID = playRoom.setup[3].length > 0 ? playRoom.setup[3][0] : '';
    let victimRole = getRole(playRoom.setup, victimID);
    let logs = [];
    let updateData = {};
    let names = playRoom.players.names;
    // var isNight = Object.keys(nextStageArr).indexOf(playRoom.state.dayStage) <= Object.keys(nextStageArr).indexOf('discuss') ? true : false;

    // THỢ SĂN
    if (hunterID != '' && fireID != "" && playRoom.roleTarget.fireToKill && isNight) { // chủ động
        let deathIDs = [];
        let fireVictimRole = getRole(playRoom.setup, fireID);
        updateData = {
            // bắn xong, dù đúng hay sai bạn về dân nhé :v
            "setup.3": deleteFromArray(playRoom.setup["3"], hunterID),
            "setup.4": [...playRoom.setup["4"], hunterID],
            "roleTarget.fireID": "",
            "roleTarget.fireToKill": false
        }
        if (fireVictimRole > 0) { // bắn trúng dân làng (giết thợ săn => thợ săn tự ghim nạn nhân)
            await killAction(dbServer, playRoom, hunterID);
            await cupidKill(dbServer, playRoom, hunterID);
            logs.push(`🏹Thợ săn đã bắn ${roleName[getRole(playRoom.setup, fireID)]} *${names[fireID]}*\n⚔️Thợ săn phải đền mạng!`);
            deathIDs = [hunterID, fireID];
        } else { //chỉ giết nạn nhân
            await killAction(dbServer, playRoom, fireID);
            await cupidKill(dbServer, playRoom, fireID);
            logs.push(`🏹Thợ săn đã bắn chết sói *${names[fireID]}*`);
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
        updateData = { ...updateData, ...{ "roleInfo.victimID": "" } };
        victimID = "";
    }
    // Cắn trúng BÁN SÓI
    if (victimID != "" && victimRole == -2 && isNight) {
        updateData = {
            ...updateData, ...{
                "roleInfo.victimID": "",
                "players.wolfsID": [...playRoom.players.wolfsID, victimID],
                "players.villagersID": deleteFromArray(playRoom.players.villagersID, victimID),
                "setup.-2": deleteFromArray(playRoom.setup[-2], victimID),
                "setup.-1": [...playRoom.setup[-1], victimID],
            }
        };
        logs.push(`☪ BÁN SÓI *${names[victimID]}* trở thành 🐺SÓI`);
        victimID = "";
    }
    // GIÀ LÀNG
    if (victimID != "" && victimRole == 6) {
        if (isNight && playRoom.roleInfo.oldManLive - 1 > 0) {
            // còn 2 mạng
            updateData = { ...updateData, ...{ "roleInfo.oldManLive": playRoom.roleInfo.oldManLive - 1 } };
            logs.push(`⚠️ GIÀ LÀNG *${names[victimID]}* đã bị cắn còn 1 mạng!`);
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
        logs.push(`⚔️ *${names[victimID]}* là ${roleName[victimRole]} đã bị ${isNight ? 'SÓI cắn' : 'treo cổ'}!`);
        if (isNight && victimRole == 3) { //người chết là thợ săn
            let fireID = playRoom.roleTarget.fireID
            if (fireID != "") { //thợ săn không bắn lên trời
                if (dieArr.indexOf(fireID) == -1) {
                    dieArr.push(fireID);
                }
                logs.push(`🏹Thợ săn ghim (bị động) chết ${roleName[getRole(playRoom.setup, fireID)]} *${names[fireID]}*`);
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
            logs.push(`🧙‍Phù thủy đã giết ${roleName[getRole(playRoom.setup, witchKillID)]} *${names[witchKillID]}*`);
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
            logs.push(`💘Do là cặp đôi, ${roleName[getRole(playRoom.setup, secondID)]} *${names[secondID]}* cũng chết theo`);
        }
    });
    // update logs
    updateData = {
        ...updateData, ...{
            logs: [...playRoom.logs, ...logs]
        }
    }
    // kiểm tra updateData có rỗng không?
    if (!(Object.keys(updateData).length === 0 && updateData.constructor === Object)) { }
    updateDataCallback(updateData);
    return dieArr;
}
function isAlive(playRoom, userID) {
    return playRoom.roleInfo.deathList.indexOf(userID) == -1;
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
        count += playRoom.roleTarget.voteList[user] == playRoom.roleInfo.victimID ? 1 : 0;
    });
    return count;
}
function gameIsEnd(playRoom) {
    console.log(`Phòng ${playRoom.roomChatID}: Game check: ${playRoom.players.wolfsID.length} SÓI / ${playRoom.players.villagersID.length} DÂN `);
    if (playRoom.roleInfo.angelWin) {
        // thiên sứ thắng
        return 9;
    } else if (playRoom.roleInfo.hasCouple && playRoom.players.wolfsID.length + playRoom.players.villagersID.length == 2 && playRoom.players.wolfsID.length > 0) {
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