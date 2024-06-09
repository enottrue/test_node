const cron = require('node-cron');
const cnf = require('./config.json');
const Telegram = require(global.constant.DIR_CLASSES + 'Telegram');
const Payment = require('./Models/Payment');


module.exports = {
    init: async () => {
        cron.schedule('59 23 * * *', async () => {


            const workCronForOneUser = async (token) => {
                let paymentsToDay = await Payment.getPaymentsToDay(token);

                let totalPrice = paymentsToDay.reduce((acc, i) => acc + +i.dataValues.amount, 0);
                let totalProduct = paymentsToDay.reduce((acc, i) => acc + +i.dataValues.product_amount, 0);


                const tg = new Telegram(cnf[token].tgBot.token);

                let msg = `Отчет об оплате за день: \n\rТоваров - ${totalProduct} шт. \n\rСделок - ${paymentsToDay.length} шт. \n\rСумма - ${totalPrice} руб`;
                cnf[token].tgBot.reportsTgId.forEach(i => tg.sendMsg(i, msg));
            };


            for (let token of cnf.tokens) {
                // if (token !== 'bitrixWebhook') {
                //     await workCronForOneUser(token);
                //     console.log(token)
                // }
                await workCronForOneUser(token)

            }
        },
            {
                timezone: "Europe/Moscow"
            });
    }

};