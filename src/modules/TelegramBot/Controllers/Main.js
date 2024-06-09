const Telegram = require(global.constant.DIR_CLASSES + '/Telegram');
const Tasks = require('../Models/Tasks');

module.exports = {
    sendMsg: async (ctx, next) => {
        const tg = new Telegram(ctx.cnf.token);
        let bxData;
        let typeText;

        switch (+ctx.bxActivity.OWNER_TYPE_ID) {
            case 1: {
                bxData = await ctx.bx.getLead(ctx.bxActivity.OWNER_ID);
                typeText = 'lead';
                break;
            }
            case 2: {
                bxData = await ctx.bx.getDeal(ctx.bxActivity.OWNER_ID);
                typeText = 'deal';
                break;
            }
            case 3: {
                bxData = await ctx.bx.getContact(ctx.bxActivity.OWNER_ID);
                typeText = 'contact';
                break;
            }
        }
        if (!bxData) throw new Error('error valide BXData');
        
        let user = await ctx.bx.getUsers({ ID: bxData.ASSIGNED_BY_ID });
        user = user[0];

        return ctx.body = {
            'status': await tg.sendMsg( user[ctx.cnf.fieldTelegramId], 
                    `Новое сообщение от ${bxData.TITLE} https://crm.taroirena.ru/crm/${typeText}/details/${ctx.bxActivity.OWNER_ID}/`) ?
                    'success' : 'error'
        };
    },

    addTask: async (ctx, next) => {
        if (ctx.bxActivity.DEADLINE === ctx.bxActivity.CREATED)
            return ctx.body = {'status': 'success'};
        if (ctx.bxActivity.RESULT_SOURCE_ID == 'ank_chats_app24_whatsapp') {
            return ctx.body = {'status': 'success'};
        } else {
            return ctx.body = {
                'status': await Tasks.create({
                    token: ctx.request.query.token,
                    task_id: ctx.bxActivity.ID,
                    deadline: ctx.bxActivity.DEADLINE,
                    status: 0
                }) == true
            };
        }
    },

    doneTask: async (ctx, next) => {
        if (ctx.bxActivity.RESULT_SOURCE_ID == 'ank_chats_app24_whatsapp') {
            //if (ctx.bxActivity.SUBJECT.includes('WA Amulets')) return await Main.sendMsg(ctx, next);
            return ctx.body = {'status': 'success'};
            
        } else if (ctx.request.body.event === 'ONCRMACTIVITYUPDATE' && ctx.bxActivity.COMPLETED === 'N') {
            return ctx.body = {
                'status': await Tasks.update(
                    {deadline: ctx.bxActivity.DEADLINE}, 
                    {
                        where: { 
                            task_id: ctx.request.body.data.FIELDS.ID 
                        }
                    }
                ) == true
            };
        } else if (!ctx.bxActivity || (ctx.bxActivity && ctx.bxActivity.COMPLETED === 'Y')) {
            return ctx.body = {
                'status': await Tasks.destroy({
                    where: {
                        task_id: ctx.request.body.data.FIELDS.ID
                    }
                }) == true
            };
        }
    },

};