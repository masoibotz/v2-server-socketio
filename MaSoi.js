var schedule = require('node-schedule')
const stageTimeoutArr = {
    "cupid": 15 * 1000,
    "night": 15 * 1000,
    "superwolf": 15 * 1000,
    "witch": 15 * 1000,
    "discuss": 15 * 1000,
    "vote": 10 * 1000,
    "voteyesno": 10 * 1000
}
const nextStageArr = {
    "cupid": "night",
    "night": "superwolf",
    "superwolf": "witch",
    "witch": "discuss",
    "discuss": "vote",
    "vote": "voteyesno",
    "voteyesno": "cupid"
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
var roomSchedule = [];
async function randomRole(chatServer, dbServer, roomID) {
    await chatServer.getUserFromChatRoom(roomID).then(async (users) => {
        var readyUser = users.filter(u => {
            return u.custom_data.ready;
        })
        var setup = { "-3": [], "-2": [], "-1": [], "1": [], "2": [], "3": [], "4": [], "5": [], "6": [], "7": [], "8": [], "9": [] };
        var villagersID = [];
        var wolfsID = [];
        var cupidsID = [];
        let preSet = [2, 6, -1];
        readyUser.forEach((u, i) => {
            let roleID = preSet[i];
            if (roleID === -1) {
                wolfsID = [...wolfsID, u.id];
            } else {
                villagersID = [...villagersID, u.id];
            }
            setup[roleID] = [...setup[roleID], u.id];
        })
        await dbServer.updatePlayRoom(roomID, {
            status: 'ingame',
            setup: setup,
            villagersID: villagersID,
            wolfsID: wolfsID,
            day: 0,
            logs: ["Tóm tắt game"],
            deathList: [],
            voteList: {},
            lastDeath: [],
            "roleAction.hunterID": setup[3].length > 0 ? setup[3][0] : '',
            "roleAction.fireID": "",
            "roleAction.oldManLive": 2,
            "roleAction.witchSaveRemain": true,
            "roleAction.witchKillRemain": true,
            "roleAction.witchUseSave": false,
            "roleAction.superWolfRemain": true,
            "roleAction.superWolfVictimID": '',
        }, (res) => {
            console.log(`Phòng ${roomID}: Chọn ngẫu nhiên nhân vật...`);
            chatServer.sendAction(roomID, 'loadRole', res.value);
        })
    }).catch(err => console.log(err))
}
function mostVoted(playRoom) {
    let maxVoted = -1;
    let mostVotedUserID = "";
    let voted = {};
    Object.keys(playRoom.voteList).forEach((user) => {
        let beVotedUser = playRoom.voteList[user];
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
    Object.keys(playRoom.voteList).forEach((user) => {
        count += playRoom.voteList[user] == playRoom.roleAction.victimID ? 1 : 0;
    });
    return count;
}
// endGame missing......................................
async function goStage(chatServer, dbServer, roomID, stage) {
    console.log(`>>> Phòng ${roomID}: Stage ${stage} start...`);
    let endTimer = new Date(Date.now() + stageTimeoutArr[stage]);
    var updateData = { dayStage: stage, stageTimeout: endTimer.toISOString() };

    var playRoom = {};
    await dbServer.getPlayRoomState(roomID).then(data => {
        playRoom = data;
    })

    switch (stage) {
        case 'night': //after_cupid
            if (playRoom.setup[7].length != 0 && playRoom.cupidsID.length == 2) { // đã ghép đôi
                updateData = {
                    ...updateData, ...{
                        "setup.4": [...playRoom.setup[4], playRoom.setup[7][0]],
                        "setup.7": [],
                    }
                };
                if (getRole(playRoom.setup, playRoom.cupidsID[0]) * getRole(playRoom.setup, playRoom.cupidsID[0]) < 0) {
                    updateData = { ...updateData, ...{ "roleAction.hasCupidTeam": true } };
                }
            }
            break;
        case 'superwolf': //after_night
            var mostVotedUser = mostVoted(playRoom);
            updateData = { ...updateData, ...{ "roleAction.victimID": mostVotedUser } };
            playRoom.roleAction.victimID = mostVotedUser;
            // reset
            updateData = { ...updateData, ...{ voteList: {} } }
            // kiểm tra có sói nguyền không nếu không thì bỏ qua
            if (playRoom.setup[-3].length == 0) {
                await dbServer.updatePlayRoom(roomID, updateData);
                goStage(chatServer, dbServer, roomID, nextStageArr[stage]);
                return;
            }
            break;
        case 'witch': //after_superwolf
            // kiểm tra có witch không nếu không thì bỏ qua
            if (playRoom.setup[5].length == 0) {
                goStage(chatServer, dbServer, roomID, nextStageArr[stage]);
                return;
            }
            break;
        case 'discuss': //after_witch
            var deathArr = await KillDeathUser(chatServer, dbServer, playRoom);
            updateData = { ...updateData, ...{ lastDeath: deathArr } };
            // if (gameIsEnd(playRoom)) {
            //     endGame(playRoom.roomChatID);
            // }
            break;
        case 'voteyesno':// after_vote
            var mostVotedUser = mostVoted(playRoom);
            updateData = { ...updateData, ...{ "roleAction.victimID": mostVotedUser } };
            break;
        case 'cupid': //after_voteyesno
            if (voteYesNo(playRoom) > 0) { // kill > save
                var deathArr = await KillDeathUser(chatServer, dbServer, playRoom);
                updateData = { ...updateData, ...{ lastDeath: deathArr } };
            }
            // reset
            playRoom.day++;
            updateData = { ...updateData, ...{ voteList: {}, "roleAction.victimID": "" } }
            updateData = { ...updateData, ...{ day: playRoom.day } };
            // thiên sứ
            if (playRoom.setup[9].length > 0 && playRoom.day >= 2) {
                updateData = { ...updateData, ...{ "setup.9": [], "setup.4": [...playRoom.setup[4], ...playRoom.setup[9]] } }
            }
            // if (gameIsEnd(playRoom)) {
            //     endGame(playRoom.roomChatID);
            // }

            // kiểm tra có cupid không nếu không thì bỏ qua
            if (playRoom.setup[7].length == 0) {
                await dbServer.updatePlayRoom(roomID, updateData);
                goStage(chatServer, dbServer, roomID, nextStageArr[stage]);
                return;
            }
            break;
    }
    await dbServer.updatePlayRoom(roomID, updateData, (res) => {
        console.log(`<<< Phòng ${roomID}: Stage ${stage} sent!!!`);
        let functionName = `goStage${stage}`;
        if (stage === 'discuss') {
            functionName = "loadRole";
        }
        chatServer.sendAction(roomID, functionName, res.value);

        //next stage
        const nextStage = nextStageArr[stage];
        endTimer = new Date(Date.now() + stageTimeoutArr[stage]);
        roomSchedule[roomID] = schedule.scheduleJob(endTimer, () => {
            goStage(chatServer, dbServer, roomID, nextStage);
        })

    })
}
function endGame(roomID) {
    roomSchedule[roomID].cancel();
}
function deleteFromArray(array, itemToFind) {
    var indexOfItem = array.indexOf(itemToFind);
    return [...array.slice(0, indexOfItem), ...array.slice(indexOfItem + 1)]
}
//done
async function killAction(dbServer, playRoom, victimID) {
    // không giết ai, thằng bị giết out rồi, thằng cần giết chết rồi
    if (victimID == "" || !isAlive(playRoom, victimID)) {
        return;
    }
    var updateData = {};
    var victimRole = getRole(playRoom.setup, victimID);
    if (victimRole == 9) { //người chết là thiên sứ
        updateData = { "roleAction.angelWin": true }
    }
    if (victimRole == 5) { //người chết là phù thủy
        updateData = {
            "roleAction.witchID": '',
            "roleAction.witchKillRemain": false,
            "roleAction.witchSaveRemain": false
        }
    }
    if (victimRole == -3) { //người chết là sói nguyền
        updateData = {
            "roleAction.soiNguyenID": '',
            "roleAction.superWolfRemain": false
        }
    }
    if (victimRole == 2) { //người chết là bảo vệ
        updateData = {
            "roleAction.saveID": '',
        }
    }

    // kill action MAIN
    playRoom.deathList = [...playRoom.deathList, victimID];
    console.log("-------- DEATH LIST: ", playRoom.deathList);
    updateData = { ...updateData, ...{ deathList: playRoom.deathList } }
    if (victimRole == -1 || victimRole == -3 || victimID == playRoom.roleAction.superWolfVictimID) {
        // playRoom.wolfsID.length--;
        playRoom.wolfsID = deleteFromArray(playRoom.wolfsID, victimID);
        updateData = { ...updateData, ...{ wolfsID: playRoom.wolfsID } }
    } else {
        // playRoom.villagersID.length--;
        playRoom.villagersID = deleteFromArray(playRoom.villagersID, victimID);
        updateData = { ...updateData, ...{ villagersID: playRoom.villagersID } }
    }
    await dbServer.updatePlayRoom(playRoom.roomChatID, updateData, () => {
        console.log('======> update Death')
    });

    if (victimRole == 3) { //người chết là thợ săn
        console.log("kill fire ======>")
        await killAction(dbServer, playRoom, playRoom.roleAction.fireID);
        await cupidKill(dbServer, playRoom, playRoom.roleAction.fireID);
    }
}
//done
async function cupidKill(dbServer, playRoom, victimID) {
    if (playRoom.cupidsID && playRoom.cupidsID.indexOf(victimID) != -1) { //là 1 người trong cặp đôi
        playRoom.cupidsID.forEach(async (userID) => {
            if (victimID != userID && isAlive(playRoom, userID)) {
                await killAction(dbServer, playRoom, userID);
            }
        });
        await dbServer.updatePlayRoom(playRoom.roomChatID, { "roleAction.hasCupidTeam": false });
    }
}
//done
async function superWolfAction(dbServer, playRoom) {
    var superWolfVictimID = playRoom.roleAction.superWolfVictimID;
    if (superWolfVictimID == "") {
        return false;
    }
    let updateData = {
        "roleAction.superWolfRemain": false
    };
    if (getRole(playRoom.setup, superWolfVictimID) > 0) {
        updateData = {
            ...updateData, ...{
                wolfsID: [...playRoom.wolfsID, superWolfVictimID],
                villagersID: deleteFromArray(playRoom.villagersID, superWolfVictimID)
            }
        }
    }
    await dbServer.updatePlayRoom(playRoom.roomChatID, updateData);
    return true;
}
//done
async function witchKillAction(dbServer, playRoom) {
    let witchKillID = playRoom.roleAction.witchKillID;
    if (witchKillID != '' && playRoom.roleAction.witchKillRemain) {
        await killAction(dbServer, playRoom, witchKillID);
        await cupidKill(dbServer, playRoom, witchKillID);
        let updateData = { "roleAction.witchKillID": "", "roleAction.witchKillRemain": false }
        await dbServer.updatePlayRoom(playRoom.roomChatID, updateData);
        return true;
    } else {
        return false;
    }
}
//done
async function fireKillAction(dbServer, playRoom) {
    var fireID = playRoom.roleAction.fireID;
    var hunterID = playRoom.roleAction.hunterID;
    if (fireID == "" || !playRoom.roleAction.fireToKill || hunterID == "") { //không phải bắn lên trời hoặc bắn lung tung, phải là chủ động. phải còn thợ săn
        return [];
    }
    let fireVictimRole = getRole(playRoom.setup, fireID);
    let updateData = {
        // bắn xong, dù đúng hay sai bạn về dân nhé :v
        "setup.3": deleteFromArray(playRoom.setup["3"], hunterID),
        "setup.4": [...playRoom.setup["4"], hunterID],
        "roleAction.hunterID": "",
        "roleAction.fireID": "",
        "roleAction.fireToKill": false
    }
    await dbServer.updatePlayRoom(playRoom.roomChatID, updateData);
    if (fireVictimRole > 0) { // bắn trúng dân làng (giết thợ săn => thợ săn tự ghim nạn nhân)
        await killAction(dbServer, playRoom, hunterID);
        await cupidKill(dbServer, playRoom, hunterID);
        return [hunterID, fireID];
    } else { //chỉ giết nạn nhân
        await killAction(dbServer, playRoom, fireID);
        await cupidKill(dbServer, playRoom, fireID);
        return [fireID];
    }
}
// done
async function kill(dbServer, playRoom) {
    var victimID = playRoom.roleAction.victimID;
    var victimRole = getRole(playRoom.setup, victimID);
    var saveID = playRoom.roleAction.saveID;
    var superWolfVictimID = playRoom.roleAction.superWolfVictimID;
    var isNight = Object.keys(nextStageArr).indexOf(playRoom.dayStage) <= Object.keys(nextStageArr).indexOf('discuss') ? true : false;

    var updateData = {};

    console.log(`KILL ${victimID} ${isNight ? ` SAVE: ${saveID}` : ''} !!!`);
    if (victimID != "") {
        if (!isNight || (isNight && victimID != saveID)) { // là ban ngày hoặc ban đêm bảo vệ sai
            if (victimRole == -2 && isNight) { //là BÁN SÓI
                // thêm victimID vào team sói (wolfsID)
                updateData = { wolfsID: [...playRoom.wolfsID, victimID] };
                // xóa victimID khỏi team dân (villagersID)
                updateData = { villagersID: deleteFromArray(playRoom.villagersID, victimID) };
                await dbServer.updatePlayRoom(playRoom.roomChatID, updateData);
                return false;
            }
            if (victimRole == 6) { //là Già làng
                if (isNight) {
                    playRoom.roleAction.oldManLive--;
                    console.log(`====> OLD MAN >>>>> ${playRoom.roleAction.oldManLive}`);
                    updateData = { "roleAction.oldManLive": playRoom.roleAction.oldManLive };
                    await dbServer.updatePlayRoom(playRoom.roomChatID, updateData);
                    if (playRoom.roleAction.oldManLive > 0) { // còn 1 mạng
                        return false;
                    }
                } else {
                    updateData = { "roleAction.oldManLive": 0 };
                    await dbServer.updatePlayRoom(playRoom.roomChatID, updateData);
                }
            }
            if (superWolfVictimID != "" && victimID == superWolfVictimID && isNight) { //là kẻ bị sói nguyền
                await superWolfAction(dbServer, playRoom);
                return false;
            }
            await killAction(dbServer, playRoom, victimID);
            await cupidKill(dbServer, playRoom, victimID);
            return true;
        } else { // bảo vệ thành công 
            return false;
        }
    } else { // sói không cắn ai
        return false;
    }
}
//done
async function newLog(dbServer, playRoom, newlogs = []) {
    let updateData = { logs: [...playRoom.logs, ...newlogs] }
    await dbServer.updatePlayRoom(playRoom.roomChatID, updateData);
}
// done
function gameIsEnd(playRoom) {
    console.log(`Phòng ${playRoom.roomChatID}: Game check: ${playRoom.wolfsID.length} SÓI / ${playRoom.villagersID.length} DÂN `);
    if (this.thienSuWin) {
        // thiên sứ thắng
        return 9;
    } else if (playRoom.hasCupidTeam && playRoom.wolfsID.length + playRoom.villagersID.length == 2 && playRoom.wolfsID.length > 0) {
        // cặp đôi thắng
        return 3;
    } else if (playRoom.wolfsID.length >= playRoom.villagersID.length) {
        //SÓI THẮNG
        return -1;
    } else if (playRoom.wolfsID.length === 0) {
        //DÂN THẮNG
        return 1;
    } else {
        return 0;
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
//missing thông báo cắn mà không chết
async function KillDeathUser(chatServer, dbServer, playRoom) {
    var dieArr = [];
    let victimID = playRoom.roleAction.victimID;
    let victimRole = getRole(playRoom.setup, victimID);
    let witchSaved = playRoom.roleAction.witchUseSave;
    let logs = [];
    let updateData = {};

    // done THỢ SĂN
    if (playRoom.roleAction.fireToKill) { // chủ động
        console.log('+++++++ FIRE TO KILL ++++++++');
        let deathIDs = await fireKillAction(dbServer, playRoom)
        if (deathIDs.length == 2) { // bắn nhầm: [hunterID, fireID]
            logs.push(`🏹Thợ săn đã bắn nhầm ${roleName[getRole(playRoom.setup, deathIDs[1])]} *${deathIDs[1]}*`);
            logs.push(`⚔️Thợ săn phải đền mạng!`);
        } else if (deathIDs.length == 1) { // bắn trúng [fireID]
            logs.push(`🏹Thợ săn đã bắn trúng ${roleName[getRole(playRoom.setup, deathIDs[0])]} *${deathIDs[0]}*`);
        }
        deathIDs.forEach(deathID => {
            if (dieArr.indexOf(deathID) == -1) {
                dieArr.push(deathID);
            }
        });
    }

    // done SÓI CẮN
    if (!witchSaved) {
        if (await kill(dbServer, playRoom)) {
            dieArr.push(victimID);
            logs.push(`⚔️ *${victimID}* là ${roleName[victimRole]} đã bị SÓI cắn!`);
            if (victimRole == 3) { //người chết là thợ săn
                let fireID = playRoom.roleAction.fireID
                if (fireID != "") { //thợ săn không bắn lên trời
                    if (dieArr.indexOf(fireID) == -1) {
                        dieArr.push(fireID);
                    }
                    logs.push(`🏹Thợ săn chết đã ghim ${roleName[getRole(playRoom.setup, fireID)]} *${fireID}*`);
                }
            }
        }
    } else {
        logs.push(`🧙‍Phù thủy đã cứu ${roleName[victimRole]} *${victimID}*`);
        updateData = {
            "roleAction.witchUseSave": false,
            "roleAction.witchSaveRemain": false,
        }
    }

    // done PHÙ THỦY giết
    if (playRoom.roleAction.witchKillID != "") {
        if (await witchKillAction(dbServer, playRoom)) {
            let witchKillID = playRoom.roleAction.witchKillID;
            if (dieArr.indexOf(witchKillID) == -1) {
                dieArr.push(witchKillID);
            }
            logs.push(`🧙‍Phù thủy đã giết ${roleName[getRole(playRoom.setup, witchKillID)]} *${witchKillID}*`);
        }
    }

    // done CẶP ĐÔI CHẾT:
    dieArr.every(dieID => {
        let indexOfFirst = playRoom.cupidsID.indexOf(dieID);
        if (indexOfFirst != -1) { // có 1 trong 2 người chết
            let indexOfSecond = indexOfFirst == 0 ? 1 : 0;
            let secondID = playRoom.cupidsID[indexOfSecond]; // ID người còn lại
            if (dieArr.indexOf(secondID) == -1) { // người còn lại chưa chết
                dieArr.push(secondID);
            }
            logs.push(`💘Do là cặp đôi, ${roleName[getRole(playRoom.setup, secondID)]} *${secondID}* cũng chết theo`);
            return false;
        }
        return true;
    });

    // KHÔNG CHẾT :V 
    if (victimID != "") {
        //là BÁN SÓI
        if (victimRole == -2) {
            // await bot.say(halfWolfjoinID, `\`\`\`\n🔔 Bạn đã bị sói cắn!\n🔔 Từ giờ bạn là 🐺SÓI!\n\`\`\``);
            updateData = {
                ...updateData, ...{
                    "setup.-2": deleteFromArray(playRoom.setup[-2], victimID),
                    "setup.-1": [...playRoom.setup[-1], victimID],
                }
            }
            logs.push(`☪ BÁN SÓI *${victimID}* bị cắn và trở thành 🐺SÓI`);
        }

        //là GIÀ LÀNG
        if (victimRole == 6) {
            if (playRoom.roleAction.oldManLive > 0) {
                logs.push(`⚠️ GIÀ LÀNG *${victimID}* bị cắn lần 1!`);
            } else {
                logs.push(`⚠️ GIÀ LÀNG *${victimID}* bị cắn lần 2!`);
            }
        }

        //là kẻ bị sói nguyền
        let superWolfVictimID = playRoom.roleAction.superWolfVictimID;
        if (superWolfVictimID != "" && victimID == superWolfVictimID) {
            // roomWolfChatAll(bot, gamef.getRoom(userRoom).wolfsID, nguyenJoinID, `\`\`\`\n🐺${nguyenName} đã bị nguyền và theo phe sói!\n\`\`\``);
            // let wolfsListTxt = gamef.getRoom(userRoom).wolfsTxt.join(' / ');
            // bot.say(nguyenJoinID, '```\n🔔Bạn đã bị nguyền\n🔔Bạn sẽ theo phe 🐺SÓI\n🔔Danh sách phe sói:\n' + wolfsListTxt + '\n```');
            logs.push(`🐺${superWolfVictimID} đã bị nguyền và theo phe sói!`);
        }
    }
    // kiểm tra updateData có rỗng không?
    if (!(Object.keys(updateData).length === 0 && updateData.constructor === Object)) {
        await dbServer.updatePlayRoom(playRoom.roomChatID, updateData);
    }
    newLog(dbServer, playRoom, logs);
    return dieArr;
}
function isAlive(playRoom, userID) {
    return playRoom.deathList.indexOf(userID) == -1;
}

module.exports = {
    randomRole: randomRole,
    goStage: goStage,
    endGame: endGame,
}