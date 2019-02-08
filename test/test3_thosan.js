var assert = require('assert');
var should = require('should');
const ChatServer = require('../chatkit');
const DBServer = require('../mongodb');

const { postRequest, sendRequest } = require('./request');
const { defaultGameData, defaultSetup } = require('../Utils');

const defaultTestData = { ...defaultGameData, ...defaultSetup };


const roomID = "26851162";

describe('#3 THỢ SĂN test: duy1 là thợ săn', function () {
    const chatServer = new ChatServer();
    const dbServer = new DBServer();
    describe('#-1 SÓI cắn thợ săn duy1 (Sói duy2)', function () {
        this.timeout(100000);
        it('#3.1 Thợ săn duy1 (bị cắn) bị động ghim duy2!', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...defaultTestData, ...{
                    "setup.3": ["duy1"],
                    "roleTarget.fireToKill": false,
                    "roleTarget.fireID": "duy2",
                    "roleTarget.voteList": { "duy2": "duy1" },
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=superwolf`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                data.roleInfo.victimID.should.equal("duy1");
                data.roleInfo.lastDeath.indexOf("duy1").should.not.equal(-1); //duy1 chết
                data.roleInfo.lastDeath.indexOf("duy2").should.not.equal(-1); //duy2 chết
            })
        });
        it('#3.2.1 Thợ săn duy1 (bị cắn) chủ động ghim duy2, duy2 là sói, thợ săn về DÂN, sói chết!', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...defaultTestData, ...{
                    "setup.3": ["duy1"],
                    "setup.-1": ["duy2"],
                    "players.wolfsID": ["duy2"],
                    "roleTarget.fireID": "duy2",
                    "roleTarget.fireToKill": true,
                    "roleTarget.voteList": { "duy2": "duy1" },
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=superwolf`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                data.roleInfo.victimID.should.equal("duy1");
                data.roleInfo.lastDeath.indexOf("duy2").should.not.equal(-1); //duy2 chết
                data.roleInfo.lastDeath.indexOf("duy1").should.not.equal(-1); //duy1 chết (bị sói cắn)
            })
        });
        it('#3.2.2 Thợ săn duy1 (bị cắn) chủ động ghim duy3, duy3 là DÂN, cả 2 đều chết!', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...defaultTestData, ...{
                    "setup.3": ["duy1"],
                    "setup.4": ["duy3"],
                    "players.villagersID": ["duy3"],
                    "roleTarget.fireID": "duy3",
                    "roleTarget.fireToKill": true,
                    "roleTarget.voteList": { "duy2": "duy1" },
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=superwolf`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                data.roleInfo.victimID.should.equal("duy1");
                data.roleInfo.lastDeath.indexOf("duy3").should.not.equal(-1); //duy3 chết
                data.roleInfo.lastDeath.indexOf("duy1").should.not.equal(-1); //duy1 chết
            })
        });
    });
    describe('#-1 Sói duy2 cắn duy4', function () {
        this.timeout(100000);
        it('#3.2.1 Thợ săn duy1 (không bị cắn) chủ động ghim duy2, duy2 là sói, thợ săn về DÂN, sói chết!', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...defaultTestData, ...{
                    "setup.3": ["duy1"],
                    "setup.-1": ["duy2"],
                    "players.wolfsID": ["duy2"],
                    "roleTarget.fireID": "duy2",
                    "roleTarget.fireToKill": true,
                    "roleTarget.voteList": { "duy2": "duy4" },
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=superwolf`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                data.roleInfo.victimID.should.equal("duy4");
                data.roleInfo.lastDeath.indexOf("duy2").should.not.equal(-1); //duy2 chết
                data.roleInfo.lastDeath.indexOf("duy1").should.equal(-1); //duy1 sống
                data.setup[4].indexOf("duy1").should.not.equal(-1); //duy1 là dân
            })
        });
        it('#3.2.2 Thợ săn (không bị cắn) duy1 chủ động ghim duy3, duy3 là DÂN, cả 2 đều chết!', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...defaultTestData, ...{
                    "setup.3": ["duy1"],
                    "setup.4": ["duy3"],
                    "players.villagersID": ["duy3"],
                    "roleTarget.fireID": "duy3",
                    "roleTarget.fireToKill": true,
                    "roleTarget.voteList": { "duy2": "duy4" },
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=superwolf`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                data.roleInfo.victimID.should.equal("duy4");
                data.roleInfo.lastDeath.indexOf("duy3").should.not.equal(-1); //duy3 chết
                data.roleInfo.lastDeath.indexOf("duy1").should.not.equal(-1); //duy1 chết
            })
        });
    });
    describe('#3 tự ghim bản thân', function () {
        this.timeout(100000);
        it('#3.3.1 bị động ghim bản thân', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...defaultTestData, ...{
                    "setup.3": ["duy1"],
                    "roleTarget.fireID": "duy1",
                    "roleTarget.fireToKill": true,
                    "roleTarget.voteList": { "duy2": "duy4" },
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=superwolf`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                data.roleInfo.victimID.should.equal("duy4");
                data.roleInfo.lastDeath.indexOf("duy1").should.not.equal(-1); //duy1 chết
            })
        });
        it('#3.3.2 chủ động ghim chính mình', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...defaultTestData, ...{
                    "setup.3": ["duy1"],
                    "roleTarget.fireID": "duy1",
                    "roleTarget.fireToKill": true,
                    "roleTarget.voteList": { "duy2": "duy4" },
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=superwolf`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                data.roleInfo.victimID.should.equal("duy4");
                data.roleInfo.lastDeath.indexOf("duy1").should.not.equal(-1); //duy1 chết
            })
        });
    });

});