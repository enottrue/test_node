const cnf = require('../../Acquire/config.json')// './config.json');
const Telegram = require(global.constant.DIR_CLASSES + 'Telegram');
const Payment = require('../../Acquire/Models/Payment') //'./Models/Payment');

const bankDictionary = ['sber', 'everypay', 'tinkoffCredit']

module.exports = {
    index: async (ctx, next) => {

        return await ctx.render('/Main/index', {
            nameCompany: 'Taroirena'
        })
    },
    payment: async (ctx, next) => {
        let amount = { nameCompany: 'Payments' }

        for (let bank of bankDictionary) {
            amount[bank] = await Payment.getPaymentsToDay(22, bank)
        }
        console.log(amount)

        return await ctx.render('Main/payments', amount)
    },


    test: async (ctx, next) => {


        const workCronForOneUser = async (token) => {
            let paymentsToDay = await Payment.getPaymentsToDay(token);

            let totalPrice = paymentsToDay.reduce((acc, i) => acc + +i.dataValues.amount, 0);
            let totalProduct = paymentsToDay.reduce((acc, i) => acc + +i.dataValues.product_amount, 0);

            // console.log(`cnf`, cnf)
            // console.log(`token`, cnf[token])
            const tg = new Telegram(cnf[token].tgBot.token);

            let msg = `Отчет об оплате за день: \n\rТоваров - ${totalProduct} шт. \n\rСделок - ${paymentsToDay.length} шт. \n\rСумма - ${totalPrice} руб`;
            cnf[token].tgBot.reportsTgId.forEach(i => tg.sendMsg(i, msg));
        };


        for (let token of cnf.tokens) {
            // if (token !== 'bitrixWebhook') {
            //     await workCronForOneUser(token);
            //     console.log(token)
            // }
            // console.log(22, cnf[token])

            try {
                await workCronForOneUser(token)
            } catch (error) {

                console.log(error)
            }
        }

        return await ctx.render('/Main/index', {
            nameCompany: 'Taroirena22'
        })
    }
};