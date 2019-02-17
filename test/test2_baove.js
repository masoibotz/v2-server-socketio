var assert = require('assert');
const ChatServer = require('../chatkit');
const DBServer = require('../mongodb');

const { postRequest, sendRequest } = require('./request');
const { defaultGameData, defaultSetup } = require('../Utils');

const defaultTestData = { ...defaultGameData, ...defaultSetup };

const roomID = "26851162";

describe('#2 BẢO VỆ test', function () {
    const chatServer = new ChatServer();
    const dbServer = new DBServer();
    describe('#1 Sói : Bảo vệ duy1', function () {
        this.timeout(100000);
        it('#2.1.1 Sói cắn duy1, bảo vệ đúng! không ai chết cả!', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...defaultTestData, ...{
                    "roleTarget.saveID": "duy1",
                    "roleTarget.voteList": { "duy2": "duy1" },
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=superwolf`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                assert.equal(data.roleInfo.victimID, "");
                assert.equal(data.roleInfo.lastDeath.length, 0);
            })
        });
        it('Sói cắn duy2, bảo vệ trượt, duy2 chết!', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...defaultTestData, ...{
                    "roleTarget.saveID": "duy1",
                    "roleTarget.voteList": { "duy2": "duy2" },
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=superwolf`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                assert.equal(data.roleInfo.victimID, "duy2");
                assert.equal(data.roleInfo.lastDeath.length, 1);
            })
        });
    });

    describe('#-3 sói_nguyền : Bảo vệ duy1', function () {
        this.timeout(100000);
        it('Sói cắn duy1, ko ai chết nhưng vẫn gọi sói nguyền đảm bảo ko lộ!', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...defaultTestData, ...{
                    "setup.-3": ["duy2"],
                    "roleTarget.saveID": "duy1",
                    "roleTarget.voteList": { "duy2": "duy1" },
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=superwolf`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                assert.equal(data.state.dayStage, "superwolf");
            })
        });
        it('Sói cắn duy2, duy2 chết, gọi sói nguyền!', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...defaultTestData, ...{
                    "setup.-3": ["duy2"],
                    "roleTarget.saveID": "duy1",
                    "roleTarget.voteList": { "duy2": "duy2" },
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=superwolf`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                assert.equal(data.state.dayStage, "superwolf");
            })
        });
    });
});