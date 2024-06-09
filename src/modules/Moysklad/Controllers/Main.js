const cnf = require('../config.json')// './config.json');
const TelegramBot = require(global.constant.DIR_CLASSES + 'Telegram');
const Bottleneck = require("bottleneck");

const BX = require(global.constant.DIR_CLASSES + '/BX');
const MoySklad = require(global.constant.DIR_CLASSES + '/MoySklad');
const Ms_orders = require('../Models/Ms_orders');

module.exports = {
    createOrder: async (ctx, next) => {
        const limiter = new Bottleneck({
            minTime: 333,
            maxConcurrent: 1,
        });
        const bot = new TelegramBot(cnf.tgBot.token); //TG id
        let request = ctx.request.query;
        let bx = new BX(cnf.bitrixWebhook);

        const MyStore = new MoySklad(cnf);
        let dataOrder

        if (request.id) {
            const { deal, products, invoices, manager, contact } = await bx.getBXDeal(request.id);


            const agent = MyStore.genAgent()
            const organization = MyStore.genOrganization()
            const store = MyStore.genStore()
            const description = await limiter.schedule(async () => await MyStore.genDescription(contact, deal, manager))
            const positions = await limiter.schedule(async () => await MyStore.formatBxToMsProducts(products))
            const attributes = await limiter.schedule(async () => await MyStore.genAttributes(contact, deal, manager))
            const currentDate = MyStore.formatOrderDate()
            const dealData = await bx.getDeal(request.id);
            const name = await MyStore.getOrderName(dealData.ID)

            dataOrder = {
                name,
                agent,
                store,
                organization,
                applicable: false,
                moment: currentDate,
                positions,
                attributes,
                description,
            };

            const connectOrder = await Ms_orders.findOne({ where: { 'bx_id': deal.ID } });
            const orderID = connectOrder ? connectOrder.ms_id : false;

            const order = await limiter.schedule(async () => await MyStore.upload(orderID, cnf.ms.entity.customOrder, dataOrder));

            if (!order) return;

            if (!connectOrder) Ms_orders.create({ 'bx_id': deal.ID, 'ms_id': order.id });
            await bot.sendMsg("262475445", 'Заказ успешно создан BX ID: ' + deal.ID + ' MS ID: ' + order.id);

            if (!order?.meta) return ctx.body = { status: 200 };

            const dataInvoices = { organization, agent, store, positions, customerOrder: { meta: order.meta } };
            let idInvoiceout = false;

            if (order?.invoicesOut) {
                idInvoiceout = order.invoicesOut[0].meta.href.split('/').pop();
            }

            const invoiceout = await MyStore.upload(idInvoiceout, cnf.ms.entity.invoiceOut, dataInvoices)
            await bot.sendMsg("262475445", 'Создан счет получателя заказа BX ID: ' + deal.ID + ' MS ID: ' + order.id);
            if (invoiceout?.payments) {
                invoiceout.payments.forEach(async item => await limiter.schedule(() => MyStore.delete(cnf.ms.entity.paymentIn, item.meta.href.split('/').pop())));
            }

            let sumOrder

            invoices.forEach(async item => {
                if (item.PAYED !== 'Y') return;

                const sum = +((+item.PRICE * 100) + '.00');
                sumOrder = sum

                const dataPaymentin = {
                    organization, agent, sum,
                    operations: [
                        {
                            meta: invoiceout.meta,
                            linkedSum: sum,
                        },
                    ],
                };
                await limiter.schedule(async () => await MyStore.create('entity/paymentin', dataPaymentin))
            });

            const dataDemand = {
                organization, agent, store, description, positions,
                payedSum: sumOrder,
                applicable: false,
                customerOrder: { meta: order.meta },
            };
            let idDemand = false;

            if (order?.demands) {
                idDemand = order.demands[0].meta.href.split('/').pop();
            }
            await limiter.schedule(async () => await MyStore.upload(idDemand, 'entity/demand', dataDemand))
            await bot.sendMsg("262475445", 'Создана отгрузка заказа BX ID: ' + deal.ID + ' MS ID: ' + order.id);

            //return ctx.body = { status: 200, content: 'Ok' };
        }

        return ctx.body = 'ok'
    },
    changeOnShip: async (ctx, next) => {

        const limiter = new Bottleneck({
            minTime: 333,
            maxConcurrent: 1,
        });
        let request = ctx.request.query;
        let bx = new BX(cnf.bitrixWebhook);
        const bot = new TelegramBot(cnf.tgBot.token); //TG id

        const MyStore = new MoySklad(cnf);
        let dataOrder

        if (request.id) {
            const { deal, products, invoices, manager, contact } = await bx.getBXDeal(request.id);

            const agent = MyStore.genAgent()
            const organization = MyStore.genOrganization()
            const store = MyStore.genStore()
            const description = await limiter.schedule(async () => await MyStore.genDescription(contact, deal, manager))
            const positions = await limiter.schedule(async () => await MyStore.formatBxToMsProducts(products))
            const attributes = await limiter.schedule(async () => await MyStore.genAttributes(contact, deal, manager))
            const currentDate = MyStore.formatOrderDate()
            const dealData = await bx.getDeal(request.id);
            const name = await MyStore.getOrderName(dealData.ID)
            const state = MyStore.genState('shipment')
            const state_demand = MyStore.genState('shipment')

            dataOrder = {
                name,
                agent,
                store,
                organization,
                applicable: true,
                state,
                positions,
                attributes,
                description,
            };

            const connectOrder = await Ms_orders.findOne({ where: { 'bx_id': deal.ID } });
            const orderID = connectOrder ? connectOrder.ms_id : false;

            const order = await limiter.schedule(async () => await MyStore.upload(orderID, cnf.ms.entity.customOrder, dataOrder));

            if (!order) return;

            await bot.sendMsg("262475445", 'Заказ успешно обновлен (Статус "На отгрузке") BX ID: ' + deal.ID + ' MS ID: ' + order.id);

            if (!connectOrder) Ms_orders.create({ 'bx_id': deal.ID, 'ms_id': order.id });
            if (!order?.meta) return ctx.body = { status: 200 };

            const dataInvoices = { organization, agent, store, positions, customerOrder: { meta: order.meta } };
            let idInvoiceout = false;

            if (order?.invoicesOut) {
                idInvoiceout = order.invoicesOut[0].meta.href.split('/').pop();
            }

            const invoiceout = await limiter.schedule(async () => await MyStore.upload(idInvoiceout, cnf.ms.entity.invoiceOut, dataInvoices))
            await bot.sendMsg("262475445", 'Счет получателя заказа успешно обновлен (Статус "На отгрузке") BX ID: ' + deal.ID + ' MS ID: ' + order.id);
            if (invoiceout?.payments) {
                invoiceout.payments.forEach(async item => await limiter.schedule(async () => MyStore.delete(cnf.ms.entity.paymentIn, item.meta.href.split('/').pop())));
            }

            let sumOrder
            invoices.forEach(async item => {
                if (item.PAYED !== 'Y') return;

                const sum = +((+item.PRICE * 100) + '.00');
                sumOrder = sum

                const dataPaymentin = {
                    organization, agent, sum,
                    operations: [
                        {
                            meta: invoiceout.meta,
                            linkedSum: sum,
                        },
                    ],
                };
                await limiter.schedule(async () => await MyStore.create('entity/paymentin', dataPaymentin))
            });

            const dataDemand = {
                organization, agent, store,
                description, positions, state_demand,
                payedSum: sumOrder,
                applicable: false,
                customerOrder: { meta: order.meta },
            };
            let idDemand = false;

            if (order?.demands) {
                idDemand = order.demands[0].meta.href.split('/').pop();
            }
            await limiter.schedule(async () => await MyStore.upload(idDemand, 'entity/demand', dataDemand))
            await bot.sendMsg("262475445", 'Отгрузка заказа успешно обновлена (Статус "На отгрузке") BX ID: ' + deal.ID + ' MS ID: ' + order.id);

            //return ctx.body = { status: 200, content: 'Ok' };
        }

        return ctx.body = 'ok'
    },
    changeOnShipped: async (ctx, next) => {

        const limiter = new Bottleneck({
            minTime: 333,
            maxConcurrent: 1,
        });
        const bot = new TelegramBot(cnf.tgBot.token); //TG id
        let request = ctx.request.query;
        let bx = new BX(cnf.bitrixWebhook);

        const MyStore = new MoySklad(cnf);
        let dataOrder

        if (request.id) {
            const { deal, products, invoices, manager, contact } = await bx.getBXDeal(request.id);

            const agent = MyStore.genAgent()
            const organization = MyStore.genOrganization()
            const store = MyStore.genStore()
            const description = await limiter.schedule(async () => await MyStore.genDescription(contact, deal, manager))
            const positions = await limiter.schedule(async () => await MyStore.formatBxToMsProducts(products, false))
            const attributes = await limiter.schedule(async () => await MyStore.genAttributes(contact, deal, manager))
            const currentDate = MyStore.formatOrderDate()
            const dealData = await bx.getDeal(request.id);
            const name = await MyStore.getOrderName(dealData.ID)
            const state = MyStore.genState('sent')
            const state_demand = MyStore.genStateDemand('sent')

            let sumOrderTotal

            invoices.forEach(async item => {
                if (item.PAYED !== 'Y') return;

                const sum = +((+item.PRICE * 100) + '.00');
                sumOrderTotal = sum
            });
            dataOrder = {
                name,
                agent,
                store,
                organization,
                applicable: true,
                state,
                positions,
                attributes,
                description,
            };

            const connectOrder = await Ms_orders.findOne({ where: { 'bx_id': deal.ID } });
            const orderID = connectOrder ? connectOrder.ms_id : false;
            const order = await limiter.schedule(async () => await MyStore.upload(orderID, cnf.ms.entity.customOrder, dataOrder));

            if (!order) return;

            await bot.sendMsg("262475445", 'Заказ успешно обновлен (Статус "Отгружен") BX ID: ' + deal.ID + ' MS ID: ' + order.id);
            if (!connectOrder) Ms_orders.create({ 'bx_id': deal.ID, 'ms_id': order.id });
            if (!order?.meta) return ctx.body = { status: 200 };

            const dataInvoices = { organization, agent, store, positions, reservedSum: 0, customerOrder: { meta: order.meta } };
            let idInvoiceout = false;

            if (order?.invoicesOut) {
                idInvoiceout = order.invoicesOut[0].meta.href.split('/').pop();
            }

            const invoiceout = await limiter.schedule(async () => await MyStore.upload(idInvoiceout, cnf.ms.entity.invoiceOut, dataInvoices))
            await bot.sendMsg("262475445", 'Счет получателя заказа успешно обновлен (Статус "Отгружен") BX ID: ' + deal.ID + ' MS ID: ' + order.id);
            if (invoiceout?.payments) {
                invoiceout.payments.forEach(async item => await limiter.schedule(async () => MyStore.delete(cnf.ms.entity.paymentIn, item.meta.href.split('/').pop())));
            }

            let sumOrder

            invoices.forEach(async item => {
                if (item.PAYED !== 'Y') return;

                const sum = +((+item.PRICE * 100) + '.00');
                sumOrder = sum

                const dataPaymentin = {
                    organization, agent, sum,
                    operations: [
                        {
                            meta: invoiceout.meta,
                            linkedSum: sum,
                        },
                    ],
                };
                await limiter.schedule(async () => await MyStore.create('entity/paymentin', dataPaymentin))
            });

            const dataDemand = {
                organization, agent, store,
                description, positions, state_demand,
                payedSum: sumOrder,
                applicable: true,
                customerOrder: { meta: order.meta },
            };
            let idDemand = false;

            if (order?.demands) {
                idDemand = order.demands[0].meta.href.split('/').pop();
            }
            await limiter.schedule(async () => await MyStore.upload(idDemand, 'entity/demand', dataDemand))
            await bot.sendMsg("262475445", 'Отгрузка заказа успешно обновлена (Статус "Отгружен") BX ID: ' + deal.ID + ' MS ID: ' + order.id);

            //return ctx.body = { status: 200, content: 'Ok' };
        }

        return ctx.body = 'ok'
    },
    customAddIdDB: async (ctx, next) => {
        let request = ctx.request.query;

        if (request.quest === 'local') {
            Ms_orders.create({ 'bx_id': request.bx_id, 'ms_id': request.ms_id });
        }
    },
    getAllOrders: async (ctx, next) => {
        const MyStore = new MoySklad(cnf);
        let orders = await MyStore.getLaraOrderAll()

        for (let order of orders) {
            const connectOrder = await Ms_orders.findOne({ where: { 'bx_id': order.bxid } });
            if(!connectOrder) {
                Ms_orders.create({ 'bx_id': order.bxid, 'ms_id': order.moyskladid });
            }
        }
    },
    test: async (ctx, next) => {
        let request = ctx.request.query;
        let bx = new BX(cnf.bitrixWebhook);
        let rsTimeline = await bx.addCrmTimeline({
            "ENTITY_ID": request.id,
            "ENTITY_TYPE": "deal",
            "COMMENT": "Не указан способ доставки у сделки. Ид контакта = " + 1
        })
        console.log(rsTimeline)
    }
};