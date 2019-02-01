var assert = require('assert');
const ChatServer = require('../chatkit');
const DBServer = require('../mongodb');

const { postRequest, sendRequest } = require('./request');
const { defaultGameData } = require('../Utils');

const roomID = "26851162";

describe('#7 cupid/couple test: duy1 là cupid ghép đôi duy1, duy3', function () {
    const chatServer = new ChatServer();
    const dbServer = new DBServer();
    describe('#-1..7 sói cắn duy4', function () {
        this.timeout(100000);
        it('#7.0 cupid về dân', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...defaultGameData, ...{
                    "roleTarget.coupleList": ["duy1", "duy3"],
                    "setup.7": ["duy1"],
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=night`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                data.setup[4].indexOf("duy1").should.not.equal(-1); // duy1 về DÂN
                data.players.coupleID.indexOf("duy1").should.not.equal(-1); // duy1 là couple
                data.players.coupleID.indexOf("duy3").should.not.equal(-1); // duy3 là couple
            })
        });
    });
    describe('#-1..7 sói cắn duy1', function () {
        this.timeout(100000);
        it('#7.1.1 duy1 chết kéo theo duy3', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...defaultGameData, ...{
                    "players.coupleID": ["duy1", "duy3"],
                    "setup.7": ["duy1"],
                    "roleTarget.voteList": { "duy2": "duy1" },
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=superwolf`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                data.roleInfo.victimID.should.equal("duy1");
                data.roleInfo.lastDeath.indexOf("duy1").should.not.equal(-1); //duy1 chết
                data.roleInfo.lastDeath.indexOf("duy3").should.not.equal(-1); //duy3 chết
            })
        });
        it('#7.1.2 #3..7 duy1 chết kéo theo duy3, duy3 là thợ săn ghim duy1', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...{}, ...{
                    "players.coupleID": ["duy1", "duy3"],
                    "setup.7": ["duy1"],
                    "setup.3": ["duy3"],
                    "roleTarget.fireID": "duy1",
                    "roleTarget.voteList": { "duy2": "duy1" },
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=superwolf`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                data.roleInfo.victimID.should.equal("duy1");
                data.roleInfo.lastDeath.indexOf("duy1").should.not.equal(-1); //duy1 chết
                data.roleInfo.lastDeath.indexOf("duy3").should.not.equal(-1); //duy3 chết
            })
        });
    });
    describe('#Treo cổ duy1', function () {
        this.timeout(100000);
        it('#7.2.1 duy1 chết kéo theo duy3', function () {
            return dbServer.updatePlayRoom(roomID, {
                ...defaultGameData, ...{
                    "players.coupleID": ["duy1", "duy3"],
                    "roleTarget.voteList": { "duy2": "duy1" },
                }
            }).then(data => {
                return sendRequest(`/play/${roomID}/goStage?stage=superwolf`)
            }).then(() => {
                return sendRequest(`/room/${roomID}/status`);
            }).then((data) => {
                data.roleInfo.victimID.should.equal("duy1");
                data.roleInfo.lastDeath.indexOf("duy1").should.not.equal(-1); //duy1 chết
                data.roleInfo.lastDeath.indexOf("duy3").should.not.equal(-1); //duy3 chết
            })
        });
    });
});