var assert = require('assert');
const ChatServer = require('../chatkit');
const DBServer = require('../mongodb');

const { postRequest, sendRequest } = require('./request');
const { defaultGameData } = require('../Utils');

const roomID = "26851162";

describe('#9 THIÊN SỨ test: duy1 là thiên sứ', function () {
    const chatServer = new ChatServer();
    const dbServer = new DBServer();
    describe('#-1.9 thiên sứ an toàn ngày 1', function () {
        this.timeout(100000);
        it('#9.1 thiên sứ an toàn ngày 1, thiên sứ về Dân', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...defaultGameData, ...{
                    "state.day": 1,
                    "setup.9": ["duy1"],
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=cupid`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                data.setup[4].indexOf("duy1").should.not.equal(-1); //duy1 về DÂN
            })
        });
    });
    describe('#-1.9 thiên sứ chết', function () {
        this.timeout(100000);
        it('#9.2.1 thiên sứ đêm thắng', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...defaultGameData, ...{
                    "setup.9": ["duy1"],
                    "state.day": 1,
                    "roleTarget.voteList": { "duy2": "duy1" },
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=superwolf`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                data.roleInfo.angelWin.should.equal(true);
            })
        });
        it('#9.2.2 thiên sứ ngày thắng', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...defaultGameData, ...{
                    "setup.9": ["duy1"],
                    "state.day": 1,
                    "roleInfo.victimID": "duy1",
                    "roleTarget.voteList": { "duy2": "duy1" },
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=voteYesNoResult`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                data.roleInfo.angelWin.should.equal(true);
            })
        });
    });


});