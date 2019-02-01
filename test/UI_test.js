var assert = require('assert');
const ChatServer = require('../chatkit');
const DBServer = require('../mongodb');

const { postRequest, sendRequest } = require('./request');
const { defaultGameData } = require('../Utils');

const roomID = "26851162";

describe('#ui stageTest', function () {
    const chatServer = new ChatServer();
    const dbServer = new DBServer();
    this.timeout(100000);
    it('#reset', function () {
        return dbServer.updatePlayRoom(roomID, {
            ...defaultGameData, ...{
                "state.status": "waiting",
                "logs": [],
            }
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        })
    });
    it('#cupid', function () {
        return dbServer.updatePlayRoom(roomID, {
            ...defaultGameData, ...{
                "state.status": 'ingame',
                "state.dayStage": "readyToGame",
                "setup.7": ["duy1", "duy2", "duy3", "duy4", "duy5", "duy6"],
                "roleInfo.deathList": ["duy5"],
            }
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        }).then(data => {
            return dbServer.updatePlayRoom(roomID, {
                "state.dayStage": "cupid",
                "state.stageEnd": new Date(Date.now() + 10000).toISOString(),
            })
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        })
    });
    it('#night1-6', function () {
        return dbServer.updatePlayRoom(roomID, {
            ...defaultGameData, ...{
                "state.status": 'ingame',
                "state.dayStage": "readyToGame",
                "setup.1": ["duy1"],
                "setup.2": ["duy2"],
                "setup.3": ["duy3"],
                "setup.4": ["duy4"],
                "setup.5": ["duy5"],
                "setup.6": ["duy6"],
                "roleInfo.deathList": ["duy5"],
            }
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        }).then(data => {
            return dbServer.updatePlayRoom(roomID, {
                "state.dayStage": "night",
                "state.stageEnd": new Date(Date.now() + 10000).toISOString(),
            })
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        })
    });
    it('#night7-9-3-1', function () {
        return dbServer.updatePlayRoom(roomID, {
            ...defaultGameData, ...{
                "state.status": 'ingame',
                "state.dayStage": "readyToGame",
                "setup.7": ["duy1"],
                "setup.8": ["duy2"],
                "setup.9": ["duy3"],
                "setup.-3": ["duy4"],
                "setup.-2": ["duy5"],
                "setup.-1": ["duy6"],
                "players.wolfsID": ["duy4", "duy6"],
                "roleInfo.deathList": ["duy5"],
            }
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        }).then(data => {
            return dbServer.updatePlayRoom(roomID, {
                "state.dayStage": "night",
                "state.stageEnd": new Date(Date.now() + 10000).toISOString(),
            })
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        })
    });
    it('#superwolf1:duy1 victim:duy2', function () {
        return dbServer.updatePlayRoom(roomID, {
            ...defaultGameData, ...{
                "state.status": 'ingame',
                "state.dayStage": "readyToGame",
                "setup.-3": ["duy1", "duy2", "duy3", "duy4", "duy5"],
                "setup.4": ["duy6"],
                "roleInfo.deathList": ["duy5"],
            }
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        }).then(data => {
            return dbServer.updatePlayRoom(roomID, {
                "state.dayStage": "superwolf",
                "roleInfo.victimID": "duy2",
                "state.stageEnd": new Date(Date.now() + 10000).toISOString(),
            })
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        })
    });
    it('#superwolf2:duy1 victim:null', function () {
        return dbServer.updatePlayRoom(roomID, {
            ...defaultGameData, ...{
                "state.status": 'ingame',
                "state.dayStage": "readyToGame",
                "setup.-3": ["duy1", "duy2", "duy3", "duy4", "duy5"],
                "setup.4": ["duy6"],
                "roleInfo.deathList": ["duy5"],
            }
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        }).then(data => {
            return dbServer.updatePlayRoom(roomID, {
                "state.dayStage": "superwolf",
                "state.stageEnd": new Date(Date.now() + 10000).toISOString(),
            })
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        })
    });
    it('#superwolf3:duy1 doneSuperwolf', function () {
        return dbServer.updatePlayRoom(roomID, {
            ...defaultGameData, ...{
                "state.status": 'ingame',
                "state.dayStage": "readyToGame",
                "setup.-3": ["duy1", "duy2", "duy3", "duy4", "duy5"],
                "setup.4": ["duy6"],
                "roleInfo.deathList": ["duy5"],
                "roleInfo.victimID": "duy2",
                "roleInfo.superWolfVictimID": "duy2",
            }
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        }).then(data => {
            return dbServer.updatePlayRoom(roomID, {
                "state.dayStage": "superwolf",
                "state.stageEnd": new Date(Date.now() + 10000).toISOString(),
            })
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        })
    });
    it('#witch1:victim victim:duy1', function () {
        return dbServer.updatePlayRoom(roomID, {
            ...defaultGameData, ...{
                "state.status": 'ingame',
                "state.dayStage": "readyToGame",
                "setup.5": ["duy1", "duy2", "duy3", "duy4", "duy5"],
                "setup.4": ["duy6"],
                "roleInfo.deathList": ["duy5"],
            }
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        }).then(data => {
            return dbServer.updatePlayRoom(roomID, {
                "state.dayStage": "witch",
                "roleInfo.victimID": "duy1",
                "state.stageEnd": new Date(Date.now() + 10000).toISOString(),
            })
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        })
    });
    it('#witch2:no-victim victim:null', function () {
        return dbServer.updatePlayRoom(roomID, {
            ...defaultGameData, ...{
                "state.status": 'ingame',
                "state.dayStage": "readyToGame",
                "setup.5": ["duy1", "duy2", "duy3", "duy4", "duy5"],
                "setup.4": ["duy6"],
                "roleInfo.deathList": ["duy5"],
            }
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        }).then(data => {
            return dbServer.updatePlayRoom(roomID, {
                "state.dayStage": "witch",
                "state.stageEnd": new Date(Date.now() + 10000).toISOString(),
            })
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        })
    });
    it('#witch3:no-save victim:duy1', function () {
        return dbServer.updatePlayRoom(roomID, {
            ...defaultGameData, ...{
                "state.status": 'ingame',
                "state.dayStage": "readyToGame",
                "setup.5": ["duy1", "duy2", "duy3", "duy4", "duy5"],
                "setup.4": ["duy6"],
                "roleInfo.witchSaveRemain": false,
                "roleInfo.deathList": ["duy5"],
            }
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        }).then(data => {
            return dbServer.updatePlayRoom(roomID, {
                "state.dayStage": "witch",
                "roleInfo.victimID": "duy1",
                "state.stageEnd": new Date(Date.now() + 10000).toISOString(),
            })
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        })
    });
    it('#witch4:no-kill victim:duy1', function () {
        return dbServer.updatePlayRoom(roomID, {
            ...defaultGameData, ...{
                "state.status": 'ingame',
                "state.dayStage": "readyToGame",
                "setup.5": ["duy1", "duy2", "duy3", "duy4", "duy5"],
                "setup.4": ["duy6"],
                "roleInfo.witchKillRemain": false,
                "roleInfo.deathList": ["duy5"],
            }
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        }).then(data => {
            return dbServer.updatePlayRoom(roomID, {
                "state.dayStage": "witch",
                "roleInfo.victimID": "duy1",
                "state.stageEnd": new Date(Date.now() + 10000).toISOString(),
            })
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        })
    });
    it('#witch5:no-save/no-kill victim:duy1', function () {
        return dbServer.updatePlayRoom(roomID, {
            ...defaultGameData, ...{
                "state.status": 'ingame',
                "state.dayStage": "readyToGame",
                "setup.5": ["duy1", "duy2", "duy3", "duy4", "duy5"],
                "setup.4": ["duy6"],
                "roleInfo.witchSaveRemain": false,
                "roleInfo.witchKillRemain": false,
                "roleInfo.deathList": ["duy5"],
            }
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        }).then(data => {
            return dbServer.updatePlayRoom(roomID, {
                "state.dayStage": "witch",
                "roleInfo.victimID": "duy1",
                "state.stageEnd": new Date(Date.now() + 10000).toISOString(),
            })
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        })
    });
    it('#discuss victim:duy1 lastDeath[duy4,duy5,duy6]', function () {
        return dbServer.updatePlayRoom(roomID, {
            ...defaultGameData, ...{
                "state.status": 'ingame',
                "state.dayStage": "readyToGame",
                "setup.5": ["duy1", "duy2", "duy3", "duy4", "duy5"],
                "setup.4": ["duy6"],
            }
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        }).then(data => {
            return dbServer.updatePlayRoom(roomID, {
                "state.dayStage": "discuss",
                "roleInfo.victimID": "duy1",
                "roleInfo.lastDeath": ["duy4", "duy5", "duy6"],
                "roleInfo.deathList": ["duy4", "duy5", "duy6"],
                "state.stageEnd": new Date(Date.now() + 10000).toISOString(),
            })
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        })
    });
    it('#vote1', function () {
        return dbServer.updatePlayRoom(roomID, {
            ...defaultGameData, ...{
                "state.status": 'ingame',
                "state.dayStage": "readyToGame",
                "setup.4": ["duy1", "duy2", "duy3"],
                "setup.-1": ["duy4", "duy5", "duy6"],
                "roleInfo.deathList": ["duy5"],
            }
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        }).then(data => {
            return dbServer.updatePlayRoom(roomID, {
                "state.dayStage": "vote",
                "state.stageEnd": new Date(Date.now() + 10000).toISOString(),
            })
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        })
    });
    it('#voteResult1 0-vote', function () {
        return dbServer.updatePlayRoom(roomID, {
            ...defaultGameData, ...{
                "state.status": 'ingame',
                "state.dayStage": "readyToGame",
                "setup.4": ["duy1", "duy2", "duy3"],
                "setup.-1": ["duy4", "duy5", "duy6"],
                "roleInfo.deathList": ["duy5"],
            }
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        }).then(data => {
            return dbServer.updatePlayRoom(roomID, {
                "state.dayStage": "voteResult",
                "roleInfo.voteList": {},
                "state.stageEnd": new Date(Date.now() + 10000).toISOString(),
            })
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        })
    });
    it('#voteResult2 vote', function () {
        return dbServer.updatePlayRoom(roomID, {
            ...defaultGameData, ...{
                "state.status": 'ingame',
                "state.dayStage": "readyToGame",
                "setup.4": ["duy1", "duy2", "duy3"],
                "setup.-1": ["duy4", "duy5", "duy6"],
                "roleInfo.deathList": ["duy5"],
            }
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        }).then(data => {
            return dbServer.updatePlayRoom(roomID, {
                "state.dayStage": "voteResult",
                "roleInfo.victimID": "duy1",
                "roleTarget.voteList": { "duy1": "duy2", "duy2": "duy3", "duy3": "duy4", "duy4": "duy5", "duy5": "duy6", "duy6": "duy1" },
                "state.stageEnd": new Date(Date.now() + 10000).toISOString(),
            })
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        })
    });
    it('#lastWord', function () {
        return dbServer.updatePlayRoom(roomID, {
            ...defaultGameData, ...{
                "state.status": 'ingame',
                "state.dayStage": "readyToGame",
                "setup.4": ["duy1", "duy2", "duy3"],
                "setup.-1": ["duy4", "duy5", "duy6"],
                "roleInfo.deathList": ["duy5"],
            }
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        }).then(data => {
            return dbServer.updatePlayRoom(roomID, {
                "roleInfo.victimID": "duy1",
                "state.dayStage": "lastWord",
                "state.stageEnd": new Date(Date.now() + 10000).toISOString(),
            })
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        })
    });
    it('#voteYesNo1', function () {
        return dbServer.updatePlayRoom(roomID, {
            ...defaultGameData, ...{
                "state.status": 'ingame',
                "state.dayStage": "readyToGame",
                "setup.4": ["duy1", "duy2", "duy3"],
                "setup.-1": ["duy4", "duy5", "duy6"],
                "roleInfo.deathList": ["duy5"],
            }
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        }).then(data => {
            return dbServer.updatePlayRoom(roomID, {
                "roleInfo.victimID": "duy1",
                "state.dayStage": "voteYesNo",
                "state.stageEnd": new Date(Date.now() + 10000).toISOString(),
            })
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        })
    });
    it('#voteYesNoResult', function () {
        return dbServer.updatePlayRoom(roomID, {
            ...defaultGameData, ...{
                "state.status": 'ingame',
                "state.dayStage": "readyToGame",
                "setup.4": ["duy1", "duy2", "duy3"],
                "setup.-1": ["duy4", "duy5", "duy6"],
                "roleInfo.deathList": ["duy5"],
            }
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        }).then(data => {
            return dbServer.updatePlayRoom(roomID, {
                "state.dayStage": "voteYesNoResult",
                "roleInfo.victimID": "duy1",
                "roleTarget.voteList": { "duy1": "duy1", "duy2": "", "duy3": "", "duy4": "", "duy5": "", "duy6": "duy1" },
                "state.stageEnd": new Date(Date.now() + 10000).toISOString(),
            })
        }).then(data => {
            return chatServer.sendAction(roomID, data);
        })
    });
});