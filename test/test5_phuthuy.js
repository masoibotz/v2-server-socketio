var assert = require('assert');
const ChatServer = require('../chatkit');
const DBServer = require('../mongodb');

const { postRequest, sendRequest } = require('./request');
const { defaultGameData, defaultSetup } = require('../Utils');

const defaultTestData = { ...defaultGameData, ...defaultSetup };


const roomID = "26851162";

describe('#5 Phù thủy test: duy1 là phù thủy', function () {
    const chatServer = new ChatServer();
    const dbServer = new DBServer();
    describe('#-1 sói cắn duy1', function () {
        this.timeout(100000);
        it('#5.1 phù thủy cứu, duy1 sống', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...defaultTestData, ...{
                    "setup.5": ["duy1"],
                    "roleTarget.voteList": { "duy2": "duy1" },
                    "roleTarget.witchUseSave": true
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=superwolf`)
            }).then(() => {
                return sendRequest(`/play/${roomID}/goStage?stage=discuss`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                assert.equal(data.roleInfo.victimID, "");
                assert.equal(data.roleInfo.lastDeath.length, 0);
                assert.equal(data.roleInfo.witchSaveRemain, false);
            })
        });
        it('#5.2 phù thủy giết duy2, duy2 chết', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...defaultTestData, ...{
                    "setup.5": ["duy1"],
                    "roleTarget.voteList": { "duy2": "duy1" },
                    "roleTarget.witchKillID": "duy2"
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=superwolf`)
            }).then(() => {
                return sendRequest(`/play/${roomID}/goStage?stage=discuss`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                data.roleInfo.victimID.should.equal("duy1");
                data.roleInfo.lastDeath.indexOf("duy1").should.not.equal(-1); //duy1 chết
                data.roleInfo.lastDeath.indexOf("duy2").should.not.equal(-1); //duy2 chết
                assert.equal(data.roleInfo.witchKillRemain, false);
            })
        });
    });


});