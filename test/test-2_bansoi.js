var assert = require('assert');
const ChatServer = require('../chatkit');
const DBServer = require('../mongodb');

const { postRequest, sendRequest } = require('./request');
const { defaultGameData, defaultSetup } = require('../Utils');

const defaultTestData = { ...defaultGameData, ...defaultSetup };

const roomID = "26851162";

describe('#-2 BÁN SÓI test: duy1 là bán sói', function () {
    const chatServer = new ChatServer();
    const dbServer = new DBServer();
    describe('#bán sói - sói', function () {
        this.timeout(100000);
        it('Sói cắn duy1, duy1 trở thành sói!', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...defaultTestData, ...{
                    "setup.-2": ["duy1"],
                    "roleTarget.voteList": { "duy2": "duy1" },
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=superwolf`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                assert.equal(data.roleInfo.victimID, "");
                assert.equal(data.roleInfo.lastDeath.length, 0);
                assert.equal(data.players.wolfsID[0], "duy1");
                assert.equal(data.setup[-1][0], "duy1");
            })
        });
    });


});