const fs = require('fs');

const Telegram = require(global.constant.DIR_CLASSES + 'Telegram');

module.exports = {
    index: async (ctx, next) => {
        //if (ctx.bitrix.contact) {
        //    await ctx.bitrix.bx.updateLead(ctx.bitrix.lead.ID, {"ASSIGNED_BY_ID": ctx.bitrix.contact.ASSIGNED_BY_ID});
        //} else if(ctx.bitrix.lead.SOURCE_ID && ctx.cnf.SOURCE_ID.includes(ctx.bitrix.lead.SOURCE_ID)) {
        if (ctx.bitrix.lead.SOURCE_ID && ctx.cnf.SOURCE_ID.includes(ctx.bitrix.lead.SOURCE_ID)) {

            let department = await ctx.bitrix.bx.getDepartment(ctx.groupId);
            let headUserId = parseInt(department[0].UF_HEAD);
            let users = await ctx.bitrix.bx.getUsers({
                "sort": "ID",
                "order": "ASC",
                "FILTER": {
                    "ID": ctx.cnf.listUsersID,
                    "UF_DEPARTMENT": ctx.groupId,
                    //"IS_ONLINE": "Y"
                }
            });
            users = users.filter(u => parseInt(u.ID) != headUserId);

            let nextUserID = ctx.cnf.defaultUserId;

            if (users.length > 0) {
                nextUserID = await new Promise((res) => {
                    let userId;
                    if (!fs.existsSync(__dirname + '/../tmp/' + ctx.request.query.token + '.json')) {
                        userId = parseInt(users[0].ID);
                    } else {
                        let lastID = parseInt(JSON.parse(fs.readFileSync(__dirname + '/../tmp/' + ctx.request.query.token + '.json')).lastID);

                        let cur = 0;
                        for (let i = 0; i < users.length; i++) {
                            cur = i;
                            if (users.length - 1 == i && parseInt(users[i].ID) == lastID) {
                                cur = 0;
                                break;
                            }
                            if (parseInt(users[i].ID) <= lastID) continue;
                            else break;
                        }
                        userId = parseInt(users[cur].ID);
                    }
                    res(userId);
                });
            }

            /*-----TEMP-----*/
            const logText = `Очередь обучения: OrderQueue orderID(${ctx.bitrix.lead.ID}) - ALL USER(${users.reduce((acc, u) => `${acc}, ${u.ID}`, '')}) | NEXT USER(${nextUserID})`;
            const tg = new Telegram('1362225785:AAG-38Z9_gzSLU4Qs1EWGQUTMDZiH1xlN_w');
            // tg.sendMsg('188207447', logText);
            /*-----*/
            //console.log(logText);

            let statusSend = await ctx.bitrix.bx.updateLead(ctx.bitrix.lead.ID, { "ASSIGNED_BY_ID": nextUserID });

            if (ctx.cnf.logsStatus) {
                console.log('New user in Queue - ' + nextUserID + ' | status - ' + statusSend);
                console.log('CTX', ctx.bitrix.lead);
                console.log('0', ctx.bitrix.lead.SOURCE_ID);
                console.log('config data', ctx.cnf.SOURCE_ID);
            }

            fs.writeFileSync(__dirname + '/../tmp/' + ctx.request.query.token + '.json', JSON.stringify({ 'lastID': nextUserID }));
        }

        ctx.body = { status: 'success' };
        return ctx.body;
    },
};
