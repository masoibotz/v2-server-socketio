
function witchKillVote(killID) {
    if (killID != -1 && this.players[killID]) {
        this.witchKillRemain = false;
        this.witchKillID = killID;
        return true;
    } else {
        return false;
    }
}
function save(joinID, voteID) {
    if (!this.roleDone[joinID] && this.saveID != voteID && this.players[voteID] && this.alivePlayer[this.players[voteID].joinID]) {
        if (this.oldManID != undefined && this.oldManLive <= 0) { // có GIÀ LÀNG đã chết
            this.logs.push(`🛡 *${this.getPlayer(joinID).first_name}* không thể bảo vệ *${this.playersTxt[voteID]}*`);
            this.saveID = -1;
        } else {
            this.logs.push(`🛡 *${this.getPlayer(joinID).first_name}* bảo vệ *${this.playersTxt[voteID]}*`);
            this.saveID = voteID;
        }
        this.roleDoneBy(joinID);
        return true;
    } else {
        return false;
    }
}
function fire(joinID, voteID, fireKill = false) {
    if (voteID == -1 && !this.roleDone[joinID]) { //bắn lên trời (bị động only)
        if (!fireKill) { //bị động
            this.fireID = -1;
            this.roleDoneBy(joinID);
            return true;
        } else { //không thể chủ động bắn lên trời
            return false;
        }
    }
    if (!this.roleDone[joinID] && this.players[voteID] && this.alivePlayer[this.players[voteID].joinID] && (fireKill || (!fireKill && this.fireID != voteID))) {
        // chủ động hoặc (bị động + ghim người khác đêm trước) 
        this.fireID = voteID;
        this.fireKill = fireKill;
        this.hunterID = joinID;
        this.roleDoneBy(joinID);
        return true;
    } else {
        return false;
    }
}
function see(joinID, voteID, trueCallback, falseCallback) {
    if (!this.roleDone[joinID] && this.players[voteID] && this.alivePlayer[this.players[voteID].joinID]) {
        this.roleDoneBy(joinID);
        if (this.oldManID != undefined && this.oldManLive <= 0) { // có GIÀ LÀNG đã chết
            trueCallback(4); // già làng chết: soi ra DÂN
        } else {
            let role = this.getRoleByID(voteID);
            if (role == -1 || role == -3 || role == 8 || (this.nguyenID && this.players[voteID].joinID == this.nguyenID)) { // sói, sói nguyền, người hóa sói, kẻ bị sói nguyền
                trueCallback(-1);
            } else if (role == 1) { // soi tiên tri :v
                trueCallback(1);
            } else { // còn lại là DÂN
                trueCallback(4);
            }
        }
        return true;
    } else {
        falseCallback(false);
        return false;
    }
}
function cupid(joinID, voteID1, voteID2) {
    if (!this.roleDone[joinID] && this.players[voteID1] && this.players[voteID2]) {
        this.roleDoneBy(joinID);
        this.getPlayer(joinID).setRole(4); // thần tình yêu về làm DÂN
        this.playersRole[joinID] = 4;
        this.cupidsID = [this.players[voteID1].joinID, this.players[voteID2].joinID];
        this.cupidsTxt = [voteID1 + ': ' + this.players[voteID1].first_name, voteID2 + ': ' + this.players[voteID2].first_name];
        if (this.players[voteID1].role * this.players[voteID2].role < 0) { //phe thứ 3
            this.cupidTeam = true;
        }
        console.log(`cupid: ${this.players[voteID1].role} * ${this.players[voteID2].role} < 0 ???`)
        return true;
    } else {
        return false;
    }
}
function vote(joinID, voteID, autoVote = false) {
    if (!this.isMorning) {
        console.log('>>> VOTE FAILED (NOT MORN)!')
        return false;
    }
    if (voteID == -1 && !this.roleDone[joinID]) {
        this.roleDoneBy(joinID, autoVote);
        console.log('>>> VOTE NULL -1!')
        return true;
    }
    if (!this.roleDone[joinID] && this.players[voteID] && this.alivePlayer[this.players[voteID].joinID]) {
        if (this.voteList[voteID]) {
            this.voteList[voteID]++;
        } else {
            this.voteList[voteID] = 1;
        }
        console.log('>>> VOTE PASSED!')
        this.roleDoneBy(joinID, autoVote);
        return true;
    } else {
        console.log('>>> VOTE FAILED (roleAlreadyDONE)!')
        return false;
    }
}
function justVote(voteID) {
    if (this.players[voteID] && this.alivePlayer[this.players[voteID].joinID] && Object.keys(this.voteList).length == 0) {
        this.voteList[voteID] = 1;
        console.log('>>> JUST VOTE! (kẻ bị sói nguyền)');
        return true;
    }
    return false;
}
function nguyen(nguyenID) {
    if (this.soiNguyen && this.players[nguyenID] && this.alivePlayer[this.players[nguyenID].joinID]) {
        this.soiNguyen = false;
        this.nguyenID = this.players[nguyenID].joinID;
        return true;
    } else {
        return false;
    }
}
function witchUseSave() {
    this.witchSaveRemain = false;
}

module.exports = {
    randomRole: randomRole,
    goStage: goStage,
    endGame: endGame,
}