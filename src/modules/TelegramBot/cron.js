const cron     = require('node-cron');
const Telegram = require(global.constant.DIR_CLASSES + '/Telegram');
const BX       = require(global.constant.DIR_CLASSES + '/BX');
const Tasks    = require('./Models/Tasks');
const cnf      = require('./config.json');

module.exports = {
    init: async () => {
        cron.schedule('* * * * *', async () => {
            const sendMsg = async (task, status) => {
                const bx = new BX(cnf[task.token].bitrixWebhook);
                const tg = new Telegram(cnf[task.token].token);
                const activity = await bx.getActivity(task.task_id);
                let bxUser = await bx.getUsers({id: activity.RESPONSIBLE_ID}); 
                bxUser = bxUser[0];

                if (!bxUser[cnf[task.token].fieldTelegramId] || !activity || (activity && Number(activity.OWNER_TYPE_ID)) > 3) {
                    await Tasks.destroy({
                        where: {
                            task_id: task.task_id
                        }
                    });
                    return;
                }

                let hour = new Date(task.deadline /*+ '-03:00'*/).getHours();
                let minut = new Date(task.deadline).getMinutes();
                hour = hour > 9? hour: '0' + hour; 
                minut = minut > 9? minut: '0' + minut; 

                let msg = ( status == 2 ? "пропущена задача " : (status == 3 ? `менеджер (${bxUser.NAME} ${bxUser.LAST_NAME} ${bxUser.SECOND_NAME}) не выполнил задание ` : '') ) + 
                    (activity.PROVIDER_TYPE_ID === 'CALL'? 'позвонить' : (activity.PROVIDER_TYPE_ID === 'TASK'? 'выполнить' : 'новое событие') ) + ' ' + 
                    (activity.OWNER_TYPE_ID === '1'? 'лид' : (activity.OWNER_TYPE_ID === '2'? 'сделка' : 'контакт') ) + ' ' + 
                    `(https://crm.taroirena.ru/crm/${(activity.OWNER_TYPE_ID === '1'? 'lead' : (activity.OWNER_TYPE_ID === '2'? 'deal' : 'contact') )}/details/${activity.OWNER_ID}/)` + 
                    ' в ' + hour + ':' + minut;

                msg = msg[0].toLocaleUpperCase() + msg.substr(1);

                await tg.sendMsg((status == 3 ? cnf[task.token].defaultTgId : bxUser[cnf[task.token].fieldTelegramId]), msg);    
                await Tasks.update({status},{where: { id: task.id }});
            }; 

            const workCronForOneUser = async (token) => {
                const tasks = await Tasks.getTasts(token);

                tasks.forEach(async task => {
                    let status = task.dataValues.status; 
                    let minLeter = parseInt( ((new Date() - new Date(task.dataValues.deadline)) / 1000 ) / 60 );
                    
                    if (!task.dataValues.status) status = 1;
                    else if (minLeter >= cnf[task.token].firstTimeReport && task.dataValues.status === 1) status = 2;
                    else if (minLeter >= cnf[task.token].secondTimeReport && task.dataValues.status === 2) status = 3;

                    if (parseInt(task.dataValues.status) !== parseInt(status))
                        await sendMsg(task.dataValues, status); 
                });
            };

            for (let token in cnf) await workCronForOneUser(token);
        });
    }
};