const stageTimeoutArr = {
    "readyToGame": 5 * 1000,
    "cupid": 20 * 1000,
    "night": 35 * 1000,
    "superwolf": 10 * 1000,
    "witch": 15 * 1000,
    "discuss": 3 * 60 * 1000,
    "vote": 15 * 1000,
    "voteResult": 10 * 1000,
    "lastWord": 1 * 60 * 1000,
    "voteYesNo": 15 * 1000,
    "voteYesNoResult": 10 * 1000
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
const phe = {
    "9": "Thiên sứ",
    "3": "Cặp đôi",
    "-1": "Sói",
    "1": "DÂN",
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
    "state.day": 0,
    "players.coupleID": [],

    "roleInfo.victimID": "",
    "roleInfo.deathList": [],
    "roleInfo.lastDeath": [],
    "roleInfo.hasCouple": false,
    "roleInfo.angelWin": false,
    "roleInfo.witchSaveRemain": true,
    "roleInfo.witchKillRemain": true,
    "roleInfo.superWolfVictimID": '',
    "roleInfo.oldManLive": 2,
    "roleInfo.lastSaveID": "",
    "roleInfo.lastFireID": "",

    "roleTarget.voteList": {},
    "roleTarget.coupleList": [],
    "roleTarget.saveID": "",
    "roleTarget.seeID": "",
    "roleTarget.witchKillID": "",
    "roleTarget.witchUseSave": false,
    "roleTarget.superWolfVictimID": "",
    "roleTarget.fireID": "",
    "roleTarget.fireToKill": false
}
const roleSetup = {
    "4": [[1, 4, 4, -1]],
    "5": [
        [1, 2, 4, -2, -1],
        [1, 4, 4, 4, -1]
    ],
    "6": [
        [1, 2, 4, 4, -2, -1],
        [1, 2, 3, 4, -1, -1],
        [1, 2, 4, 8, -2, -1],
        [1, 4, 4, 5, 8, -3]
    ],
    "7": [
        [1, 4, 4, 4, 5, 8, -3],
        [1, 2, 4, 4, 8, -2, -1],
        [1, 2, 4, 5, 8, -1, -1],
        [1, 2, 3, 4, 8, -1, -1]
    ],
    "8": [
        [1, 2, 4, 4, 4, 5, -3, -2],
        [1, 2, 3, 4, 4, -2, -1, -1],
        [1, 2, 4, 4, 5, -2, -1, -1],
        [1, 2, 4, 5, 8, -2, -1, -1],
        [1, 2, 3, 4, 5, -2, -1, -1],
        [1, 3, 4, 4, 5, -2, -1, -1],
        [1, 3, 4, 5, 6, -2, -1, -1],
        [1, 2, 4, 5, 6, -2, -1, -1]
    ],
    "9": [
        [1, 2, 4, 4, 4, 5, 8, -3, -2],
        [1, 2, 3, 4, 4, 8, -2, -1, -1],
        [1, 4, 4, 4, 4, 5, -2, -1, -1],
        [1, 2, 4, 4, 5, 8, -2, -1, -1],
        [1, 2, 3, 4, 5, 8, -2, -1, -1],
        [1, 2, 3, 4, 5, 6, -2, -1, -1],
        [1, 2, 3, 4, 4, 5, 6, -3, -2],
        [1, 2, 3, 4, 5, 6, 8, -3, -2]
    ],
    "10": [
        [1, 2, 3, 4, 4, 4, 5, 6, -3, -1],
        [1, 2, 3, 4, 4, 4, 5, -3, -2, -1],
        [1, 2, 4, 4, 4, 5, 6, -2, -1, -1],
        [1, 2, 3, 4, 4, 4, 5, -1, -1, -1],
        [1, 2, 3, 4, 4, 5, 8, -1, -1, -1],
        [1, 2, 3, 4, 4, 4, 5, 7, -3, -1],
        [1, 2, 3, 4, 4, 5, -2, -1, -1, -1],
        [1, 2, 3, 4, 4, 5, 6, -1, -1, -1]
    ],
    "11": [
        [1, 2, 3, 4, 4, 4, 5, 6, -1, -1, -1],
        [1, 2, 3, 4, 4, 4, 5, -2, -1, -1, -1],
        [1, 2, 3, 4, 4, 4, 4, 5, 7, -3, -1],
        [1, 2, 3, 4, 4, 4, 4, 5, 7, -3, -2],
        [1, 2, 3, 4, 4, 4, 4, 5, 6, -3, -2],
        [1, 2, 3, 4, 4, 4, 4, 5, -3, -2, -1],
        [1, 2, 3, 4, 4, 4, 5, 7, -2, -1, -1]
    ]
}
function random(min, max) {
    return Math.floor(Math.random() * max) + min;
}


// http://stackoverflow.com/questions/962802#962890
// xếp 1 vị trí ngẫu nhiên vào cuối mảng, giống bubble_sort nhưng là bubble_exchange :v
function shuffle(array) {
    var tmp, current, top = array.length;
    if (top) while (--top) {
        current = Math.floor(Math.random() * (top + 1));
        tmp = array[current];
        array[current] = array[top];
        array[top] = tmp;
    }
    return array;
}

module.exports = {
    stageTimeoutArr: stageTimeoutArr,
    nextStageArr: nextStageArr,
    phe: phe,
    roleName: roleName,
    defaultGameData: defaultGameData,
    roleSetup: roleSetup,
    shuffleArray: shuffle,
    random: random
}