var assert = require('assert');
const ChatServer = require('../chatkit');
const DBServer = require('../mongodb');

const { postRequest, sendRequest } = require('./request');
const { defaultGameData, defaultSetup } = require('../Utils');

const defaultTestData = { ...defaultGameData, ...defaultSetup };


const roomID = "26851162";

describe('#6 Già làng test: duy1 là già làng', function () {
    const chatServer = new ChatServer();
    const dbServer = new DBServer();
    describe('#-1 sói cắn duy1', function () {
        this.timeout(100000);
        it('#6.1 già làng bị cắn lần 1, duy1 sống', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...defaultTestData, ...{
                    "setup.6": ["duy1"],
                    "roleTarget.voteList": { "duy2": "duy1" },
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=superwolf`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                data.roleInfo.lastDeath.length.should.equal(0);
                data.roleInfo.oldManLive.should.equal(1);
            })
        });
        it('#6.2 già làng bị cắn lần 2, duy1 chết', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...{}, ...{
                    "setup.6": ["duy1"],
                    "roleTarget.voteList": { "duy2": "duy1" },
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=superwolf`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                data.roleInfo.victimID.should.equal("duy1");
                data.roleInfo.oldManLive.should.equal(0);
                data.roleInfo.lastDeath.indexOf("duy1").should.not.equal(-1); //duy1 chết
            })
        });
    });
});