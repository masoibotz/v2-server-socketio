var db = {
    "_id": ObjectId("5be6e95f8758f81af80b3d9a"),
    "roomChatID": "20509498",
    "hostUserID": "duy",
    "logs": [
        "Tóm tắt game"
    ],
    "state": { //update every_stage
        "status": "waiting",
        "day": 0,
        "dayStage": "night",
        "stageEnd": "2019-01-03T17:04:08.803Z",
    },
    "players": { //update after_night"
        "ready": {},
        "names": {
            "duy": "Duy1",
            "duyd": "Duy Desktop1",
            "ha": "Hà Hâm1"
        },
        "allID": [
            "duy",
            "duyd",
            "ha"
        ],
        "villagersID": [
            "duy"
        ],
        "wolfsID": [
            "duyd",
            "ha"
        ],
        "coupleID": [
        ]
    },
    "setup": { //update after_night
        "1": [],
        "2": [
            "duy"
        ],
        "3": [],
        "4": [],
        "5": [],
        "6": [],
        "7": [],
        "8": [],
        "9": [],
        "-3": [],
        "-2": [],
        "-1": [
            "duyd",
            "ha"
        ]
    },
    "roleInfo": { //after each vote (twice)
        "victimID": "",
        "lastDeath": [],
        "deathList": [],
        "hasCouple": false, //update after_night_and_day
        "angelWin": false, //update after_night_and_day_1
        "witchSaveRemain": true, //update after_night
        "witchKillRemain": true, //update after_night
        "superWolfVictimID": "", //update after_night / once
        "oldManLive": 2, //update after_night
        "lastSaveID": "", //update after_night
        "lastFireID": "" //update after_night
    },
    "roleTarget": { //update after_night
        "voteList": {},
        "coupleList": [],
        "saveID": "",
        "witchKillID": "",
        "witchUseSave": false,
        "superWolfVictimID": "",
        "fireID": "",
        "fireToKill": false
    }
}