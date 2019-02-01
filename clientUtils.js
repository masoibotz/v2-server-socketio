const { roleName } = require('./Utils');

module.exports = function stageActionText(gameData) {
    var names = gameData.players.names;
    switch (gameData.state.dayStage) {
        case 'readyToGame':
            let notifySetup = `Trò chơi đang bắt đầu\nSETUP GAME\n`
            Object.keys(gameData.setup).forEach(key => {
                if (gameData.setup[key].length > 0) {
                    notifySetup += `${gameData.setup[key].length} ${roleName[key]}\n`;
                }
            });
            return notifySetup;
        case 'night':
            return `Đêm thứ ${gameData.state.day}`;
        case 'discuss':
            let notifyDeath = `☀TRỜI SÁNG RỒI!\n`;
            notifyDeath += gameData.roleInfo.lastDeath.length === 0 ? `Đêm qua không ai chết cả` : gameData.roleInfo.lastDeath.map((deathID) => {
                return `⚔${names[deathID]} đã chết`;
            }).join('\n');
            return notifyDeath;
        case 'voteResult':
            let voteResult = `KẾT QUẢ VOTE\n`;
            let voteArr = {};
            Object.keys(gameData.roleTarget.voteList).forEach((userID, index) => {
                targetID = gameData.roleTarget.voteList[userID];
                voteArr[targetID] ? voteArr[targetID]++ : voteArr[targetID] = 1;
            });
            voteResult += Object.keys(voteArr).map((targetID, index) => {
                return `${index + 1}: ${names[targetID]} (${voteArr[targetID]} phiếu)`;
            }).join('\n')
            voteResult += `\n`;
            if (gameData.roleInfo.victimID !== "") {
                voteResult += `${names[gameData.roleInfo.victimID]} có số vote nhiều nhất!`;
            } else {
                voteResult += `Không ai bị treo cổ!`;
            }
            return voteResult;
        case 'lastWord':
            if (gameData.roleInfo.victimID !== "") {
                return (`${names[gameData.roleInfo.victimID]} LÊN THỚT!\n1 phút thanh minh bắt đầu`);
            }
            break;
        case 'voteYesNoResult':
            let listTreo = [];
            let listTha = [];
            let victimID = gameData.roleInfo.victimID;
            Object.keys(gameData.roleTarget.voteList).filter((userID, index) => {
                if (gameData.roleTarget.voteList[userID] === victimID) {
                    listTreo = [...listTreo, names[userID]];
                } else {
                    listTha = [...listTha, names[userID]];
                }
            });
            return (`KẾT QUẢ THEO/THA:\n`
                + `${listTreo.length} Treo: ${listTreo.join(", ")}\n`
                + `${listTha.length} Tha: ${listTha.join(", ")}\n\n`
                + `${names[victimID]} ${listTreo.length > listTha.length ? `đã bị treo cổ theo số đông!` : `vẫn được mọi người tin tưởng!`}`
            );
    }
}