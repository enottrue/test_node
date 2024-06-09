const BX = require(global.constant.DIR_CLASSES + '/BX');
const GetCourse = require(global.constant.DIR_CLASSES + '/GetCourse');
const Tinkoff = require(global.constant.DIR_CLASSES + '/Tinkoff');
const TinkoffCredit = require(global.constant.DIR_CLASSES + '/TinkoffCredit');
const Sber = require(global.constant.DIR_CLASSES + '/Sber');
const Everypay = require(global.constant.DIR_CLASSES + '/Everypay');
const Epay = require(global.constant.DIR_CLASSES + '/Epay');
const Yookassa = require(global.constant.DIR_CLASSES + '/Yookassa');
const TelegramBot = require(global.constant.DIR_CLASSES + '/Telegram');
const Payment = require('../Models/Payment');
const Logs = require('../Models/Logs');
const globConf = require('../config.json');
const DayJS = require('dayjs')

const getActualConf = async (deal) => {
    return globConf[deal.CATEGORY_ID];
}
const getActualConfInvoice = async (deal) => {
    return globConf[deal.categoryId];
}


const completePayment = async (ctx, dataForBase) => {
    let bx = new BX(globConf.common.bitrixWebhook);
    let deal = await bx.getDeal(dataForBase.order_id);
    let confActualDeal = await getActualConf(deal)
    const bot = new TelegramBot(globConf.common.tgBot.token);

    let msg = `Оплата сделки ${dataForBase.order_id} на сумму ${dataForBase.amount} руб. Ссылка на сделку - `;

    if (deal) {
        msg += `https://crm.taroirena.ru/crm/deal/details/${dataForBase.order_id}/`;

        let user = await bx.getUsers({ ID: deal.ASSIGNED_BY_ID });
        user = user[0];

        if (user && user[confActualDeal.tgBot.fieldTelegramId] !== confActualDeal.tgBot.defaultTgId) {
            try {
                await bot.sendMsg(user[confActualDeal.tgBot.fieldTelegramId], msg);
            } catch (e) {
                await bot.sendMsg(confActualDeal.tgBot.defaultTgId, `у пользователя c ${deal.ASSIGNED_BY_ID}. Отсутствует telegram ID.`);
            }
        }

        let products = await bx.getDealProduct(deal.ID);
        products = products.filter(i => parseInt(i.PRODUCT_ID) != 113);

        dataForBase.product_amount = products.length;
        if (!dataForBase.amount)
            dataForBase.amount = products.reduce((acc, i) => acc + (+i.PRICE * i.QUANTITY), 0);

        //if (deal.STAGE_ID === ctx.cnf.oldStatus)
        //    await bx.updateDeal(dataForBase.order_id, {
        //        'STAGE_ID': ctx.cnf.newStatus
        //    });

        switch (deal.CATEGORY_ID) {
            case '1':
                if (deal.STAGE_ID === confActualDeal.oldStatus) {
                    await bx.updateDeal(dataForBase.order_id, {
                        'STAGE_ID': confActualDeal.newStatus
                    });
                }
                else if (deal.STAGE_ID === confActualDeal.candlesStatus) {
                    await bx.updateDeal(dataForBase.order_id, {
                        'STAGE_ID': confActualDeal.newStatus
                    });
                }
                break;
            case '9':
                if (deal.STAGE_ID === confActualDeal.oldStatus) {
                    await bx.updateDeal(dataForBase.order_id, {
                        'STAGE_ID': confActualDeal.newStatus
                    });
                }
                break;
            case '11':
                if (deal.STAGE_ID === confActualDeal.oldStatus) {
                    await bx.updateDeal(dataForBase.order_id, {
                        'STAGE_ID': confActualDeal.newStatus
                    });
                }
                break;
            case '2':
                if (deal.UF_CRM_1629895839 == '79') {
                    await bx.updateDeal(dataForBase.order_id, {
                        'STAGE_ID': confActualDeal.newStatus
                    });
                }
                else if (deal.UF_CRM_1629895839 == '80') {
                    if (confActualDeal.oldStatusKurs === deal.STAGE_ID || confActualDeal.oldStatusTarif === deal.STAGE_ID) {
                        await bx.updateDeal(dataForBase.order_id, {
                            'STAGE_ID': confActualDeal.partialPayStatus
                        });
                    } else if (confActualDeal.partialPayStatus === deal.STAGE_ID) {
                        await bx.updateDeal(dataForBase.order_id, {
                            'STAGE_ID': confActualDeal.newStatus
                        });
                    }
                }
                break;
            case '3':
                if (deal.UF_CRM_1629895839 == '79') {
                    if (confActualDeal.permodule.status.start_pay === deal.STAGE_ID) {
                        if (parseInt(deal.UF_CRM_1683031176) === 4) {
                            await bx.updateDeal(dataForBase.order_id, {
                                'STAGE_ID': confActualDeal.newStatus
                            });
                        }
                        else {
                            await perModuleEnd(ctx, deal);
                            await bx.updateDeal(dataForBase.order_id, {
                                'STAGE_ID': confActualDeal.permodule.status.end_pay
                            });
                        }
                    }
                    else {
                        await bx.updateDeal(dataForBase.order_id, {
                            'STAGE_ID': confActualDeal.newStatus
                        });
                    }
                }
                else if (deal.UF_CRM_1629895839 == '80') {
                    if (confActualDeal.oldStatusWebinar === deal.STAGE_ID || confActualDeal.oldStatusKurs === deal.STAGE_ID || confActualDeal.oldStatusTarif === deal.STAGE_ID) {
                        await bx.updateDeal(dataForBase.order_id, {
                            'STAGE_ID': confActualDeal.partialPayStatus
                        });
                    } else if (confActualDeal.partialPayStatus === deal.STAGE_ID) {
                        await bx.updateDeal(dataForBase.order_id, {
                            'STAGE_ID': confActualDeal.newStatus
                        });
                    }
                }
                break;
            case '8':
                if (deal.UF_CRM_1629895839 == '79') {
                    await bx.updateDeal(dataForBase.order_id, {
                        'STAGE_ID': confActualDeal.newStatus
                    });
                }
                else if (deal.UF_CRM_1629895839 == '80') {
                    if (confActualDeal.oldStatusKurs === deal.STAGE_ID || confActualDeal.oldStatusTarif === deal.STAGE_ID) {
                        await bx.updateDeal(dataForBase.order_id, {
                            'STAGE_ID': confActualDeal.partialPayStatus
                        });
                    } else if (confActualDeal.partialPayStatus === deal.STAGE_ID) {
                        await bx.updateDeal(dataForBase.order_id, {
                            'STAGE_ID': confActualDeal.newStatus
                        });
                    }
                }
                break;
            case '5':
                if (deal.UF_CRM_1629895839 == '79') {
                    await bx.updateDeal(dataForBase.order_id, {
                        'STAGE_ID': confActualDeal.newStatus
                    });
                }
                else if (deal.UF_CRM_1629895839 == '80') {
                    if (confActualDeal.oldStatusKurs === deal.STAGE_ID || confActualDeal.oldStatusTarif === deal.STAGE_ID) {
                        await bx.updateDeal(dataForBase.order_id, {
                            'STAGE_ID': confActualDeal.partialPayStatus
                        });
                    } else if (confActualDeal.partialPayStatus === deal.STAGE_ID) {
                        await bx.updateDeal(dataForBase.order_id, {
                            'STAGE_ID': confActualDeal.newStatus
                        });
                    }
                }
                break;
            case '4':
                if (deal.UF_CRM_1629895839 == '79') {
                    await bx.updateDeal(dataForBase.order_id, {
                        'STAGE_ID': confActualDeal.newStatus
                    });
                }
                else if (deal.UF_CRM_1629895839 == '80') {
                    if (confActualDeal.oldStatusKurs === deal.STAGE_ID || confActualDeal.oldStatusTarif === deal.STAGE_ID) {
                        await bx.updateDeal(dataForBase.order_id, {
                            'STAGE_ID': confActualDeal.partialPayStatus
                        });
                    } else if (confActualDeal.partialPayStatus === deal.STAGE_ID) {
                        await bx.updateDeal(dataForBase.order_id, {
                            'STAGE_ID': confActualDeal.newStatus
                        });
                    }
                }
                break;
        }
    }
    else {
        msg += '(СДЕЛКА ОТСУТСТВУЕТ)';
    }

    if (confActualDeal) await bot.sendMsg(confActualDeal.tgBot?.defaultTgId, msg);


    await Payment.create(dataForBase);
}

const completeWorkPayment = async (ctx, dataForBase) => {
    let bx = new BX(globConf.common.bitrixWebhook);
    let deal = await bx.getDeal(dataForBase.order_id);
    let confActualDeal = await getActualConf(deal)
    const bot = new TelegramBot(globConf.common.tgBot.token);

    let msg = `Оплата сделки ${dataForBase.order_id} на сумму ${dataForBase.amount} руб. Ссылка на сделку - `;

    if (deal) {
        msg += `https://crm.taroirena.ru/crm/deal/details/${dataForBase.order_id}/`;

        let user = await bx.getUsers({ ID: deal.ASSIGNED_BY_ID });
        user = user[0];

        if (user && user[confActualDeal.tgBot.fieldTelegramId] !== confActualDeal.tgBot.defaultTgId && parseInt(user[confActualDeal.tgBot.fieldTelegramId]) > 0) {
            try {
                await bot.sendMsg(user[confActualDeal.tgBot.fieldTelegramId], msg);
            } catch (e) {
                await bot.sendMsg(confActualDeal.tgBot.defaultTgId, `у пользователя c ${deal.ASSIGNED_BY_ID}. Отсутствует telegram ID.`);
            }
        }

        let products = await bx.getDealProduct(deal.ID);
        products = products.filter(i => parseInt(i.PRODUCT_ID) != 113);

        dataForBase.product_amount = products.length;
        if (!dataForBase.amount)
            dataForBase.amount = products.reduce((acc, i) => acc + (+i.PRICE * i.QUANTITY), 0);

        //if (deal.STAGE_ID === confActualDeal.prepareStatus)
        await bx.updateDeal(dataForBase.order_id, {
            'STAGE_ID': confActualDeal.newStatus
        });
    }
    else {
        msg += '(СДЕЛКА ОТСУТСТВУЕТ)';
    }

    await bot.sendMsg(confActualDeal.tgBot.defaultTgId, msg);

    await Payment.create(dataForBase);
}
const preparePayment = async (ctx, dataForBase) => {
    let bx = new BX(globConf.common.bitrixWebhook);
    let deal = await bx.getDeal(dataForBase.order_id);
    let confActualDeal = await getActualConf(deal)
    const bot = new TelegramBot(globConf.common.tgBot.token);

    let msg = `Подписание документов на рассрочку ${dataForBase.order_id} на сумму ${dataForBase.amount} руб. Ссылка на сделку - `;

    if (deal) {
        msg += `https://crm.taroirena.ru/crm/deal/details/${dataForBase.order_id}/`;

        let user = await bx.getUsers({ ID: deal.ASSIGNED_BY_ID });
        console.log('preparePayment')
        console.log(user)
        user = user[0];

        if (user && user[confActualDeal.tgBot.fieldTelegramId] !== confActualDeal.tgBot.defaultTgId && parseInt(user[confActualDeal.tgBot.fieldTelegramId]) > 0) {
            try {
                await bot.sendMsg(user[confActualDeal.tgBot.fieldTelegramId], msg);
            }
            catch (e) {
                await bot.sendMsg(confActualDeal.tgBot.defaultTgId, `у пользователя c ${deal.ASSIGNED_BY_ID}. Отсутствует telegram ID.`);
            }
        }

        let products = await bx.getDealProduct(deal.ID);
        products = products.filter(i => parseInt(i.PRODUCT_ID) != 113);

        dataForBase.product_amount = products.length;
        if (!dataForBase.amount)
            dataForBase.amount = products.reduce((acc, i) => acc + (+i.PRICE * i.QUANTITY), 0);

        await bx.updateDeal(dataForBase.order_id, {
            'STAGE_ID': confActualDeal.prepareStatus
        });

    }
    else {
        msg += '(СДЕЛКА ОТСУТСТВУЕТ)';
    }

    await bot.sendMsg(confActualDeal.tgBot.defaultTgId, msg);

    //await Payment.create(dataForBase);
}
const failedPayment = async (ctx, dataForBase) => {
    let bx = new BX(globConf.common.bitrixWebhook);
    let deal = await bx.getDeal(dataForBase.order_id);
    let confActualDeal = await getActualConf(deal)
    const bot = new TelegramBot(globConf.common.tgBot.token);

    let msg = `Рассрочка не одобрена ${dataForBase.order_id} на сумму ${dataForBase.amount} руб. Ссылка на сделку - `;

    if (deal) {
        msg += `https://crm.taroirena.ru/crm/deal/details/${dataForBase.order_id}/`;

        let user = await bx.getUsers({ ID: deal.ASSIGNED_BY_ID });
        user = user[0];

        if (user[confActualDeal.tgBot.fieldTelegramId] !== confActualDeal.tgBot.defaultTgId && user[confActualDeal.tgBot.fieldTelegramId]) {
            try {
                await bot.sendMsg(user[confActualDeal.tgBot.fieldTelegramId], msg);
            }
            catch (e) {
                await bot.sendMsg(confActualDeal.tgBot.defaultTgId, `у пользователя c ${deal.ASSIGNED_BY_ID}. Отсутствует telegram ID.`);
            }
        }

        let products = await bx.getDealProduct(deal.ID);
        products = products.filter(i => parseInt(i.PRODUCT_ID) != 113);

        dataForBase.product_amount = products.length;
        if (!dataForBase.amount)
            dataForBase.amount = products.reduce((acc, i) => acc + (+i.PRICE * i.QUANTITY), 0);

        if (deal.STAGE_ID === confActualDeal.oldStatus || deal.STAGE_ID === confActualDeal.oldStatusKurs || deal.STAGE_ID === confActualDeal.prepareStatus)
            await bx.updateDeal(dataForBase.order_id, {
                'STAGE_ID': confActualDeal.failedStatus
            });
    }
    else {
        msg += '(СДЕЛКА ОТСУТСТВУЕТ)';
    }

    await bot.sendMsg(confActualDeal.tgBot.defaultTgId, msg);

    //await Payment.create(dataForBase);
}
const failedSberbankPayment = async (ctx, dataForBase) => {
    let bx = new BX(globConf.common.bitrixWebhook);
    let deal = await bx.getDeal(dataForBase.order_id);
    let confActualDeal = await getActualConf(deal)
    const bot = new TelegramBot(globConf.common.tgBot.token);

    let msg = `Оплата отклонена ${dataForBase.order_id} на сумму ${dataForBase.amount} руб. Ссылка на сделку - `;

    if (deal) {
        msg += `https://crm.taroirena.ru/crm/deal/details/${dataForBase.order_id}/`;

        let user = await bx.getUsers({ ID: deal.ASSIGNED_BY_ID });
        user = user[0];

        if (user[confActualDeal.tgBot.fieldTelegramId] !== confActualDeal.tgBot.defaultTgId && user[confActualDeal.tgBot.fieldTelegramId]) {
            try {
                await bot.sendMsg(user[confActualDeal.tgBot.fieldTelegramId], msg);
            }
            catch (e) {
                await bot.sendMsg(confActualDeal.tgBot.defaultTgId, `у пользователя c ${deal.ASSIGNED_BY_ID}. Отсутствует telegram ID.`);
            }
        }

        let products = await bx.getDealProduct(deal.ID);
        products = products.filter(i => parseInt(i.PRODUCT_ID) != 113);

        dataForBase.product_amount = products.length;
        if (!dataForBase.amount) {
            dataForBase.amount = products.reduce((acc, i) => acc + (+i.PRICE * i.QUANTITY), 0);
        }

        await bx.updateDeal(dataForBase.order_id, {
            'STAGE_ID': confActualDeal.failedSberStatus
        });
    }
    else {
        msg += '(СДЕЛКА ОТСУТСТВУЕТ)';
    }

    await bot.sendMsg(confActualDeal.tgBot.defaultTgId, msg);

    // await Payment.create(dataForBase);
}

const sendMessageManager = async (userID, msg) => {
    const bot = new TelegramBot(globConf.common.tgBot.token);
    let bx = new BX(globConf.common.bitrixWebhook);

    let user = await bx.getUsers({ ID: userID });
    user = user[0];

    if (user && user[confActualDeal.tgBot.fieldTelegramId] !== confActualDeal.tgBot.defaultTgId) {
        try {
            await bot.sendMsg(user[confActualDeal.tgBot.fieldTelegramId], msg);
        } catch (e) {
            await bot.sendMsg(confActualDeal.tgBot.defaultTgId, `у пользователя c ${deal.ASSIGNED_BY_ID}. Отсутствует telegram ID.`);
        }
    }
}
const perModuleEnd = async (ctx, dataForBase) => {
    let weekProducts;
    let productType;
    let modulePay;
    let productID;
    let rows = [];

    let confActualDeal = await getActualConf(dataForBase)
    let bx = new BX(globConf.common.bitrixWebhook);
    let products = await bx.getDealProduct(dataForBase.ID);
    let contact = await bx.getContact(dataForBase.CONTACT_ID);
    let deal = await bx.getDeal(dataForBase.ID);

    const bot = new TelegramBot(globConf.common.tgBot.token);
    productID = products[(products.length - 1)].PRODUCT_ID

    weekProducts = confActualDeal.permodule.products['week_' + dataForBase.UF_CRM_1683265350];

    if (dataForBase.UF_CRM_1683031176.length > 0) {
        modulePay = parseInt(dataForBase.UF_CRM_1683031176) + 1
    }
    else {
        modulePay = parseInt(1)
    }

    productType = confActualDeal.permodule.source_product[productID]

    for (let itemKey in products) {
        if (parseInt(weekProducts[productType]['module_' + modulePay].crm) === parseInt(products[itemKey].PRODUCT_ID)) {
            productID = products[itemKey].PRODUCT_ID
        } else if (parseInt(weekProducts[productType]['module_' + modulePay].crm) === parseInt(parseInt(products[itemKey].PRODUCT_ID) - 1)) {
            productID = parseInt(products[itemKey].PRODUCT_ID) - 1
        }
    }
    if (parseInt(weekProducts[productType]['module_' + modulePay].crm) === parseInt(productID)) {
        if (dataForBase.STAGE_ID === confActualDeal.permodule.status.start_pay) {
            if (!contact.EMAIL || !contact.PHONE || !contact.EMAIL.length || !contact.PHONE.length) {
                if (!contact.EMAIL || !contact.EMAIL.length) {
                    await sendMessageManager(deal.ASSIGNED_BY_ID, 'У контакта не заполнен email. Сделка https://crm.taroirena.ru/crm/deal/details/' + deal.ID + '/')
                }
                if (!contact.PHONE || !contact.PHONE.length) {
                    await await sendMessageManager(deal.ASSIGNED_BY_ID, 'У контакта не заполнен номер телефона. https://crm.taroirena.ru/crm/deal/details/' + deal.ID + '/');
                }
                throw new Error('Not found email or phone in contact (deal)');
            }

            let productGCID, payment;
            let apiGetcourse;
            apiGetcourse = new GetCourse(globConf.common.getcourse.apiUrl, globConf.common.getcourse.accessToken);

            productGCID = parseInt(weekProducts[productType]['module_' + modulePay].getcourse)
            switch (dataForBase.UF_CRM_1628621924030) {
                case '72':
                case '606':
                case '695':
                case '96':
                case '290':
                    payment = 'tinkoffcredit';
                    break;
                case '73':
                case '288':
                    payment = 'sberbank';
                    break;
                case '445':
                case '525':
                // case '292':
                case '294':
                case '295':
                case '298':
                case '382':
                    payment = 'BILL';
                    break;
            }
            let response;
            response = await apiGetcourse.addDeal({
                'user': {
                    'email': contact.EMAIL[0].VALUE,
                    'phone': contact.PHONE[0].VALUE,
                    'first_name': contact.NAME,
                    // 'last_name': dataForBase.contact.LAST_NAME,
                    //'group': groupName,
                },
                'system': {
                    'refresh_if_exists': 1,
                },
                'session': {
                    'referer': 'https://edu.taroirena.ru/',
                },
                'deal': {
                    'quantity': 1,
                    'deal_cost': parseInt(dataForBase.OPPORTUNITY),
                    'deal_is_paid': "да",
                    'payment_type': payment,
                    'payment_status': 'accepted',
                    'deal_comment': 'Test',
                    'deal_status': 'in_work',
                    'offer_code': productGCID,
                }
            });
            if (response) {
                await bot.sendMsg(confActualDeal.tgBot.defaultTgId, JSON.stringify(response));
            }

            products.forEach(i => {
                rows.push({ ID: i.ID, PRODUCT_ID: i.PRODUCT_ID, PRICE: i.PRICE, QUANTITY: i.QUANTITY });
            });

            rows.push({ PRODUCT_ID: weekProducts[productType]['module_' + (modulePay + 1)].crm, PRICE: weekProducts[productType]['module_' + (modulePay + 1)].price, QUANTITY: 1 });

            await bx.updateDeal(dataForBase.ID, {
                'UF_CRM_1683031176': modulePay,
                'STAGE_ID': confActualDeal.permodule.status.end_pay
            });
            await bx.setDealProduct(dataForBase.ID, rows);
            /*


            */

            return true;
        }
    }
}
const perModuleEndOnlyGCourse = async (ctx, dataForBase) => {
    let weekProducts;
    let productType;
    let modulePay;
    let productID;
    let rows = [];

    let confActualDeal = await getActualConf(dataForBase)
    let bx = new BX(globConf.common.bitrixWebhook);
    let products = await bx.getDealProduct(dataForBase.ID);
    let contact = await bx.getContact(dataForBase.CONTACT_ID);
    let deal = await bx.getDeal(dataForBase.ID);

    const bot = new TelegramBot(globConf.common.tgBot.token);

    productID = products[(products.length - 1)].PRODUCT_ID

    weekProducts = confActualDeal.permodule.products['week_' + dataForBase.UF_CRM_1683265350];

    //if (dataForBase.UF_CRM_1683031176.length > 0) {
    modulePay = parseInt(dataForBase.UF_CRM_1683031176)
    //}
    //else {
    //    modulePay = parseInt(1)
    //}

    productType = confActualDeal.permodule.source_product[productID]

    console.log("parseInt(weekProducts[productType]['module_' + modulePay].crm)");
    console.log(parseInt(weekProducts[productType]['module_' + modulePay].crm));
    console.log("parseInt(productID)");
    console.log(parseInt(productID));

    if (parseInt(weekProducts[productType]['module_' + modulePay].crm) === parseInt(productID)) {

        if (dataForBase.STAGE_ID === confActualDeal.permodule.status.start_pay) {
            if (!contact.EMAIL || !contact.PHONE || !contact.EMAIL.length || !contact.PHONE.length) {
                if (!contact.EMAIL || !contact.EMAIL.length) {
                    await sendMessageManager(deal.ASSIGNED_BY_ID, 'У контакта не заполнен email. Сделка https://crm.taroirena.ru/crm/deal/details/' + deal.ID + '/');
                }
                if (!contact.PHONE || !contact.PHONE.length) {
                    await sendMessageManager(deal.ASSIGNED_BY_ID, 'У контакта не заполнен номер телефона. https://crm.taroirena.ru/crm/deal/details/' + deal.ID + '/');
                }
                throw new Error('Not found email or phone in contact (deal)');
            }
            let productGCID, payment;
            let apiGetcourse;
            apiGetcourse = new GetCourse(globConf.common.getcourse.apiUrl, globConf.common.getcourse.accessToken);

            productGCID = parseInt(weekProducts[productType]['module_' + modulePay].getcourse)
            switch (dataForBase.UF_CRM_1628621924030) {
                case '72':
                case '606':
                case '695':
                case '96':
                case '290':
                    payment = 'tinkoffcredit';
                    break;
                case '73':
                case '288':
                    payment = 'sberbank';
                    break;
                case '292':
                //case '292':
                case '294':
                case '295':
                case '298':
                case '382':
                    payment = 'BILL';
                    break;
            }
            let response;
            response = await apiGetcourse.addDeal({
                'user': {
                    'email': contact.EMAIL[0].VALUE,
                    'phone': contact.PHONE[0].VALUE,
                    'first_name': contact.NAME,
                    // 'last_name': dataForBase.contact.LAST_NAME,
                    //'group': groupName,
                },
                'system': {
                    'refresh_if_exists': 1,
                },
                'session': {
                    'referer': 'https://edu.taroirena.ru/',
                },
                'deal': {
                    'quantity': 1,
                    'deal_cost': parseInt(dataForBase.OPPORTUNITY),
                    'deal_is_paid': "да",
                    'payment_type': payment,
                    'payment_status': 'accepted',
                    'deal_comment': 'Test',
                    'deal_status': 'in_work',
                    'offer_code': productGCID,
                }
            });

            if (response) {
                await bot.sendMsg(confActualDeal.tgBot.defaultTgId, JSON.stringify(response));
            }
            /*
            
                        products.forEach(i => {
                            rows.push({ ID: i.ID, PRODUCT_ID: i.PRODUCT_ID, PRICE: i.PRICE, QUANTITY: i.QUANTITY });
                        });
            
                        rows.push({ PRODUCT_ID: weekProducts[productType]['module_' + (modulePay + 1)].crm, PRICE: weekProducts[productType]['module_' + (modulePay + 1)].price, QUANTITY: 1 });
            */

            /*await bx.updateDeal(dataForBase.ID, {
                'UF_CRM_1683031176': modulePay,
                'STAGE_ID': confActualDeal.permodule.status.end_pay
            });
            await bx.setDealProduct(dataForBase.ID, rows);*/
            /*


            */

            return ctx.body = 'OK';
        }
    }
}

module.exports = {
    widgetData: async (ctx) => {
        // console.log(22, ctx)
        const bankDictionary = {
            "sber": "Сбербанк",
            "tinkoffCredit": "Тинькофф Кредит",
            "everypay": "Everypay",
            "tinkoff": "Тинькофф",
            "yookassa": "Юкасса"
        }

        let payments = await Payment.getPaymentsToDay()
        let paymentsThisMonth = await Payment.getDataByPeriod()

        let cashPerBankMonthly = new Map()

        paymentsThisMonth = paymentsThisMonth.map((el, i) => {
            if (el.dataValues.data) el.dataValues.data = JSON.parse(el.dataValues.data)
            if (cashPerBankMonthly.has(el.dataValues.bank)) {
                cashPerBankMonthly.set(el.dataValues.bank, cashPerBankMonthly.get(el.dataValues.bank) + el.dataValues.amount)
            }
            else cashPerBankMonthly.set(el.dataValues.bank, el.dataValues.amount)
            return el
        })

        let cashPerBank = new Map()
        payments = payments.map((el, i) => {

            if (el.data) el.data = JSON.parse(el.data)
            if (cashPerBank.has(el.bank)) {
                cashPerBank.set(el.bank, cashPerBank.get(el.bank) + el.amount)
            }
            else cashPerBank.set(el.bank, el.amount)
            return el
        })
        let reducerAmount = 0
        let cashPerBankArray = []
        for (const el of cashPerBank) {
            cashPerBankArray.push(el)
            reducerAmount += el[1]
        }

        let reducerAmountMonthly = 0
        let cashPerBankArrayMonthly = []
        for (const el of cashPerBankMonthly) {
            cashPerBankArrayMonthly.push(el)
            reducerAmountMonthly += el[1]
        }

        ctx.body = { status: "OK", cashPerBank: cashPerBankArray, total: reducerAmount, bankDictionary, cashPerBankMonthly: cashPerBankArrayMonthly, totalMonthly: reducerAmountMonthly }
    },

    getGetcourceData: async (ctx, next) => {
        const bx = new BX(globConf.common.bitrixWebhook);
        //   console.log('bx',bx);

        const { pochta, status, telefon, stoimost, created_at } = ctx.query;
        await bx.getDealListByEmailAndFunnelId(pochta, status, telefon, 3, stoimost, created_at + 'T00:00:00+03:00', created_at + 'T23:59:59+03:00');

        return ctx.body = 'OK';
    },


    notificationSber: async (ctx, next) => {

        const bx = new BX(globConf.common.bitrixWebhook);
        let payment = ctx.request.query;

        if (!payment || !payment.token || !payment?.orderNumber) {
            ctx.response.status = 401
            ctx.body = { status: "error", message: " payment query should be provided" }
            return ctx.body
        }

        // const a = new TelegramBot(globConf.common.tgBot.token); //TG id
        // await a.sendMsg("188207447", 'DEBUG MODE ON: Sber payment is arrived. ' + JSON.stringify(payment));
        const a = new TelegramBot(globConf.common.tgBot.token); //TG id
        await a.sendMsg("262475445", 'DEBUG MODE ON: Sber payment is arrived. ' + JSON.stringify(payment));


        if (Number(payment?.status) !== 1) {
            ctx.response.status = 200
            return ctx.body = 'OK'
        }




        let orderIdSplit = payment?.orderNumber?.split('_');
        if (orderIdSplit.length > 2) {
            console.log('payment', payment)
            payment.oldOrderNumber = payment.orderNumber
            payment.orderNumber = Number(Date.now())

            // const notificationsTelegramIDs = ["188207447", "519254444", "47786751"]


            if (payment?.operation === 'deposited') {

                const bot = new TelegramBot(globConf.common.tgBot.token); //TG id
                await Logs.create({
                    order_id: payment.orderNumber ? payment.orderNumber : null,
                    data: JSON.stringify(payment),
                    bank: 'sber'
                });
                await bot.sendMsg("188207447", 'Неопознанный платеж ' + payment.oldOrderNumber + ': ' + JSON.stringify(payment));
                await bot.sendMsg("47786751", 'Неопознанный платеж ' + payment.oldOrderNumber + ': ' + JSON.stringify(payment));

                await bot.sendMsg("519254444", 'Пришла неидентифицированная оплата - Сбербанк. Скорее всего ссылка на оплату была создана вручную. Создавайте ссылки на оплату в CRM. ' + payment.oldOrderNumber + ': ' + JSON.stringify(payment));

                await Payment.create({
                    token: payment?.token || 'undefined',
                    order_id: payment.orderNumber,
                    data: JSON.stringify(payment),
                    amount: payment.amount / 100,
                    product_amount: 1,
                    bank: 'sber'
                });

            }


            ctx.response.status = 200
            ctx.body = "OK"
            return ctx.body
            // return false;
        }
        const deal = await bx.getDeal(orderIdSplit[0]);
        if (deal) {
            const confActualDeal = await getActualConf(deal)
            const bot = new TelegramBot(globConf.common.tgBot.token);
            let confSber = {}

            switch (deal[globConf.common.fieldBank]) {
                case '73': confSber = Object.assign(globConf.common.payment.sber2, confActualDeal.payment.sber2); break;
                case '288': confSber = Object.assign(globConf.common.payment.sber2, confActualDeal.payment.sber2); break;
            }
            if (payment.operation !== 'deposited') {
                ctx.response.status = 200
                ctx.body = "OK"
                return ctx.body
                // return false;
            }
            /*

            if(payment.operation !== 'deposited') {
                await bot.sendMsg(defaultTGID, 'Cбербанк ответ оплаты сделки '+payment.orderNumber+':' + JSON.stringify(payment));
                const bank = new Sber(confSber);
                switch (deal.CATEGORY_ID){
                    case '1':
                    case '3':
                    case '5':
                        if (bank.checkToken(payment)) {
                            failedSberbankPayment(ctx, {
                                token: payment.token,
                                order_id: orderIdSplit[0],
                                data: JSON.stringify(payment),
                                amount: payment.amount / 100,
                                bank: 'sber'
                            });
                        } else throw new Error('invalid token' + payment.orderNumber);
                }

                return ctx.body = 'OK';
            }
             */

            await Logs.create({
                order_id: payment.orderNumber ? payment.orderNumber : null,
                data: JSON.stringify(payment),
                bank: 'sber'
            });
            //await bot.sendMsg(confActualDeal.tgBot.defaultTgId, 'Cбербанк ответ оплаты сделки ' + payment.orderNumber + ':' + JSON.stringify(payment));
            //await bot.sendMsg(ctx.cnf.tgBot.defaultTgId, JSON.stringify(payment));

            if (+payment.status === 1) {
                const bank = new Sber(confSber);
                switch (deal.CATEGORY_ID) {
                    case '1':
                        if (bank.checkToken(payment)) {
                            completePayment(ctx, {
                                token: payment.token,
                                order_id: orderIdSplit[0],
                                data: JSON.stringify(payment),
                                amount: payment.amount / 100,
                                bank: 'sber'
                            });
                        }
                        else throw new Error('invalid token' + payment.orderNumber);
                        break;
                    case '9':
                    case '8':
                    case '5':
                    case '3':
                    case '2':
                        if (payment.amount) {
                            if (bank.checkToken(payment)) {
                                completePayment(ctx, {
                                    token: payment.token,
                                    order_id: orderIdSplit[0],
                                    data: JSON.stringify(payment),
                                    amount: payment.amount / 100,
                                    bank: 'sber'
                                });
                            } else throw new Error('invalid token' + payment.orderNumber);
                        }
                        else {
                            if (bank.checkTokenKurs(payment)) {
                                completePayment(ctx, {
                                    token: payment.token,
                                    order_id: orderIdSplit[0],
                                    data: JSON.stringify(payment),
                                    amount: payment.amount / 100,
                                    bank: 'sber'
                                });
                            } else throw new Error('invalid token' + payment.orderNumber);
                        }
                        break;
                    case '4':
                        if (payment.amount) {
                            if (bank.checkToken(payment)) {
                                completePayment(ctx, {
                                    token: payment.token,
                                    order_id: orderIdSplit[0],
                                    data: JSON.stringify(payment),
                                    amount: payment.amount / 100,
                                    bank: 'sber'
                                });
                            } else throw new Error('invalid token' + payment.orderNumber);
                        }
                        else {
                            if (bank.checkTokenKurs(payment)) {
                                completePayment(ctx, {
                                    token: payment.token,
                                    order_id: orderIdSplit[0],
                                    data: JSON.stringify(payment),
                                    amount: payment.amount / 100,
                                    bank: 'sber'
                                });
                            } else throw new Error('invalid token' + payment.orderNumber);
                        }
                        break;
                }
                /* if (bank.checkToken(payment)) {
                    completePayment(ctx, {
                        token: payment.token,
                        order_id: payment.orderNumber,
                        data: JSON.stringify(payment),
                        amount: payment.amount / 100,
                        bank: 'sber'
                    });
                } else throw new Error('invalid token' + payment.orderNumber);
                 prod api data */
            }
        }
        else {
            const orderId = payment?.orderNumber
            payment.oldOrderNumber = orderId
            payment.orderNumber = `${payment.orderNumber}_failed_validity`
            console.log(`deal with that number was not found: ${orderId}`, payment)


            if (payment?.operation === 'deposited') {
                const bot = new TelegramBot(globConf.common.tgBot.token); //TG id

                await Logs.create({
                    order_id: orderId ? orderId : null,
                    data: JSON.stringify(payment),
                    bank: 'sber'
                });

                await bot.sendMsg("188207447", 'Неопознанный платеж ' + orderId + ': ' + JSON.stringify(payment));

                await bot.sendMsg("47786751", 'Неопознанный платеж ' + payment.oldOrderNumber + ': ' + JSON.stringify(payment));

                await bot.sendMsg("519254444", 'Пришла неидентифицированная оплата - Сбербанк. Скорее всего ссылка на оплату была создана вручную. Создавайте ссылки на оплату в CRM. ' + orderId + ': ' + JSON.stringify(payment));

                await Payment.create({
                    token: payment?.token || 'undefined',
                    order_id: orderId,
                    data: JSON.stringify(payment),
                    amount: payment?.amount / 100,
                    product_amount: 1,
                    bank: 'sber'
                });



                ctx.response.status = 200
                return ctx.body = "OK"
            }


            throw new Error('Неверный ид сделки ' + payment.orderNumber)
        }


        return ctx.body = 'OK';
    },

    notificationTinkoff: async (ctx, next) => {
        let payment = ctx.request.body;
        await Logs.create({
            order_id: payment.OrderId ? payment.OrderId : null,
            data: JSON.stringify(payment),
            bank: 'tinkoff'
        });
        const bx = new BX(globConf.common.bitrixWebhook);
        let deal = await bx.getDeal(payment.OrderId);
        let confActualDeal = await getActualConf(deal)

        if (payment.Status === 'CONFIRMED') {
            let confTinkoff = {}
            switch (deal[globConf.common.fieldBank]) {
                case '72': confTinkoff = Object.assign(globConf.common.payment.tinkoff4, confActualDeal.payment.tinkoff4); break;
                case '606': confTinkoff = Object.assign(globConf.common.payment.tinkoff5, confActualDeal.payment.tinkoff5); break;
            }

            const bank = new Tinkoff(confTinkoff);
            if (bank.checkToken(payment))
                completePayment(ctx, {
                    token: ctx.request.query.token,
                    order_id: payment.OrderId,
                    amount: payment.Amount / 100,
                    data: JSON.stringify(payment),
                    bank: 'tinkoff'
                });
            else throw new Error('invalid token ' + payment.OrderId);
        }

        return ctx.body = 'OK';
    },

    notificationTinkoff2: async (ctx, next) => {
        let payment = ctx.request.body;
        await Logs.create({
            order_id: payment.OrderId ? payment.OrderId : null,
            data: JSON.stringify(payment),
            bank: 'tinkoff'
        });
        const bx = new BX(globConf.common.bitrixWebhook);
        let deal = await bx.getDeal(payment.OrderId);
        let confActualDeal = await getActualConf(deal)

        if (payment.Status === 'CONFIRMED') {
            const bank = new Tinkoff(Object.assign(globConf.common.payment.tinkoff2, confActualDeal.payment.tinkoff2));
            if (bank.checkToken(payment))
                completePayment(ctx, {
                    token: ctx.request.query.token,
                    order_id: payment.OrderId,
                    amount: payment.Amount / 100,
                    data: JSON.stringify(payment),
                    bank: 'tinkoff'
                });
            else throw new Error('invalid token ' + payment.OrderId);
        }

        return ctx.body = 'OK';
    },

    notificationTinkoff3: async (ctx, next) => {
        let payment = ctx.request.body;
        await Logs.create({
            order_id: payment.OrderId ? payment.OrderId : null,
            data: JSON.stringify(payment),
            bank: 'tinkoff'
        });
        const bx = new BX(globConf.common.bitrixWebhook);
        let deal = await bx.getDeal(payment.OrderId);
        let confActualDeal = await getActualConf(deal)

        if (payment.Status === 'CONFIRMED') {
            const bank = new Tinkoff(Object.assign(globConf.common.payment.tinkoff3, confActualDeal.payment.tinkoff3));
            if (bank.checkToken(payment))
                completePayment(ctx, {
                    token: ctx.request.query.token,
                    order_id: payment.OrderId,
                    amount: payment.Amount / 100,
                    data: JSON.stringify(payment),
                    bank: 'tinkoff'
                });
            else throw new Error('invalid token ' + payment.OrderId);
        }

        return ctx.body = 'OK';
    },

    notificationTinkoff5: async (ctx, next) => {
        let payment = ctx.request.body;
        await Logs.create({
            order_id: payment.OrderId ? payment.OrderId : null,
            data: JSON.stringify(payment),
            bank: 'tinkoff'
        });
        const bx = new BX(globConf.common.bitrixWebhook);
        let deal = await bx.getDeal(payment.OrderId);
        let confActualDeal = await getActualConf(deal)

        if (payment.Status === 'CONFIRMED') {
            const bank = new Tinkoff(Object.assign(globConf.common.payment.tinkoff5, confActualDeal.payment.tinkoff5));
            if (bank.checkToken(payment))
                completePayment(ctx, {
                    token: ctx.request.query.token,
                    order_id: payment.OrderId,
                    amount: payment.Amount / 100,
                    data: JSON.stringify(payment),
                    bank: 'tinkoff'
                });
            else throw new Error('invalid token ' + payment.OrderId);
        }

        return ctx.body = 'OK';
    },

    notificationEveryPay: async (ctx, next) => {
        const bx = new BX(globConf.common.bitrixWebhook);
        let payment = ctx.request.query;
        //throw new Error('invalid token EveryPay');
        let orderIdSplit = payment.order_reference.split('_');
        const deal = await bx.getDeal(orderIdSplit[0]);
        const confActualDeal = await getActualConf(deal)

        const a = new TelegramBot(globConf.common.tgBot.token); //TG id
        await a.sendMsg("262475445", 'DEBUG MODE ON: Everypay1 payment is arrived. ' + JSON.stringify(payment));

        const bank = new Everypay(Object.assign(globConf.common.payment.every_pay, confActualDeal.payment.every_pay));
        let currentInvoiceData = await bank.getDataById(payment);
        payment.currentInvoiceData = currentInvoiceData;
        console.log('Everypay debug payment data', payment?.event_name, payment)

        await Logs.create({
            order_id: payment.payment_reference ? payment.payment_reference : null,
            data: JSON.stringify(payment),
            bank: 'every-pay'
        });


        let checkPayment = await bank.checkToken(payment);
        if (checkPayment !== false) {
            switch (checkPayment) {
                case 'failed':
                    //failedSberbankPayment(ctx, {
                    //    token: ctx.request.query.token,
                    //    order_id: orderIdSplit[0],
                    //    data: JSON.stringify(payment),
                    //    bank: 'everypay'
                    //});
                    break;
                case 'settled':
                    if (payment.event_name === 'status_updated') {
                        completePayment(ctx, {
                            token: ctx.request.query.token,
                            order_id: orderIdSplit[0],
                            data: JSON.stringify(payment),
                            bank: 'everypay'
                        });
                    }
                    break;
            }
        }

        return ctx.body = 'OK';
    },

    notificationEveryPay2: async (ctx, next) => {
        const bx = new BX(globConf.common.bitrixWebhook);
        let payment = ctx.request.query;
        //throw new Error('invalid token EveryPay');
        let orderIdSplit = payment.order_reference.split('_');

        const deal = await bx.getDeal(orderIdSplit[0]);
        const confActualDeal = await getActualConf(deal)

        if (!orderIdSplit[0]) {
            throw new Error('Not found deal id (deal)');
        }
        const bank = new Everypay(Object.assign(globConf.common.payment.every_pay2, confActualDeal.payment.every_pay2));
        let currentInvoiceData = await bank.getDataById(payment);
        payment.currentInvoiceData = currentInvoiceData;
        console.log('Everypay 2 debug payment data', payment?.event_name, payment)

        const a = new TelegramBot(globConf.common.tgBot.token); //TG id
        await a.sendMsg("262475445", 'DEBUG MODE ON: everypay2 payment is arrived. ' + JSON.stringify(payment));
        await a.sendMsg("262475445", 'DEBUG MODE ON: everypay2 payment is arrived. ' + JSON.stringify(orderIdSplit));

        await Logs.create({
            order_id: payment.payment_reference ? payment.payment_reference : null,
            data: JSON.stringify(payment),
            bank: 'every-pay'
        });
        if (payment.event_name && payment.event_name === 'refunded') {
            let msg = `Возврат оплаты сделки ${orderIdSplit[0]}. Ссылка на сделку - `;

            if (deal) {
                msg += `https://crm.taroirena.ru/crm/deal/details/${orderIdSplit[0]}/`;

                let user = await bx.getUsers({ ID: deal.ASSIGNED_BY_ID });
                user = user[0];

                if (user && user[confActualDeal.tgBot.fieldTelegramId] !== confActualDeal.tgBot.defaultTgId) {
                    try {
                        await a.sendMsg(user[confActualDeal.tgBot.fieldTelegramId], msg);
                    } catch (e) {
                        await a.sendMsg(confActualDeal.tgBot.defaultTgId, `у пользователя c ${deal.ASSIGNED_BY_ID}. Отсутствует telegram ID.`);
                    }
                }
            }
            else {
                msg += '(СДЕЛКА ОТСУТСТВУЕТ)';
            }
            if (confActualDeal) await a.sendMsg(confActualDeal.tgBot?.defaultTgId, msg);

            return ctx.body = 'OK';
        }

        let checkPayment = await bank.checkToken(payment);

        if (checkPayment !== false) {
            switch (checkPayment) {
                case 'failed':
                    //failedSberbankPayment(ctx, {
                    //    token: ctx.request.query.token,
                    //    order_id: orderIdSplit[0],
                    //    data: JSON.stringify(payment),
                    //    bank: 'everypay'
                    //});
                    break;
                case 'settled':
                    await a.sendMsg("262475445", 'DEBUG MODE ON: everypay2 payment is arrived. ' + JSON.stringify(checkPayment));
                    if (payment.event_name === 'status_updated') {
                        completePayment(ctx, {
                            token: ctx.request.query.token,
                            order_id: orderIdSplit[0],
                            data: JSON.stringify(payment),
                            bank: 'everypay'
                        });
                    }
                    break;
            }
        }

        return ctx.body = 'OK';
    },

    notificationEveryPay3: async (ctx, next) => {
        const bx = new BX(globConf.common.bitrixWebhook);
        const a = new TelegramBot(globConf.common.tgBot.token); //TG id
        let payment = ctx.request.query;
        //throw new Error('invalid token EveryPay');
        let pReference = payment.order_reference.replace('-', '_')
        let orderIdSplit = pReference.split('_');

        const deal = await bx.getDeal(orderIdSplit[0]);
        const confActualDeal = await getActualConf(deal)

        if (!orderIdSplit[0]) {
            throw new Error('Not found deal id (deal)');
        }
        let bank// = new Everypay(Object.assign(globConf.common.payment.every_pay3, confActualDeal.payment.every_pay3));
        if (deal) {
            switch (deal.UF_CRM_1628621924030) {
                case '525':
                    bank = new Everypay(globConf.common.payment.every_pay3);
                    break;
                case '528':
                    bank = new Everypay(globConf.common.payment.every_pay4);
                    break;
                case '527':
                    bank = new Everypay(globConf.common.payment.every_pay5);
                    break;
                case '529':
                    bank = new Everypay(globConf.common.payment.every_pay6);
                    break;
            }
        }
        await a.sendMsg("262475445", 'DEBUG MODE ON: everypay2 payment is arrived. ' + JSON.stringify(payment));

        //let currentInvoiceData = await bank.getDataById(payment);

        //payment.currentInvoiceData = currentInvoiceData;
        //console.log('Everypay 2 debug payment data', payment?.event_name, payment)

        await a.sendMsg("262475445", 'DEBUG MODE ON: everypay2 payment is arrived. ' + JSON.stringify(payment));
        await a.sendMsg("262475445", 'DEBUG MODE ON: everypay2 payment is arrived. ' + JSON.stringify(orderIdSplit));

        await Logs.create({
            order_id: payment.payment_reference ? payment.payment_reference : null,
            data: JSON.stringify(payment),
            bank: 'every-pay'
        });
        if (payment.event_name && payment.event_name === 'refunded') {
            let msg = `Возврат оплаты сделки ${orderIdSplit[0]}. Ссылка на сделку - `;

            if (deal) {
                msg += `https://crm.taroirena.ru/crm/deal/details/${orderIdSplit[0]}/`;

                let user = await bx.getUsers({ ID: deal.ASSIGNED_BY_ID });
                user = user[0];

                if (user && user[confActualDeal.tgBot.fieldTelegramId] !== confActualDeal.tgBot.defaultTgId) {
                    try {
                        await a.sendMsg(user[confActualDeal.tgBot.fieldTelegramId], msg);
                    } catch (e) {
                        await a.sendMsg(confActualDeal.tgBot.defaultTgId, `у пользователя c ${deal.ASSIGNED_BY_ID}. Отсутствует telegram ID.`);
                    }
                }
            }
            else {
                msg += '(СДЕЛКА ОТСУТСТВУЕТ)';
            }
            if (confActualDeal) await a.sendMsg(confActualDeal.tgBot?.defaultTgId, msg);

            return ctx.body = 'OK';
        }

        let checkPayment = await bank.checkToken(payment);

        if (checkPayment !== false) {
            switch (checkPayment) {
                case 'failed':
                    //failedSberbankPayment(ctx, {
                    //    token: ctx.request.query.token,
                    //    order_id: orderIdSplit[0],
                    //    data: JSON.stringify(payment),
                    //    bank: 'everypay'
                    //});
                    break;
                case 'settled':
                    await a.sendMsg("262475445", 'DEBUG MODE ON: everypay2 payment is arrived. ' + JSON.stringify(checkPayment));
                    if (payment.event_name === 'status_updated') {
                        completePayment(ctx, {
                            token: ctx.request.query.token,
                            order_id: orderIdSplit[0],
                            data: JSON.stringify(payment),
                            bank: 'everypay'
                        });
                    }
                    break;
            }
        }

        return ctx.body = 'OK';
    },

    everyPayClientCheck: async (ctx, next) => {
        const bx = new BX(globConf.common.bitrixWebhook);
        let payment = ctx.request.query;

        const a = new TelegramBot(globConf.common.tgBot.token); //TG id
        await a.sendMsg("262475445", 'DEBUG MODE ON: EverpayCheckClient payment is arrived. ' + JSON.stringify(payment));
        if (payment.order_reference) {
            const dealID = payment.order_reference.split('-')
            const deal = await bx.getDeal(dealID[0])
            let bank
            let checkPayment
            if (deal) {
                switch (deal.UF_CRM_1628621924030) {
                    case '445':
                        bank = new Everypay(globConf.common.payment.every_pay2);
                        checkPayment = await bank.checkToken(payment);

                        if (checkPayment) {
                            if (checkPayment === 'settled') {
                                return ctx.redirect(globConf.common.payment.every_pay2.success);
                            } else {
                                return ctx.redirect(globConf.common.payment.every_pay2.fail);
                            }
                        } else {
                            return ctx.redirect(globConf.common.payment.every_pay2.fail);
                        }
                        break;
                    case '525':
                        bank = new Everypay(globConf.common.payment.every_pay3);
                        checkPayment = await bank.checkToken(payment);

                        if (checkPayment) {
                            if (checkPayment === 'settled') {
                                return ctx.redirect(globConf.common.payment.every_pay3.success);
                            } else {
                                return ctx.redirect(globConf.common.payment.every_pay3.fail);
                            }
                        } else {
                            return ctx.redirect(globConf.common.payment.every_pay3.fail);
                        }
                        break;
                    case '528':
                        bank = new Everypay(globConf.common.payment.every_pay4);
                        checkPayment = await bank.checkToken(payment);

                        if (checkPayment) {
                            if (checkPayment === 'settled') {
                                return ctx.redirect(globConf.common.payment.every_pay4.success);
                            } else {
                                return ctx.redirect(globConf.common.payment.every_pay4.fail);
                            }
                        } else {
                            return ctx.redirect(globConf.common.payment.every_pay4.fail);
                        }
                        break;
                    case '527':
                        bank = new Everypay(globConf.common.payment.every_pay5);
                        checkPayment = await bank.checkToken(payment);

                        if (checkPayment) {
                            if (checkPayment === 'settled') {
                                return ctx.redirect(globConf.common.payment.every_pay5.success);
                            } else {
                                return ctx.redirect(globConf.common.payment.every_pay5.fail);
                            }
                        } else {
                            return ctx.redirect(globConf.common.payment.every_pay5.fail);
                        }
                        break;
                    case '529':
                        bank = new Everypay(globConf.common.payment.every_pay6);
                        checkPayment = await bank.checkToken(payment);

                        if (checkPayment) {
                            if (checkPayment === 'settled') {
                                return ctx.redirect(globConf.common.payment.every_pay6.success);
                            } else {
                                return ctx.redirect(globConf.common.payment.every_pay6.fail);
                            }
                        } else {
                            return ctx.redirect(globConf.common.payment.every_pay6.fail);
                        }
                        break;
                }
            }
        }
    },

    notificationYookassa: async (ctx, next) => {
        const bx = new BX(globConf.common.bitrixWebhook);
        let payment = ctx.request.body;
        //throw new Error('invalid token EveryPay');
        const dealID = payment.object.metadata.deal
        //const deal = await bx.getDeal(dealID);
        //const confActualDeal = await getActualConf(deal)

        if (!dealID) {
            throw new Error('Not found deal id (deal)');
        }
        //const bank = new Yookassa(globConf.common.payment.yookassa);
        //let paymentStatus = await bank.checkToken(payment);

        const a = new TelegramBot(globConf.common.tgBot.token); //TG id
        await a.sendMsg("262475445", 'DEBUG MODE ON: Yookassa payment is arrived. ' + JSON.stringify(payment));

        await Logs.create({
            order_id: payment.object.id,
            data: JSON.stringify(payment),
            bank: 'yookassa'
        });

        //let checkPayment = await bank.checkToken(payment);

        if (payment.event === 'payment.succeeded' || payment.object.status === 'succeeded') {
            completePayment(ctx, {
                token: ctx.request.query.token,
                order_id: dealID,
                data: JSON.stringify(payment),
                bank: 'yookassa'
            });
        }

        return ctx.body = 'OK';
    },

    yookassaClientCheck: async (ctx, next) => {
        const bx = new BX(globConf.common.bitrixWebhook);
        let payment = ctx.request.query;
        //throw new Error('invalid token EveryPay');
        //const dealID = payment.metadata.deal
        const deal = await bx.getDeal(payment.deal);
        //const confActualDeal = await getActualConf(deal)
        const idOrder = deal[globConf.common.fieldUrlPayment].split('?orderId=')[1]
        //if (!dealID) {
        //    throw new Error('Not found deal id (deal)');
        //}
        //const bank = new Yookassa(globConf.common.payment.yookassa);

        let confYookassa;
        switch (deal[globConf.common.fieldBank]) {
            case '512':
                confYookassa = globConf.common.payment.yookassa;
                break;
            case '714':
                confYookassa = globConf.common.payment.yookassaIv;
                break;
        }
        const bank = new Yookassa(confYookassa);

        const a = new TelegramBot(globConf.common.tgBot.token); //TG id
        await a.sendMsg("262475445", 'DEBUG MODE ON: Yookassa payment is arrived. ' + JSON.stringify(payment));

        if (idOrder) {
            let checkPayment = await bank.checkToken(idOrder);

            if (checkPayment) {
                if (checkPayment.status === 'succeeded') {
                    return ctx.redirect(globConf.common.payment.yookassa.success);
                }
            }
            else {
                return ctx.redirect(globConf.common.payment.yookassa.fail);
            }
        }
        else {
            await a.sendMsg("262475445", 'Yookassa link pay. ' + JSON.stringify(deal[globConf.common.fieldUrlPayment]));
        }
    },

    notificationEPay: async (ctx, next) => {
        let payment = ctx.request.body;
        let token = ctx.request.query.api;
        //throw new Error('invalid token EveryPay');
        //let orderIdSplit = payment.order_reference.split('_');

        const bank = new Epay(globConf.common.payment.epay);
        //let currentInvoiceData = await bank.getDataById(payment);
        //payment.currentInvoiceData = currentInvoiceData;
        //console.log('currentInvoiceData', currentInvoiceData)

        await Logs.create({
            order_id: payment.invoiceId ? parseInt(payment.invoiceId) : null,
            data: JSON.stringify(payment),
            bank: 'ePay'
        });

        let checkPayment = await bank.checkToken(payment, token);
        if (checkPayment !== false) {
            switch (payment.code) {
                case 'error':
                    //failedSberbankPayment(ctx, {
                    //    token: ctx.request.query.token,
                    //    order_id: orderIdSplit[0],
                    //    data: JSON.stringify(payment),
                    //    bank: 'ePay'
                    //});
                    break;
                case 'ok':
                    completePayment(ctx, {
                        token: ctx.request.query.token,
                        order_id: parseInt(payment.invoiceId),
                        data: JSON.stringify(payment),
                        bank: 'ePay'
                    });
                    break;
            }
        }

        return ctx.body = 'OK';
    },

    createPaymentInvoice: async (ctx, next) => { //формирование ссылки для счета - новый.

        let confActualInvoice = await getActualConfInvoice(ctx.bitrix.invoice.item, ctx.request.query.token);

        const a = new TelegramBot(globConf.common.tgBot.token); //TG id
        if (!ctx.bitrix.contact.EMAIL || !ctx.bitrix.contact.PHONE || !ctx.bitrix.contact.EMAIL.length || !ctx.bitrix.contact.PHONE.length) {
            if (!ctx.bitrix.contact.EMAIL || !ctx.bitrix.contact.EMAIL.length) {
                await sendMessageManager(ctx.bitrix.deal.ASSIGNED_BY_ID, 'У контакта не заполнен email. Сделка https://crm.taroirena.ru/crm/deal/details/' + ctx.bitrix.deal.ID + '/');
            }
            if (!ctx.bitrix.contact.PHONE || !ctx.bitrix.contact.PHONE.length) {
                await sendMessageManager(ctx.bitrix.deal.ASSIGNED_BY_ID, 'У контакта не заполнен номер телефона. https://crm.taroirena.ru/crm/deal/details/' + ctx.bitrix.deal.ID + '/');
            }
            throw new Error('Not found email or phone in contact (deal)');
        }

        let bank = false;
        switch (String(ctx.bitrix.invoice.item[globConf.common.fieldBankInvoice])) {
            case '573':
                bank = new Yookassa(globConf.common.payment.yookassaIv);
                break;
            case '574':
                //console.log('globConf.common.payment.tinkoff5', globConf.common.payment.tinkoff4);
                bank = new Tinkoff(Object.assign(globConf.common.payment.tinkoff5, confActualInvoice.payment.tinkoff5));

                break;
            // case '575': 
            //     bank = new TinkoffCredit(Object.assign(globConf.common.payment.tinkoffCredit2, confActualInvoice.payment.tinkoffCredit2)); 
            //     break;
        }
        if (bank) {
            let paymentUrl;
            //console.log('ctx.bitrix.products',ctx.bitrix.products);
            paymentUrl = await bank.init(ctx.bitrix.invoice.item.id, ctx.bitrix.products, {
                payment_subject: ctx.bitrix.invoice.item.ufCrm_SMART_INVOICE_1717418582494.toString(),
                payment_mode: ctx.bitrix.invoice.item.ufCrm_6655898E06390.toString(),
                email: ctx.bitrix.contact.EMAIL[0].VALUE,
                phone: ctx.bitrix.contact.PHONE[0].VALUE,
                description: ctx.bitrix.products.reduce((acc, p) => acc + `${p.PRODUCT_NAME = p.PRODUCTNAME} ${p.QUANTITY}шт\n`, '')
            }, ctx.bitrix.invoice[globConf.common.fieldPayTypeViewInvoice]);

            if (paymentUrl) {
                let bx = new BX(globConf.common.bitrixWebhook);
                let updateData = {};
                updateData[globConf.common.fieldUrlPaymentInvoice] = paymentUrl;
                await bx.updateInvoice(ctx.bitrix.invoice.item.id, ctx.bitrix.invoice.item.entityTypeId, updateData);
            }
        }
        else {
            await sendMessageManager(ctx.bitrix.deal.ASSIGNED_BY_ID, 'Выбран неверный банк (Invoice). Сделка https://crm.taroirena.ru/crm/deal/details/' + ctx.bitrix.deal.ID + '/');
            throw new Error('Bank not init (invoice)' + JSON.stringify(ctx.bitrix.deal[globConf.common.fieldBankInvoice]));

        }
        return ctx.body = 'OK';
    },

    createPayment: async (ctx, next) => {
        let confActualDeal = await getActualConf(ctx.bitrix.deal, ctx.request.query.token);

        const a = new TelegramBot(globConf.common.tgBot.token); //TG id
        if (!ctx.bitrix.contact.EMAIL || !ctx.bitrix.contact.PHONE || !ctx.bitrix.contact.EMAIL.length || !ctx.bitrix.contact.PHONE.length) {
            if (!ctx.bitrix.contact.EMAIL || !ctx.bitrix.contact.EMAIL.length) {
                await sendMessageManager(ctx.bitrix.deal.ASSIGNED_BY_ID, 'У контакта не заполнен email. Сделка https://crm.taroirena.ru/crm/deal/details/' + ctx.bitrix.deal.ID + '/');
            }
            if (!ctx.bitrix.contact.PHONE || !ctx.bitrix.contact.PHONE.length) {
                await sendMessageManager(ctx.bitrix.deal.ASSIGNED_BY_ID, 'У контакта не заполнен номер телефона. https://crm.taroirena.ru/crm/deal/details/' + ctx.bitrix.deal.ID + '/');
            }
            throw new Error('Not found email or phone in contact (deal)');
        }

        let bank = false;

        switch (ctx.bitrix.deal[globConf.common.fieldBank]) {
            case '73': bank = new Sber(Object.assign(globConf.common.payment.sber2, confActualDeal.payment.sber2)); break;
            case '72': bank = new Tinkoff(Object.assign(globConf.common.payment.tinkoff4, confActualDeal.payment.tinkoff4)); break;
            case '606': bank = new Tinkoff(Object.assign(globConf.common.payment.tinkoff5, confActualDeal.payment.tinkoff5)); break;
            case '695': bank = new Tinkoff(Object.assign(globConf.common.payment.tinkoff6, confActualDeal.payment.tinkoff6)); break;

            //case '72': bank = new Tinkoff(Object.assign(globConf.common.payment.tinkoff5, confActualDeal.payment.tinkoff5)); break;
            case '96': bank = new TinkoffCredit(Object.assign(globConf.common.payment.tinkoffCredit, confActualDeal.payment.tinkoffCredit)); break;
            case '439': bank = new TinkoffCredit(Object.assign(globConf.common.payment.tinkoffCredit2, confActualDeal.payment.tinkoffCredit2)); break;
            case '288': bank = new Sber(Object.assign(globConf.common.payment.sber2, confActualDeal.payment.sber2)); break;
            case '290': bank = new Tinkoff(Object.assign(globConf.common.payment.tinkoff2, confActualDeal.payment.tinkoff2)); break;
            //case '445': bank = new Everypay(Object.assign(globConf.common.payment.every_pay, confActualDeal.payment.every_pay)); break;
            //case '292': bank = new Everypay(Object.assign(globConf.common.payment.every_pay, confActualDeal.payment.every_pay)); break;
            //case '382': bank = new Everypay(Object.assign(globConf.common.payment.every_pay2, confActualDeal.payment.every_pay2)); break;
            case '445': bank = new Everypay(Object.assign(globConf.common.payment.every_pay2, confActualDeal.payment.every_pay2)); break;
            case '525': bank = new Everypay(Object.assign(globConf.common.payment.every_pay3, confActualDeal.payment.every_pay3)); break;
            case '528': bank = new Everypay(Object.assign(globConf.common.payment.every_pay4, confActualDeal.payment.every_pay4)); break;
            case '527': bank = new Everypay(Object.assign(globConf.common.payment.every_pay5, confActualDeal.payment.every_pay5)); break;
            case '529': bank = new Everypay(Object.assign(globConf.common.payment.every_pay6, confActualDeal.payment.every_pay6)); break;
            case '435': bank = new Tinkoff(Object.assign(globConf.common.payment.tinkoff3, confActualDeal.payment.tinkoff3)); break;
            case '512': bank = new Yookassa(globConf.common.payment.yookassa); break;
            case '714': bank = new Yookassa(globConf.common.payment.yookassaIv); break;
            case '294': bank = false; break;
        }

        if (bank) {
            //process.stdout.write('ResponseTinkoffbank' + JSON.stringify(ctx.bitrix.deal[globConf.common.fieldBank]) + '\n')
           // console.log(`inside of IF message`)


            let paymentUrl;
            if (parseInt(ctx.bitrix.deal[globConf.common.fieldBank]) === 96) {
                if (globConf.common.customFields[globConf.common.deliveryField][ctx.bitrix.deal[globConf.common.deliveryField]]) {
                    paymentUrl = await bank.init(ctx.bitrix.deal.ID, ctx.bitrix.products, {
                        payment_subject: ctx.bitrix.deal.UF_CRM_1717148401632,
                        payment_mode: ctx.bitrix.deal.UF_CRM_1629895839,
                        email: ctx.bitrix.contact.EMAIL[0].VALUE,
                        phone: ctx.bitrix.contact.PHONE[0].VALUE,
                        description: ctx.bitrix.products.reduce((acc, p) => acc + `${p.PRODUCT_NAME} ${p.QUANTITY}шт\n`, '') +
                            globConf.common.customFields[globConf.common.deliveryField][ctx.bitrix.deal[globConf.common.deliveryField]]
                    }, ctx.bitrix.deal[globConf.common.fieldPayTypeView]
                    );
                }
                else {
                    paymentUrl = await bank.init(ctx.bitrix.deal.ID, ctx.bitrix.products, {
                        payment_subject: ctx.bitrix.deal.UF_CRM_1717148401632,
                        payment_mode: ctx.bitrix.deal.UF_CRM_1629895839,
                        email: ctx.bitrix.contact.EMAIL[0].VALUE,
                        phone: ctx.bitrix.contact.PHONE[0].VALUE,
                        description: ctx.bitrix.products.reduce((acc, p) => acc + `${p.PRODUCT_NAME} ${p.QUANTITY}шт\n`, '')
                    }, ctx.bitrix.deal[globConf.common.fieldPayTypeView]
                    );
                }
            }
            else {
                switch (ctx.bitrix.deal.CATEGORY_ID) {
                    case '1':
                        let delivery
                        if (globConf.common.customFields[globConf.common.deliveryField]) {
                            delivery = globConf.common.customFields[globConf.common.deliveryField][ctx.bitrix.deal[globConf.common.deliveryField]]
                        }
                        paymentUrl = await bank.init(ctx.bitrix.deal.ID, ctx.bitrix.products, {
                            payment_subject: ctx.bitrix.deal.UF_CRM_1717148401632,
                            payment_mode: ctx.bitrix.deal.UF_CRM_1629895839,
                            email: ctx.bitrix.contact.EMAIL[0].VALUE,
                            phone: ctx.bitrix.contact.PHONE[0].VALUE,
                            description: ctx.bitrix.products.reduce((acc, p) => acc + `${p.PRODUCT_NAME} ${p.QUANTITY}шт\n`, '') +
                                (delivery ? delivery : '')
                        }, ctx.bitrix.deal[globConf.common.fieldPayTypeView]);
                        break;
                    default:
                        paymentUrl = await bank.init(ctx.bitrix.deal.ID, ctx.bitrix.products, {
                            payment_subject: ctx.bitrix.deal.UF_CRM_1717148401632,
                            payment_mode: ctx.bitrix.deal.UF_CRM_1629895839,
                            email: ctx.bitrix.contact.EMAIL[0].VALUE,
                            phone: ctx.bitrix.contact.PHONE[0].VALUE,
                            description: ctx.bitrix.products.reduce((acc, p) => acc + `${p.PRODUCT_NAME} ${p.QUANTITY}шт\n`, '')
                        }, ctx.bitrix.deal[globConf.common.fieldPayTypeView]);
                        break;
                }
            }

            if (paymentUrl) {
                let bx = new BX(globConf.common.bitrixWebhook);
                let updateData = {};
                updateData[globConf.common.fieldUrlPayment] = paymentUrl;
                await bx.updateDeal(ctx.bitrix.deal.ID, updateData);
            }
        }
        else {
            await sendMessageManager(ctx.bitrix.deal.ASSIGNED_BY_ID, 'Выбран неверный банк. Сделка https://crm.taroirena.ru/crm/deal/details/' + ctx.bitrix.deal.ID + '/');
            throw new Error('Bank not init' + JSON.stringify(ctx.bitrix.deal[globConf.common.fieldBank]));
        }

        return ctx.body = 'OK';
    },

    notificationTinkoffCredit: async (ctx, next) => {
        globConf = require('../config.json');
        console.log(globConf);
        
      //  console.log(globConf.common.bitrixWebhook);
        let payment = ctx.request.body;
        const bx = new BX(globConf.common.bitrixWebhook);
        let orderSplit = payment.id.split('_');
        let orderID = 0;
        if (orderSplit.length) {
            orderID = orderSplit[0];
        }
        else {
            orderID = payment.id;
        }const rp = require('request-promise');
const jsSHA = require("jssha");
const helpers = require(global.constant.DIR_HELPERS + "/common");
const globConf = require("../modules/Acquire/config.json");

module.exports = class Yookassa {
    #baseUrl;
    #returnedUrl;
    #username;
    #secret;

    constructor(configYookassa) {
        this.#baseUrl = configYookassa.urlApi;
        this.#returnedUrl = configYookassa.returnUrl;
        this.#username = configYookassa.username;
        this.#secret = configYookassa.secret;
    }

    async init(dealID, products, info) {
        let date = new Date()
        let existCandles = false;
        let items = [];
        let payment_subject
        let payment_mode;

        switch (info.payment_mode) {
            case '79':
                payment_mode = 'full_payment';
                break;    
            case '80':
                payment_mode = 'partial_prepayment';
                break;
            case '616':
                payment_mode = 'full_payment';
                break;
            case '617':
                payment_mode = 'partial_prepayment';
                break;
                default:
        // Логика по умолчанию
        }
        switch (info.payment_subject) {
                //deal
            case '717':
                payment_subject = 'service';
                break;
            case '716':
                payment_subject = 'commodity';
                break;
                //invoice
            case '720':
                payment_subject = 'commodity'; 
                    break;
            case '721':
                payment_subject = 'service';
                    break;
            default:
            // Логика по умолчанию
        }

        products.forEach(item => {
            switch (item.PRODUCT_ID) {
                case 409:
                case 410:
                case 411:
                case 412:
                case 413:
                case 414:
                case 415:
                case 416:
                case 417:
                case 418:
                    existCandles = true;
                    break;
            }
            items.push({
                description: item.PRODUCT_NAME,
                amount: {
                    value: item.PRICE,
                    currency: 'RUB'
                },
                vat_code: 1,
                payment_mode: payment_mode,
                payment_subject: payment_subject,
                quantity: item.QUANTITY
            })
        })

        let productAmount = (products.reduce((acc, i) => acc + (+i.PRICE * i.QUANTITY), 0))
        let amount = productAmount//await this.convertCurrency(productAmount);
        let data;
        //let timestamp = new Date();
        
        data = {
            amount: {
                value: amount,
                currency: 'RUB'
            },
            receipt: {
                customer: {
                    email: info.email,
                    phone: info.phone.replace(/[^0-9]/g, '')
                },
                items: items,
                tax_system_code: 6
            },
            //recipient: {
            //    gateway_id: 240188
            //},
            capture: true,
            description: '№' + dealID + ' ' + info.description + `(${amount}р.)`,
            metadata: {
                deal: dealID,
                phoneTest: info.phone
            },
            confirmation: {
                type: 'redirect',
                return_url: this.#returnedUrl + '?deal=' + dealID
            },
        }

        process.stdout.write('Response items Yookassa: ' + JSON.stringify(items) + '\n');

        let response;
        const auth = 'Basic ' + new Buffer(this.#username + ':' + this.#secret).toString('base64');


        do {
            response = await rp({
                method: 'POST',
                uri: this.#baseUrl,
                body: data,
                json: true,
                headers: {
                    'Authorization': auth,
                    'Idempotence-Key': dealID + date.getTime()
                },
            });
        } while (response.errorCode === '1')

        if (response.confirmation) {
            return response.confirmation.confirmation_url;
        }
        else helpers.telegramLog({ ...response, dealID });

        return false;
    }

    async checkToken(data) {
        const auth = 'Basic ' + new Buffer(this.#username + ':' + this.#secret).toString('base64');
        let response = await rp({
            method: 'GET',
            uri: this.#baseUrl + '/' + data,
            json: true,
            headers: {
                'Authorization': auth
            },
        });
        if (response) {
            return response
        }
        else {
            return false
        }
    }

}
        let deal = await bx.getDeal(orderID);

        let confActualDeal = await getActualConf(deal)
        const bot = new TelegramBot(globConf.common.tgBot.token);

        await Logs.create({
            order_id: orderID ? orderID : null,
            data: JSON.stringify(payment),
            bank: 'tinkoffCredit'
        });
        // const bank = new TinkoffCredit(ctx.cnf.tinkoffCredit);
        await bot.sendMsg("262475445", 'DEBUG MODE ON: TCS payment is arrived. ' + JSON.stringify(payment));
        await bot.sendMsg('262475445', 'Тинькофф (Рассрочка) ответ оплаты сделки ' + orderID + ':' + JSON.stringify(payment));
        if (parseInt(deal.CATEGORY_ID) === 3) {
            switch (payment.status) {
                case 'approved':
                    if (orderID)
                        preparePayment(ctx, {
                            token: ctx.request.query.token,
                            order_id: orderID,
                            amount: payment.order_amount,
                            data: JSON.stringify(payment),
                            bank: 'tinkoffCredit'
                        });
                    else throw new Error('invalid token' + orderID);
                    break;
                case 'signed':
                    if (orderID)
                        completeWorkPayment(ctx, {
                            token: ctx.request.query.token,
                            order_id: orderID,
                            amount: payment.order_amount,
                            data: JSON.stringify(payment),
                            bank: 'tinkoffCredit'
                        });
                    else throw new Error('invalid token' + orderID);
                    break;
                case 'canceled':
                    break
                case 'rejected':
                    break
                case 'reject':
                    if (payment.id) {
                        failedPayment(ctx, {
                            token: ctx.request.query.token,
                            order_id: orderID,
                            amount: payment.order_amount,
                            data: JSON.stringify(payment),
                            bank: "tinkoffCredit"
                        });
                    }
                    else throw new Error('invalid token' + orderID);
                    break;
            }
        }
        else if (parseInt(deal.CATEGORY_ID) === 8) {
            switch (payment.status) {
                case 'approved':
                    if (orderID)
                        preparePayment(ctx, {
                            token: ctx.request.query.token,
                            order_id: orderID,
                            amount: payment.order_amount,
                            data: JSON.stringify(payment),
                            bank: 'tinkoffCredit'
                        });
                    else throw new Error('invalid token' + orderID);
                    break;
                case 'signed':
                    if (orderID)
                        completeWorkPayment(ctx, {
                            token: ctx.request.query.token,
                            order_id: orderID,
                            amount: payment.order_amount,
                            data: JSON.stringify(payment),
                            bank: 'tinkoffCredit'
                        });
                    else throw new Error('invalid token' + orderID);
                    break;
                case 'canceled':
                    break
                case 'rejected':
                    break
                case 'reject':
                    if (payment.id) {
                        failedPayment(ctx, {
                            token: ctx.request.query.token,
                            order_id: orderID,
                            amount: payment.order_amount,
                            data: JSON.stringify(payment),
                            bank: "tinkoffCredit"
                        });
                    }
                    else throw new Error('invalid token' + orderID);
                    break;
            }
        }
        else if (parseInt(deal.CATEGORY_ID) === 1) {
            switch (payment.status) {
                case 'signed':
                    if (orderID)
                        completePayment(ctx, {
                            token: ctx.request.query.token,
                            order_id: orderID,
                            data: JSON.stringify(payment),
                            amount: payment.amount / 100,
                            bank: 'tinkoffCredit'
                        });
                    else throw new Error('invalid token' + orderID);
                    break;
                case 'canceled':
                    break
                case 'rejected':
                    break
                case 'reject':
                    break;
            }
        }

        return ctx.body = 'OK';
    },

    createPayKurs: async (ctx, next) => {
        const bx = new BX(globConf.common.bitrixWebhook);
        let deal = await bx.getDeal(ctx.bitrix.deal ? ctx.bitrix.deal.ID : null);
        let confActualDeal = await getActualConf(deal)

        const a = new TelegramBot(globConf.common.tgBot.token); //TG id
        if (!ctx.bitrix.contact.EMAIL || !ctx.bitrix.contact.PHONE || !ctx.bitrix.contact.EMAIL.length || !ctx.bitrix.contact.PHONE.length) {
            if (!ctx.bitrix.contact.EMAIL || !ctx.bitrix.contact.EMAIL.length) {
                await sendMessageManager(ctx.bitrix.deal.ASSIGNED_BY_ID, 'У контакта не заполнен email. Сделка https://crm.taroirena.ru/crm/deal/details/' + ctx.bitrix.deal.ID + '/');
            }
            if (!ctx.bitrix.contact.PHONE || !ctx.bitrix.contact.PHONE.length) {
                await sendMessageManager(ctx.bitrix.deal.ASSIGNED_BY_ID, 'У контакта не заполнен номер телефона. https://crm.taroirena.ru/crm/deal/details/' + ctx.bitrix.deal.ID + '/');
            }
            throw new Error('Not found email or phone in contact (deal)');
        }

        let bank = false;

        switch (ctx.bitrix.deal[globConf.common.fieldBank]) {
            case '73': bank = new Sber(Object.assign(globConf.common.payment.sber2, confActualDeal.payment.sber2)); break;
            //case '72': bank = new Tinkoff(Object.assign(globConf.common.payment.tinkoff5, confActualDeal.payment.tinkoff5)); break;
            case '72': bank = new Tinkoff(Object.assign(globConf.common.payment.tinkoff4, confActualDeal.payment.tinkoff4)); break;
            case '96': bank = new TinkoffCredit(Object.assign(globConf.common.payment.tinkoffCredit, confActualDeal.payment.tinkoffCredit)); break;
            case '288': bank = new Sber(Object.assign(globConf.common.payment.sber2, confActualDeal.payment.sber2)); break;
            case '290': bank = new Tinkoff(Object.assign(globConf.common.payment.tinkoff2, confActualDeal.payment.tinkoff2)); break;
            //case '445': bank = new Everypay(Object.assign(globConf.common.payment.every_pay, confActualDeal.payment.every_pay)); break;
            //case '292': bank = new Everypay(Object.assign(globConf.common.payment.every_pay, confActualDeal.payment.every_pay)); break;
            //case '382': bank = new Everypay(Object.assign(globConf.common.payment.every_pay2, confActualDeal.payment.every_pay2)); console.log('we are here', globConf.common.payment.every_pay2, confActualDeal.payment.every_pay2); break;
            case '445': bank = new Everypay(Object.assign(globConf.common.payment.every_pay2, confActualDeal.payment.every_pay2)); console.log('we are here', globConf.common.payment.every_pay2, confActualDeal.payment.every_pay2); break;
            case '525': bank = new Everypay(Object.assign(globConf.common.payment.every_pay3, confActualDeal.payment.every_pay3)); break;
            case '528': bank = new Everypay(Object.assign(globConf.common.payment.every_pay4, confActualDeal.payment.every_pay4)); break;
            case '527': bank = new Everypay(Object.assign(globConf.common.payment.every_pay5, confActualDeal.payment.every_pay5)); break;
            case '529': bank = new Everypay(Object.assign(globConf.common.payment.every_pay6, confActualDeal.payment.every_pay6)); break;
            case '435': bank = new Tinkoff(Object.assign(globConf.common.payment.tinkoff3, confActualDeal.payment.tinkoff3)); break;
            case '606': bank = new Tinkoff(Object.assign(globConf.common.payment.tinkoff5, confActualDeal.payment.tinkoff5)); break;
            case '695': bank = new Tinkoff(Object.assign(globConf.common.payment.tinkoff6, confActualDeal.payment.tinkoff6)); break;
            case '310': bank = new Epay(globConf.common.payment.epay); break;
            case '439': bank = new TinkoffCredit(Object.assign(globConf.common.payment.tinkoffCredit2, confActualDeal.payment.tinkoffCredit2)); break;
            case '512': bank = new Yookassa(globConf.common.payment.yookassa); break;
            case '714': bank = new Yookassa(globConf.common.payment.yookassaIv); break;

        }

        if (bank) {
            let paymentUrl

            switch (ctx.bitrix.deal.CATEGORY_ID) {
                case '4':
                    if (ctx.bitrix.deal[globConf.common.fieldBank] == '73') {
                        paymentUrl = await bank.initCandles(ctx.bitrix.deal.ID, ctx.bitrix.products, {
                            payment_subject: ctx.bitrix.deal.UF_CRM_1717148401632,
                            payment_mode: ctx.bitrix.deal.UF_CRM_1629895839,
                            email: ctx.bitrix.contact.EMAIL[0].VALUE,
                            phone: ctx.bitrix.contact.PHONE[0].VALUE,
                            description: ctx.bitrix.products.reduce((acc, p) => acc + `${p.PRODUCT_NAME} ${p.QUANTITY}шт\n`, '')
                        }, ctx.bitrix.deal[globConf.common.fieldPayTypeView]);
                    }
                    else {
                        paymentUrl = await bank.init(ctx.bitrix.deal.ID, ctx.bitrix.products, {
                            payment_subject: ctx.bitrix.deal.UF_CRM_1717148401632,
                            payment_mode: ctx.bitrix.deal.UF_CRM_1629895839,
                            email: ctx.bitrix.contact.EMAIL[0].VALUE,
                            phone: ctx.bitrix.contact.PHONE[0].VALUE,
                            description: ctx.bitrix.products.reduce((acc, p) => acc + `${p.PRODUCT_NAME} ${p.QUANTITY}шт\n`, '')
                        }, ctx.bitrix.deal[globConf.common.fieldPayTypeView]);

                        console.log('pp', paymentUrl)
                    }
                    break;
                default:
                    if (bank === 'Stripe') {
                        paymentUrl = 'https://payment.taroirena.com/?id=' + ctx.bitrix.deal.ID;
                    }
                    else {
                        console.log(ctx.bitrix.deal);
                        paymentUrl = await bank.init(ctx.bitrix.deal.ID, ctx.bitrix.products, {
                            payment_subject: ctx.bitrix.deal.UF_CRM_1717148401632,
                            payment_mode: ctx.bitrix.deal.UF_CRM_1629895839,
                            email: ctx.bitrix.contact.EMAIL[0].VALUE,
                            phone: ctx.bitrix.contact.PHONE[0].VALUE,
                            description: ctx.bitrix.products.reduce((acc, p) => acc + `${p.PRODUCT_NAME} ${p.QUANTITY}шт\n`, '')
                        }, ctx.bitrix.deal[globConf.common.fieldPayTypeView]);
                    }
                    break;
            }

            if (paymentUrl) {
                let bx = new BX(globConf.common.bitrixWebhook);
                let updateData = {};
                updateData[globConf.common.fieldUrlPayment] = paymentUrl;
                await bx.updateDeal(ctx.bitrix.deal.ID, updateData);
            }
        }
        else {
            await sendMessageManager(ctx.bitrix.deal.ASSIGNED_BY_ID, 'Выбран неверный банк. Сделка https://crm.taroirena.ru/crm/deal/details/' + ctx.bitrix.deal.ID + '/');
            throw new Error('Bank not init ' + ctx.bitrix.deal.ID);
        }


        return ctx.body = 'OK';
    },

    createAdditionalPayment: async (ctx, next) => {
        let bx = new BX(globConf.common.bitrixWebhook);
        let deal = await bx.getDeal(ctx.bitrix.deal ? ctx.bitrix.deal.ID : null);
        let confActualDeal = await getActualConf(deal)

        const a = new TelegramBot(globConf.common.tgBot.token); //TG id
        if (!ctx.bitrix.contact.EMAIL || !ctx.bitrix.contact.PHONE || !ctx.bitrix.contact.EMAIL.length || !ctx.bitrix.contact.PHONE.length) {
            if (!ctx.bitrix.contact.EMAIL || !ctx.bitrix.contact.EMAIL.length) {
                await sendMessageManager(ctx.bitrix.deal.ASSIGNED_BY_ID, 'У контакта не заполнен email. Сделка https://crm.taroirena.ru/crm/deal/details/' + ctx.bitrix.deal.ID + '/');
            }
            if (!ctx.bitrix.contact.PHONE || !ctx.bitrix.contact.PHONE.length) {
                await sendMessageManager(ctx.bitrix.deal.ASSIGNED_BY_ID, 'У контакта не заполнен номер телефона. https://crm.taroirena.ru/crm/deal/details/' + ctx.bitrix.deal.ID + '/');
            }
            throw new Error('Not found email or phone in contact (deal)');
        }

        let bank = false;
        switch (ctx.bitrix.deal[globConf.common.fieldBank]) {
            case '73': bank = new Sber(Object.assign(globConf.common.payment.sber2, confActualDeal.payment.sber2)); break;
            case '288': bank = new Sber(Object.assign(globConf.common.payment.sber2, confActualDeal.payment.sber2)); break;
            case '290': bank = new Tinkoff(Object.assign(globConf.common.payment.tinkoff2, confActualDeal.payment.tinkoff2)); break;
            //case '445': bank = new Everypay(Object.assign(globConf.common.payment.every_pay, confActualDeal.payment.every_pay)); break;
            //case '292': bank = new Everypay(Object.assign(globConf.common.payment.every_pay, confActualDeal.payment.every_pay)); break;
            //case '382': bank = new Everypay(Object.assign(globConf.common.payment.every_pay2, confActualDeal.payment.every_pay2)); break;
            case '445': bank = new Everypay(Object.assign(globConf.common.payment.every_pay2, confActualDeal.payment.every_pay2)); break;
            case '525': bank = new Everypay(Object.assign(globConf.common.payment.every_pay3, confActualDeal.payment.every_pay3)); break;
            case '528': bank = new Everypay(Object.assign(globConf.common.payment.every_pay4, confActualDeal.payment.every_pay4)); break;
            case '527': bank = new Everypay(Object.assign(globConf.common.payment.every_pay5, confActualDeal.payment.every_pay5)); break;
            case '529': bank = new Everypay(Object.assign(globConf.common.payment.every_pay6, confActualDeal.payment.every_pay6)); break;
            case '512': bank = new Yookassa(globConf.common.payment.yookassa); break;
            case '714': bank = new Yookassa(globConf.common.payment.yookassaIv); break;

        }

        if (bank) {
            let productsUpdate;
            if (ctx.bitrix.products.length < 2) {
                if (ctx.bitrix.deal.STAGE_ID === confActualDeal.partialPayStatus) {
                    let productID;
                    let rows = [];
                    ctx.bitrix.products.forEach(i => {
                        rows.push({ ID: i.ID, PRODUCT_ID: i.PRODUCT_ID, PRICE: i.PRICE, QUANTITY: i.QUANTITY });
                        productID = i.PRODUCT_ID;
                    });
                    switch (productID) {
                        case 1433:
                            rows.push({ PRODUCT_ID: 1449, PRICE: 34990, QUANTITY: 1 });
                            break;
                        case 1434:
                            rows.push({ PRODUCT_ID: 1449, PRICE: 34990, QUANTITY: 1 });
                            break;
                        case 1435:
                            rows.push({ PRODUCT_ID: 1451, PRICE: 40990, QUANTITY: 1 });
                            break;
                        case 1436:
                            rows.push({ PRODUCT_ID: 1451, PRICE: 40990, QUANTITY: 1 });
                            break;
                        case 1437:
                            rows.push({ PRODUCT_ID: 1453, PRICE: 62990, QUANTITY: 1 });
                            break;
                        case 1438:
                            rows.push({ PRODUCT_ID: 1453, PRICE: 62990, QUANTITY: 1 });
                            break;

                        case 1431:
                            rows.push({ PRODUCT_ID: 1417, PRICE: 92841, QUANTITY: 1 });
                            break;
                        case 1432:
                            rows.push({ PRODUCT_ID: 1417, PRICE: 92841, QUANTITY: 1 });
                            break;

                        case 1429:
                            rows.push({ PRODUCT_ID: 1419, PRICE: 59691, QUANTITY: 1 });
                            break;
                        case 1430:
                            rows.push({ PRODUCT_ID: 1419, PRICE: 59691, QUANTITY: 1 });
                            break;

                        case 1427:
                            rows.push({ PRODUCT_ID: 1421, PRICE: 38841, QUANTITY: 1 });
                            break;
                        case 1428:
                            rows.push({ PRODUCT_ID: 1421, PRICE: 38841, QUANTITY: 1 });
                            break;

                        case 1425:
                            rows.push({ PRODUCT_ID: 1423, PRICE: 33191, QUANTITY: 1 });
                            break;
                        case 1426:
                            rows.push({ PRODUCT_ID: 1423, PRICE: 33191, QUANTITY: 1 });
                            break;

                        case 1280:
                            rows.push({ PRODUCT_ID: 1393, PRICE: 34990, QUANTITY: 1 });
                            break;
                        case 1281:
                            rows.push({ PRODUCT_ID: 1393, PRICE: 34990, QUANTITY: 1 });
                            break;
                        case 1282:
                            rows.push({ PRODUCT_ID: 1395, PRICE: 40990, QUANTITY: 1 });
                            break;
                        case 1283:
                            rows.push({ PRODUCT_ID: 1395, PRICE: 40990, QUANTITY: 1 });
                            break;
                        case 1284:
                            rows.push({ PRODUCT_ID: 1399, PRICE: 62990, QUANTITY: 1 });
                            break;
                        case 1285:
                            rows.push({ PRODUCT_ID: 1400, PRICE: 62990, QUANTITY: 1 });
                            break;
                        case 1286:
                            rows.push({ PRODUCT_ID: 1294, PRICE: 97990, QUANTITY: 1 });
                            break;
                        case 1287:
                            rows.push({ PRODUCT_ID: 1294, PRICE: 97990, QUANTITY: 1 });
                            break;

                        case 1242:
                            rows.push({ PRODUCT_ID: 1248, PRICE: 13990, QUANTITY: 1 });
                            break;
                        case 1243:
                            rows.push({ PRODUCT_ID: 1248, PRICE: 13990, QUANTITY: 1 });
                            break;
                        case 1244:
                            rows.push({ PRODUCT_ID: 1250, PRICE: 17990, QUANTITY: 1 });
                            break;
                        case 1245:
                            rows.push({ PRODUCT_ID: 1250, PRICE: 17990, QUANTITY: 1 });
                            break;
                        case 1246:
                            rows.push({ PRODUCT_ID: 1252, PRICE: 26990, QUANTITY: 1 });
                            break;
                        case 1247:
                            rows.push({ PRODUCT_ID: 1252, PRICE: 26990, QUANTITY: 1 });
                            break;

                        case 1212:
                            rows.push({ PRODUCT_ID: 1220, PRICE: 34990, QUANTITY: 1 });
                            break;
                        case 1213:
                            rows.push({ PRODUCT_ID: 1220, PRICE: 34990, QUANTITY: 1 });
                            break;
                        case 1214:
                            rows.push({ PRODUCT_ID: 1222, PRICE: 40990, QUANTITY: 1 });
                            break;
                        case 1215:
                            rows.push({ PRODUCT_ID: 1222, PRICE: 40990, QUANTITY: 1 });
                            break;
                        case 1216:
                            rows.push({ PRODUCT_ID: 1269, PRICE: 62990, QUANTITY: 1 });
                            break;
                        case 1217:
                            rows.push({ PRODUCT_ID: 1269, PRICE: 62990, QUANTITY: 1 });
                            break;
                        case 1218:
                            rows.push({ PRODUCT_ID: 1228, PRICE: 97990, QUANTITY: 1 });
                            break;
                        case 1219:
                            rows.push({ PRODUCT_ID: 1228, PRICE: 97990, QUANTITY: 1 });
                            break;

                        case 1163:
                            rows.push({ PRODUCT_ID: 1169, PRICE: 4990, QUANTITY: 1 });
                            break;
                        case 1164:
                            rows.push({ PRODUCT_ID: 1169, PRICE: 4990, QUANTITY: 1 });
                            break;
                        case 1165:
                            rows.push({ PRODUCT_ID: 1171, PRICE: 4990, QUANTITY: 1 });
                            break;
                        case 1166:
                            rows.push({ PRODUCT_ID: 1171, PRICE: 4990, QUANTITY: 1 });
                            break;
                        case 1167:
                            rows.push({ PRODUCT_ID: 1173, PRICE: 6990, QUANTITY: 1 });
                            break;
                        case 1168:
                            rows.push({ PRODUCT_ID: 1173, PRICE: 6990, QUANTITY: 1 });
                            break;

                        case 1129:
                            rows.push({ PRODUCT_ID: 1137, PRICE: 34990, QUANTITY: 1 });
                            break;
                        case 1130:
                            rows.push({ PRODUCT_ID: 1137, PRICE: 34990, QUANTITY: 1 });
                            break;
                        case 1131:
                            rows.push({ PRODUCT_ID: 1139, PRICE: 40990, QUANTITY: 1 });
                            break;
                        case 1132:
                            rows.push({ PRODUCT_ID: 1139, PRICE: 40990, QUANTITY: 1 });
                            break;
                        case 1133:
                            rows.push({ PRODUCT_ID: 1141, PRICE: 62990, QUANTITY: 1 });
                            break;
                        case 1134:
                            rows.push({ PRODUCT_ID: 1141, PRICE: 62990, QUANTITY: 1 });
                            break;
                        case 1135:
                            rows.push({ PRODUCT_ID: 1143, PRICE: 97990, QUANTITY: 1 });
                            break;
                        case 1136:
                            rows.push({ PRODUCT_ID: 1143, PRICE: 97990, QUANTITY: 1 });
                            break;

                        case 1080:
                            rows.push({ PRODUCT_ID: 1086, PRICE: 13990, QUANTITY: 1 });
                            break;
                        case 1081:
                            rows.push({ PRODUCT_ID: 1086, PRICE: 13990, QUANTITY: 1 });
                            break;
                        case 1082:
                            rows.push({ PRODUCT_ID: 1088, PRICE: 17990, QUANTITY: 1 });
                            break;
                        case 1083:
                            rows.push({ PRODUCT_ID: 1088, PRICE: 17990, QUANTITY: 1 });
                            break;
                        case 1084:
                            rows.push({ PRODUCT_ID: 1090, PRICE: 26990, QUANTITY: 1 });
                            break;
                        case 1085:
                            rows.push({ PRODUCT_ID: 1090, PRICE: 26990, QUANTITY: 1 });
                            break;

                        case 1010:
                            rows.push({ PRODUCT_ID: 1018, PRICE: 31990, QUANTITY: 1 });
                            break;
                        case 1011:
                            rows.push({ PRODUCT_ID: 1018, PRICE: 31990, QUANTITY: 1 });
                            break;
                        case 1012:
                            rows.push({ PRODUCT_ID: 1020, PRICE: 36990, QUANTITY: 1 });
                            break;
                        case 1013:
                            rows.push({ PRODUCT_ID: 1020, PRICE: 36990, QUANTITY: 1 });
                            break;
                        case 1014:
                            rows.push({ PRODUCT_ID: 1022, PRICE: 56990, QUANTITY: 1 });
                            break;
                        case 1015:
                            rows.push({ PRODUCT_ID: 1022, PRICE: 56990, QUANTITY: 1 });
                            break;
                        case 1016:
                            rows.push({ PRODUCT_ID: 1024, PRICE: 88990, QUANTITY: 1 });
                            break;
                        case 1017:
                            rows.push({ PRODUCT_ID: 1024, PRICE: 88990, QUANTITY: 1 });
                            break;

                        case 937:
                            rows.push({ PRODUCT_ID: 945, PRICE: 31990, QUANTITY: 1 });
                            break;
                        case 938:
                            rows.push({ PRODUCT_ID: 945, PRICE: 31990, QUANTITY: 1 });
                            break;
                        case 939:
                            rows.push({ PRODUCT_ID: 947, PRICE: 36990, QUANTITY: 1 });
                            break;
                        case 940:
                            rows.push({ PRODUCT_ID: 947, PRICE: 36990, QUANTITY: 1 });
                            break;
                        case 941:
                            rows.push({ PRODUCT_ID: 949, PRICE: 56990, QUANTITY: 1 });
                            break;
                        case 942:
                            rows.push({ PRODUCT_ID: 949, PRICE: 56990, QUANTITY: 1 });
                            break;
                        case 943:
                            rows.push({ PRODUCT_ID: 951, PRICE: 88990, QUANTITY: 1 });
                            break;
                        case 944:
                            rows.push({ PRODUCT_ID: 951, PRICE: 88990, QUANTITY: 1 });
                            break;

                        case 898:
                            rows.push({ PRODUCT_ID: 904, PRICE: 11990, QUANTITY: 1 });
                            break;
                        case 899:
                            rows.push({ PRODUCT_ID: 904, PRICE: 11990, QUANTITY: 1 });
                            break;
                        case 900:
                            rows.push({ PRODUCT_ID: 906, PRICE: 15990, QUANTITY: 1 });
                            break;
                        case 901:
                            rows.push({ PRODUCT_ID: 906, PRICE: 15990, QUANTITY: 1 });
                            break;
                        case 902:
                            rows.push({ PRODUCT_ID: 908, PRICE: 21990, QUANTITY: 1 });
                            break;
                        case 903:
                            rows.push({ PRODUCT_ID: 908, PRICE: 21990, QUANTITY: 1 });
                            break;

                        case 189:
                            rows.push({ PRODUCT_ID: 190, PRICE: 9990, QUANTITY: 1 });
                            break;
                        case 192:
                            rows.push({ PRODUCT_ID: 193, PRICE: 14990, QUANTITY: 1 });
                            break;
                        case 195:
                            rows.push({ PRODUCT_ID: 196, PRICE: 29990, QUANTITY: 1 });
                            break;
                        case 198:
                            rows.push({ PRODUCT_ID: 199, PRICE: 89990, QUANTITY: 1 });
                            break;
                        case 202:
                            rows.push({ PRODUCT_ID: 203, PRICE: 11990, QUANTITY: 1 });
                            break;
                        case 205:
                            rows.push({ PRODUCT_ID: 206, PRICE: 17990, QUANTITY: 1 });
                            break;
                        case 208:
                            rows.push({ PRODUCT_ID: 209, PRICE: 34990, QUANTITY: 1 });
                            break;
                        case 211:
                            rows.push({ PRODUCT_ID: 212, PRICE: 109990, QUANTITY: 1 });
                            break;
                        case 445:
                            rows.push({ PRODUCT_ID: 452, PRICE: 13990, QUANTITY: 1 });
                            break;
                        case 447:
                            rows.push({ PRODUCT_ID: 453, PRICE: 18990, QUANTITY: 1 });
                            break;
                        case 449:
                            rows.push({ PRODUCT_ID: 454, PRICE: 34990, QUANTITY: 1 });
                            break;
                        case 451:
                            rows.push({ PRODUCT_ID: 455, PRICE: 109990, QUANTITY: 1 });
                            break;
                        case 618:
                            rows.push({ PRODUCT_ID: 624, PRICE: 7990, QUANTITY: 1 });
                            break;
                        case 619:
                            rows.push({ PRODUCT_ID: 625, PRICE: 8990, QUANTITY: 1 });
                            break;
                        case 620:
                            rows.push({ PRODUCT_ID: 626, PRICE: 9990, QUANTITY: 1 });
                            break;
                        case 621:
                            rows.push({ PRODUCT_ID: 627, PRICE: 11990, QUANTITY: 1 });
                            break;
                        case 622:
                            rows.push({ PRODUCT_ID: 628, PRICE: 16990, QUANTITY: 1 });
                            break;
                        case 623:
                            rows.push({ PRODUCT_ID: 629, PRICE: 18990, QUANTITY: 1 });
                            break;

                        case 706:
                            rows.push({ PRODUCT_ID: 712, PRICE: 11990, QUANTITY: 1 });
                            break;
                        case 707:
                            rows.push({ PRODUCT_ID: 713, PRICE: 13990, QUANTITY: 1 });
                            break;
                        case 708:
                            rows.push({ PRODUCT_ID: 714, PRICE: 15990, QUANTITY: 1 });
                            break;
                        case 709:
                            rows.push({ PRODUCT_ID: 715, PRICE: 17990, QUANTITY: 1 });
                            break;
                        case 710:
                            rows.push({ PRODUCT_ID: 716, PRICE: 21990, QUANTITY: 1 });
                            break;
                        case 711:
                            rows.push({ PRODUCT_ID: 717, PRICE: 23990, QUANTITY: 1 });
                            break;
                        case 812:
                            rows.push({ PRODUCT_ID: 818, PRICE: 16990, QUANTITY: 1 });
                            break;
                        case 814:
                            rows.push({ PRODUCT_ID: 820, PRICE: 19990, QUANTITY: 1 });
                            break;
                        case 816:
                            rows.push({ PRODUCT_ID: 822, PRICE: 28990, QUANTITY: 1 });
                            break;
                        case 811:
                            rows.push({ PRODUCT_ID: 817, PRICE: 16990, QUANTITY: 1 });
                            break;
                        case 813:
                            rows.push({ PRODUCT_ID: 819, PRICE: 19990, QUANTITY: 1 });
                            break;
                        case 815:
                            rows.push({ PRODUCT_ID: 821, PRICE: 28990, QUANTITY: 1 });
                            break;
                    }

                    await bx.setDealProduct(ctx.bitrix.deal.ID, rows);
                }
            }

            productsUpdate = await bx.getDealProduct(ctx.bitrix.deal.ID);

            let items = [];
            let additionalProductData;

            productsUpdate.forEach(i => {
                switch (i.PRODUCT_ID) {
                    case 1417:
                    case 1419:
                    case 1421:
                    case 1423:

                    case 1393:
                    case 1395:
                    case 1399:
                    case 1400:

                    case 1288:
                    case 1289:
                    case 1290:
                    case 1291:
                    case 1292:
                    case 1293:
                    case 1294:
                    case 1295:

                    case 1269:

                    case 1248:
                    case 1250:
                    case 1252:

                    case 1169:
                    case 1170:
                    case 1171:
                    case 1172:
                    case 1173:
                    case 1174:

                    case 1137:
                    case 1138:
                    case 1139:
                    case 1140:
                    case 1141:
                    case 1142:
                    case 1143:
                    case 1144:

                    case 1086:
                    case 1087:
                    case 1088:
                    case 1089:
                    case 1090:
                    case 1091:

                    case 1018:
                    case 1019:
                    case 1020:
                    case 1021:
                    case 1022:
                    case 1023:
                    case 1024:
                    case 1025:

                    case 945:
                    case 946:
                    case 947:
                    case 948:
                    case 949:
                    case 950:
                    case 951:
                    case 952:
                    case 190:
                    case 193:
                    case 196:
                    case 199:
                    case 203:
                    case 206:
                    case 209:
                    case 212:
                    case 452:
                    case 453:
                    case 454:
                    case 455:
                    case 624:
                    case 625:
                    case 626:
                    case 627:
                    case 628:
                    case 629:
                    case 712:
                    case 713:
                    case 714:
                    case 715:
                    case 716:
                    case 717:
                    case 817:
                    case 818:
                    case 819:
                    case 820:
                    case 821:
                    case 822:
                    case 904:
                    case 906:
                    case 908:
                        additionalProductData = i;
                        items.push({
                            PRODUCT_ID: i.PRODUCT_ID,
                            PRODUCT_NAME: i.ORIGINAL_PRODUCT_NAME,
                            QUANTITY: i.QUANTITY,
                            PRICE: +i.PRICE,
                        });
                        break;
                }
            });

            let paymentUrl

            if (bank === 'Stripe') {
                paymentUrl = 'https://payment.taroirena.com/?id=' + ctx.bitrix.deal.ID;
            }
            else {
                paymentUrl = await bank.init(ctx.bitrix.deal.ID, items, {
                    email: ctx.bitrix.contact.EMAIL[0].VALUE,
                    phone: ctx.bitrix.contact.PHONE[0].VALUE,
                    description: items.reduce((acc, p) => acc + `${p.name} ${p.QUANTITY}шт\n`, '')
                });
            }

            if (paymentUrl) {
                let updateData = {};
                if (additionalProductData?.PRICE) {
                    updateData[globConf.common.fieldAdditionalPay] = additionalProductData.PRICE;
                }
                updateData[globConf.common.fieldUrlPayment] = paymentUrl;
                await bx.updateDeal(ctx.bitrix.deal.ID, updateData);
            }
        }
        else {
            await sendMessageManager(ctx.bitrix.deal.ASSIGNED_BY_ID, 'Выбран неверный банк. Сделка https://crm.taroirena.ru/crm/deal/details/' + ctx.bitrix.deal.ID + '/');
            throw new Error('Bank not init' + ctx.bitrix.deal.ID);
        }

        return ctx.body = 'OK';
    },
    createAdditionalPaymentCandles: async (ctx, next) => {
        let bx = new BX(globConf.common.bitrixWebhook);
        let deal = await bx.getDeal(ctx.bitrix.deal ? ctx.bitrix.deal.ID : null);
        let confActualDeal = await getActualConf(deal)

        const a = new TelegramBot(globConf.common.tgBot.token); //TG id
        if (!ctx.bitrix.contact.EMAIL || !ctx.bitrix.contact.PHONE || !ctx.bitrix.contact.EMAIL.length || !ctx.bitrix.contact.PHONE.length) {
            if (!ctx.bitrix.contact.EMAIL || !ctx.bitrix.contact.EMAIL.length) {
                await sendMessageManager(ctx.bitrix.deal.ASSIGNED_BY_ID, 'У контакта не заполнен email. Сделка https://crm.taroirena.ru/crm/deal/details/' + ctx.bitrix.deal.ID + '/');
            }
            if (!ctx.bitrix.contact.PHONE || !ctx.bitrix.contact.PHONE.length) {
                await sendMessageManager(ctx.bitrix.deal.ASSIGNED_BY_ID, 'У контакта не заполнен номер телефона. https://crm.taroirena.ru/crm/deal/details/' + ctx.bitrix.deal.ID + '/');
            }
            throw new Error('Not found email or phone in contact (deal)');
        }

        let bank = false;
        switch (ctx.bitrix.deal[globConf.common.fieldBank]) {
            case '73': bank = new Sber(Object.assign(globConf.common.payment.sber2, confActualDeal.payment.sber2)); break;
            case '288': bank = new Sber(Object.assign(globConf.common.payment.sber2, confActualDeal.payment.sber2)); break;
        }

        if (bank) {
            let productsUpdate;
            if (ctx.bitrix.deal.STAGE_ID === confActualDeal.partialPayStatus) {
                let productID;
                let rows = [];
                ctx.bitrix.products.forEach(i => {
                    switch (i.PRODUCT_ID) {
                        case 414:
                        case 415:
                        case 416:
                        case 417:
                        case 418:
                            break;
                        default:
                            rows.push({ ID: i.ID, PRODUCT_ID: i.PRODUCT_ID, PRICE: i.PRICE, QUANTITY: i.QUANTITY });
                            break;
                    }
                    switch (i.PRODUCT_ID) {
                        case 409:
                            rows.push({ PRODUCT_ID: 414, PRICE: 2500, QUANTITY: i.QUANTITY });
                            break;
                        case 410:
                            rows.push({ PRODUCT_ID: 415, PRICE: 2500, QUANTITY: i.QUANTITY });
                            break;
                        case 411:
                            rows.push({ PRODUCT_ID: 416, PRICE: 2500, QUANTITY: i.QUANTITY });
                            break;
                        case 412:
                            rows.push({ PRODUCT_ID: 417, PRICE: 2500, QUANTITY: i.QUANTITY });
                            break;
                        case 413:
                            rows.push({ PRODUCT_ID: 418, PRICE: 8000, QUANTITY: i.QUANTITY });
                            break;
                    }
                });

                await bx.setDealProduct(ctx.bitrix.deal.ID, rows);
            }

            productsUpdate = await bx.getDealProduct(ctx.bitrix.deal.ID);
            const items = [];
            let additionalProductData = 0;

            productsUpdate.forEach(i => {
                switch (i.PRODUCT_ID) {
                    case 414:
                    case 415:
                    case 416:
                    case 417:
                    case 418:
                        additionalProductData += i.PRICE;
                        items.push({
                            ID: i.PRODUCT_ID,
                            name: i.ORIGINAL_PRODUCT_NAME,
                            QUANTITY: i.QUANTITY,
                            PRICE: +i.PRICE,
                        });
                        break;
                }
            });

            let paymentUrl = await bank.initCandles(ctx.bitrix.deal.ID, items, {
                email: ctx.bitrix.contact.EMAIL[0].VALUE,
                phone: ctx.bitrix.contact.PHONE[0].VALUE,
                description: items.reduce((acc, p) => acc + `${p.name} ${p.QUANTITY}шт\n`, '')
            });

            if (paymentUrl) {
                let updateData = {};
                updateData[globConf.common.fieldAdditionalPay] = additionalProductData;
                updateData[globConf.common.fieldUrlPayment] = paymentUrl;
                await bx.updateDeal(ctx.bitrix.deal.ID, updateData);
            }
        }
        else {
            await sendMessageManager(ctx.bitrix.deal.ASSIGNED_BY_ID, 'Выбран неверный банк. Сделка https://crm.taroirena.ru/crm/deal/details/' + ctx.bitrix.deal.ID + '/');
            throw new Error('Bank not init' + payment.OrderId);
        }

        return ctx.body = 'OK';
    },

    addGetCourse: async (ctx, next) => {
        let bx = new BX(globConf.common.bitrixWebhook);
        let deal = await bx.getDeal(ctx.bitrix.deal ? ctx.bitrix.deal.ID : null);
        let confActualDeal = await getActualConf(deal)

        const a = new TelegramBot(globConf.common.tgBot.token); //TG id
        const bot = new TelegramBot(globConf.common.tgBot.token);
        if (!ctx.bitrix.contact.EMAIL || !ctx.bitrix.contact.PHONE || !ctx.bitrix.contact.EMAIL.length || !ctx.bitrix.contact.PHONE.length) {
            if (!ctx.bitrix.contact.EMAIL || !ctx.bitrix.contact.EMAIL.length) {
                await sendMessageManager(ctx.bitrix.deal.ASSIGNED_BY_ID, 'У контакта не заполнен email. Сделка https://crm.taroirena.ru/crm/deal/details/' + ctx.bitrix.deal.ID + '/');
            }
            if (!ctx.bitrix.contact.PHONE || !ctx.bitrix.contact.PHONE.length) {
                await sendMessageManager(ctx.bitrix.deal.ASSIGNED_BY_ID, 'У контакта не заполнен номер телефона. https://crm.taroirena.ru/crm/deal/details/' + ctx.bitrix.deal.ID + '/');
            }
            throw new Error('Not found email or phone in contact (deal)');
        }

        let productID, groupName, payment;
        let apiGetcourse;
        let productsMulti = [];
        let isServiceFree = [];
        apiGetcourse = new GetCourse(globConf.common.getcourse.apiUrl, globConf.common.getcourse.accessToken);

        ctx.bitrix.products.forEach(i => {
            switch (i.PRODUCT_ID) {
                case 1433:
                    productID = 5930009;
                    break;
                case 1434:
                    productID = 5930009;
                    break;
                case 1435:
                    productID = 5930018;
                    break;
                case 1436:
                    productID = 5930018;
                    break;
                case 1437:
                    productID = 5930046;
                    break;
                case 1438:
                    productID = 5930046;
                    break;

                case 1449:
                    productID = 5930032;
                    break;
                case 1450:
                    productID = 5930032;
                    break;
                case 1451:
                    productID = 5930035;
                    break;
                case 1452:
                    productID = 5930035;
                    break;
                case 1453:
                    productID = 5930049;
                    break;
                case 1454:
                    productID = 5930049;
                    break;

                case 1414:
                    productID = 5911227;
                    break;
                case 1413:
                    productID = 5911227;
                    break;
                case 1424:
                    productID = 5911227;
                    break;
                case 1423:
                    productID = 5911227;
                    break;

                case 1412:
                    productID = 5911236;
                    break;
                case 1411:
                    productID = 5911236;
                    break;
                case 1422:
                    productID = 5911236;
                    break;
                case 1421:
                    productID = 5911236;
                    break;

                case 1410:
                    productID = 5911241;
                    break;
                case 1409:
                    productID = 5911241;
                    break;
                case 1420:
                    productID = 5911241;
                    break;
                case 1419:
                    productID = 5911241;
                    break;

                case 1408:
                    productID = 5911322;
                    break;
                case 1407:
                    productID = 5911322;
                    break;
                case 1418:
                    productID = 5911322;
                    break;
                case 1417:
                    productID = 5911322;
                    break;

                case 1387:
                    productID = 5809857;
                    break;
                case 1388:
                    productID = 5809857;
                    break;
                case 1389:
                    productID = 5809868;
                    break;
                case 1390:
                    productID = 5809868;
                    break;
                case 1391:
                    productID = 5809953;
                    break;
                case 1392:
                    productID = 5809953;
                    break;
                case 1393:
                    productID = 5809967;
                    break;
                case 1394:
                    productID = 5809967;
                    break;
                case 1395:
                    productID = 5809971;
                    break;
                case 1396:
                    productID = 5809971;
                    break;
                case 1399:
                    productID = 5809981;
                    break;
                case 1400:
                    productID = 5809981;
                    break;

                case 1365:
                    productID = 5696155;
                    break;
                case 1364:
                    productID = 5696155;
                    break;
                case 1363:
                    productID = 5696142;
                    break;
                case 1362:
                    productID = 5696142;
                    break;

                case 1372:
                    productID = 5715537;
                    break;
                case 1371:
                    productID = 5715537;
                    break;
                case 1374:
                    productID = 5715527;
                    break;
                case 1373:
                    productID = 5715527;
                    break;

                case 1272:
                    productID = 5665775;
                    break;
                case 1273:
                    productID = 5665775;
                    break;
                case 1274:
                    productID = 5665778;
                    break;
                case 1275:
                    productID = 5665778;
                    break;
                case 1276:
                    productID = 5618453;
                    break;
                case 1277:
                    productID = 5618453;
                    break;
                case 1278:
                    productID = 5488411;
                    break;
                case 1279:
                    productID = 5488411;
                    break;
                case 1288:
                    productID = 5665780;
                    break;
                case 1289:
                    productID = 5665780;
                    break;
                case 1290:
                    productID = 5665783;
                    break;
                case 1291:
                    productID = 5665783;
                    break;
                case 1292:
                    productID = 5618470;
                    break;
                case 1293:
                    productID = 5618470;
                    break;
                case 1294:
                    productID = 5488427;
                    break;
                case 1295:
                    productID = 5488427;
                    break;

                case 1237:
                    productID = 5124246;
                    break;
                case 1238:
                    productID = 5124246;
                    break;

                case 1269:
                    productID = 5618453;
                    break;
                case 1270:
                    productID = 5618453;
                    break;

                case 1267:
                    productID = 5618453;
                    break;
                case 1268:
                    productID = 5618453;
                    break;

                case 1248:
                    productID = 5577387;
                    break;
                case 1249:
                    productID = 5577387;
                    break;
                case 1250:
                    productID = 5577396;
                    break;
                case 1251:
                    productID = 5577396;
                    break;
                case 1252:
                    productID = 5577410;
                    break;
                case 1253:
                    productID = 5577410;
                    break;
                case 1254:
                    productID = 5577420;
                    break;
                case 1255:
                    productID = 5577420;
                    break;
                case 1256:
                    productID = 5577424;
                    break;
                case 1257:
                    productID = 5577424;
                    break;
                case 1258:
                    productID = 5577431;
                    break;
                case 1259:
                    productID = 5577431;
                    break;
                case 1260:
                    productID = 5577435;
                    break;
                case 1261:
                    productID = 5577435;
                    break;
                case 1262:
                    productID = 5577438;
                    break;
                case 1263:
                    productID = 5577438;
                    break;
                case 1264:
                    productID = 5577444;
                    break;
                case 1265:
                    productID = 5577444;
                    break;

                case 1204:
                    productID = 5488336;
                    break;
                case 1205:
                    productID = 5488336;
                    break;
                case 1206:
                    productID = 5488350;
                    break;
                case 1207:
                    productID = 5488350;
                    break;
                case 1208:
                    productID = 5488371;
                    break;
                case 1209:
                    productID = 5488371;
                    break;
                case 1210:
                    productID = 5488411;
                    break;
                case 1211:
                    productID = 5488411;
                    break;

                case 1222:
                    productID = 5488354;
                    break;
                case 1223:
                    productID = 5488354;
                    break;
                case 1224:
                    productID = 5488362;
                    break;
                case 1225:
                    productID = 5488362;
                    break;
                case 1226:
                    productID = 5488377;
                    break;
                case 1227:
                    productID = 5488377;
                    break;
                case 1228:
                    productID = 5488427;
                    break;
                case 1229:
                    productID = 5488427;
                    break;

                case 1141:
                    productID = 5369824;
                    break;
                case 1142:
                    productID = 5369824;
                    break;

                case 1137:
                    productID = 5369801;
                    break;
                case 1138:
                    productID = 5369801;
                    break;
                case 1139:
                    productID = 5369811;
                    break;
                case 1140:
                    productID = 5369811;
                    break;

                case 1151:
                    productID = 5302879;
                    break;
                case 1152:
                    productID = 5302879;
                    break;
                case 1153:
                    productID = 5302927;
                    break;
                case 1154:
                    productID = 5302927;
                    break;
                case 1155:
                    productID = 5302935;
                    break;
                case 1156:
                    productID = 5302935;
                    break;
                case 1157:
                    productID = 5302940;
                    break;
                case 1158:
                    productID = 5302940;
                    break;
                case 1159:
                    productID = 5302945;
                    break;
                case 1160:
                    productID = 5302945;
                    break;
                case 1161:
                    productID = 5302947;
                    break;
                case 1162:
                    productID = 5302947;
                    break;
                case 1169:
                    productID = 5302948;
                    break;
                case 1170:
                    productID = 5302948;
                    break;
                case 1171:
                    productID = 5302951;
                    break;
                case 1172:
                    productID = 5302951;
                    break;
                case 1173:
                    productID = 5302956;
                    break;
                case 1174:
                    productID = 5302956;
                    break;

                case 1121:
                    productID = 5369786;
                    break;
                case 1122:
                    productID = 5369786;
                    break;
                case 1123:
                    productID = 5369790;
                    break;
                case 1124:
                    productID = 5369790;
                    break;
                case 1125:
                    productID = 5369820;
                    break;
                case 1126:
                    productID = 5369820;
                    break;
                case 1127:
                    productID = 5266222;
                    break;
                case 1128:
                    productID = 5266222;
                    break;
                case 1144:
                    productID = 5266230;
                    break;
                case 1143:
                    productID = 5266230;
                    break;


                case 1108:
                    productID = 5210226;
                    break;
                case 1107:
                    productID = 5210226;
                    break;


                case 1367:
                    productID = 5708522;
                    break;
                case 1366:
                    productID = 5708522;
                    break;

                case 1106:
                    productID = 5708528;
                    break;
                case 1105:
                    productID = 5708528;
                    break;

                case 1068:
                    productID = 5140593;
                    break;
                case 1069:
                    productID = 5140593;
                    break;
                case 1070:
                    productID = 5140597;
                    break;
                case 1071:
                    productID = 5140597;
                    break;
                case 1072:
                    productID = 5140601;
                    break;
                case 1073:
                    productID = 5140601;
                    break;
                case 1074:
                    productID = 5140605;
                    break;
                case 1075:
                    productID = 5140605;
                    break;
                case 1076:
                    productID = 5140610;
                    break;
                case 1077:
                    productID = 5140610;
                    break;
                case 1078:
                    productID = 5140615;
                    break;
                case 1079:
                    productID = 5140615;
                    break;
                case 1086:
                    productID = 5140633;
                    break;
                case 1087:
                    productID = 5140633;
                    break;
                case 1088:
                    productID = 5140638;
                    break;
                case 1089:
                    productID = 5140638;
                    break;
                case 1090:
                    productID = 5140641;
                    break;
                case 1091:
                    productID = 5140641;
                    break;

                case 1053:
                    isServiceFree.push({
                        id: 5097280,
                        price: 3000
                    })
                    break;
                case 1054:
                    isServiceFree.push({
                        id: 5097280,
                        price: 3000
                    })
                    break;
                case 1055:
                    isServiceFree.push({
                        id: 5097291,
                        price: 5000
                    })
                    break;
                case 1056:
                    isServiceFree.push({
                        id: 5097291,
                        price: 5000
                    })
                    break;

                case 1058:
                    isServiceFree.push({
                        id: 5118785,
                        price: 32990
                    })
                    break;
                case 1059:
                    isServiceFree.push({
                        id: 5118785,
                        price: 32990
                    })
                    break;
                case 1060:
                    isServiceFree.push({
                        id: 5118803,
                        price: 38990
                    })
                    break;
                case 1061:
                    isServiceFree.push({
                        id: 5118803,
                        price: 38990
                    })
                    break;
                case 1062:
                    isServiceFree.push({
                        id: 5118827,
                        price: 59990
                    })
                    break;
                case 1063:
                    isServiceFree.push({
                        id: 5118827,
                        price: 59990
                    })
                    break;
                case 1063:
                    isServiceFree.push({
                        id: 5119086,
                        price: 36990
                    })
                    break;

                case 1002:
                    isServiceFree.push({
                        id: 5015971,
                        price: 32990
                    })
                    break;
                case 1003:
                    isServiceFree.push({
                        id: 5015971,
                        price: 32990
                    })
                    break;
                case 1018:
                    isServiceFree.push({
                        id: 5015971,
                        price: 32990
                    })
                    break;
                case 1019:
                    isServiceFree.push({
                        id: 5015971,
                        price: 32990
                    })
                    break;
                case 1018:
                    isServiceFree.push({
                        id: 5015971,
                        price: 32990
                    })
                    break;
                case 1019:
                    isServiceFree.push({
                        id: 5015971,
                        price: 32990
                    })
                    break;

                case 1004:
                    isServiceFree.push({
                        id: 5015977,
                        price: 38990
                    })
                    break;
                case 1005:
                    isServiceFree.push({
                        id: 5015977,
                        price: 38990
                    })
                    break;
                case 1020:
                    isServiceFree.push({
                        id: 5015977,
                        price: 38990
                    })
                    break;
                case 1021:
                    isServiceFree.push({
                        id: 5015977,
                        price: 38990
                    })
                    break;

                case 1006:
                    isServiceFree.push({
                        id: 5015989,
                        price: 59990
                    })
                    break;
                case 1007:
                    isServiceFree.push({
                        id: 5015989,
                        price: 59990
                    })
                    break;
                case 1022:
                    isServiceFree.push({
                        id: 5015989,
                        price: 59990
                    })
                    break;
                case 1023:
                    isServiceFree.push({
                        id: 5015989,
                        price: 59990
                    })
                    break;

                case 1008:
                    isServiceFree.push({
                        id: 5016000,
                        price: 93990
                    })
                    break;
                case 1009:
                    isServiceFree.push({
                        id: 5016000,
                        price: 93990
                    })
                    break;
                case 1024:
                    isServiceFree.push({
                        id: 5016000,
                        price: 93990
                    })
                    break;
                case 1025:
                    isServiceFree.push({
                        id: 5016000,
                        price: 93990
                    })
                    break;
                case 1022:
                    isServiceFree.push({
                        id: 5124869,
                        price: 56990
                    })
                    break;
                case 1023:
                    isServiceFree.push({
                        id: 5124869,
                        price: 56990
                    })
                    break;

                case 1066:
                    productID = 5124246;
                    break;
                case 1067:
                    productID = 5124246;
                    break;

                case 929:
                    productID = 4908883;
                    break;
                case 930:
                    productID = 4908883;
                    break;
                case 945:
                    productID = 4908883;
                    break;
                case 946:
                    productID = 4908883;
                    break;

                case 931:
                    productID = 4908887;
                    break;
                case 932:
                    productID = 4908887;
                    break;
                case 947:
                    productID = 4908887;
                    break;
                case 948:
                    productID = 4908887;
                    break;

                case 933:
                    productID = 4908859;
                    break;
                case 934:
                    productID = 4908859;
                    break;
                case 949:
                    productID = 4908859;
                    break;
                case 950:
                    productID = 4908859;
                    break;

                case 935:
                    productID = 4908894;
                    break;
                case 936:
                    productID = 4908894;
                    break;
                case 951:
                    productID = 4908894;
                    break;
                case 952:
                    productID = 4908894;
                    break;


                case 923:
                    productID = 4895254;
                    break;
                case 924:
                    productID = 4895254;
                    break;
                case 925:
                    productID = 4895255;
                    break;
                case 926:
                    productID = 4895255;
                    break;

                case 910:
                    productID = 4805945;
                    break;
                case 911:
                    productID = 4805945;
                    break;
                case 912:
                    productID = 4805953;
                    break;
                case 913:
                    productID = 4805953;
                    break;
                case 914:
                    productID = 4805958;
                    break;
                case 915:
                    productID = 4805958;
                    break;

                case 886:
                    productID = 4790786;
                    break;
                case 887:
                    productID = 4790786;
                    break;
                case 904:
                    productID = 4790786;
                    break;
                case 905:
                    productID = 4790786;
                    break;
                case 888:
                    productID = 4790812;
                    break;
                case 889:
                    productID = 4790812;
                    break;
                case 906:
                    productID = 4790812;
                    break;
                case 907:
                    productID = 4790812;
                    break;
                case 890:
                    productID = 4790815;
                    break;
                case 891:
                    productID = 4790815;
                    break;
                case 908:
                    productID = 4790815;
                    break;
                case 909:
                    productID = 4790815;
                    break;
                case 892:
                    productID = 4790825;
                    break;
                case 893:
                    productID = 4790825;
                    break;
                case 894:
                    productID = 4790837;
                    break;
                case 895:
                    productID = 4790837;
                    break;
                case 896:
                    productID = 4790839;
                    break;
                case 897:
                    productID = 4790839;
                    break;

                case 884:
                    productID = 4659508;
                    break;
                case 885:
                    productID = 4659508;
                    break;

                case 882:
                    productID = 4711383;
                    break;
                case 883:
                    productID = 4711383;
                    break;

                case 867:
                    productID = 4659491;
                    break;
                case 868:
                    productID = 4659491;
                    break;

                case 871:
                    productID = 4659489;
                    break;
                case 872:
                    productID = 4659489;
                    break;

                case 851:
                    productID = 4664640;
                    break;
                case 852:
                    productID = 4664640;
                    break;

                case 869:
                    productID = 4664640;
                    break;
                case 870:
                    productID = 4664640;
                    break;

                case 865:
                    productID = 4639217;
                    break;
                case 866:
                    productID = 4639217;
                    break;

                case 855:
                    productID = 4614973;
                    break;
                case 856:
                    productID = 4614973;
                    break;
                case 861:
                    productID = 4614983;
                    break;
                case 862:
                    productID = 4614983;
                    break;
                case 863:
                    productID = 4614986;
                    break;
                case 864:
                    productID = 4614986;
                    break;

                case 849:
                    productID = 4593225;
                    break;
                case 850:
                    productID = 4593225;
                    break;
                case 847:
                    productID = 4593230;
                    break;
                case 848:
                    productID = 4593230;
                    break;

                case 799:
                    productID = 4472394;
                    break;
                case 800:
                    productID = 4472394;
                    break;
                case 817:
                    productID = 4472394;
                    break;
                case 818:
                    productID = 4472394;
                    break;
                case 801:
                    productID = 4472400;
                    break;
                case 802:
                    productID = 4472400;
                    break;
                case 819:
                    productID = 4472400;
                    break;
                case 820:
                    productID = 4472400;
                    break;
                case 803:
                    productID = 4472403;
                    break;
                case 804:
                    productID = 4472403;
                    break;
                case 821:
                    productID = 4472403;
                    break;
                case 822:
                    productID = 4472403;
                    break;

                case 805:
                    productID = 4488606;
                    break;
                case 806:
                    productID = 4488606;
                    break;
                case 807:
                    productID = 4488616;
                    break;
                case 808:
                    productID = 4488616;
                    break;
                case 809:
                    productID = 4488623;
                    break;
                case 810:
                    productID = 4488623;
                    break;


                case 738:
                    productID = 4490936;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 19.05)';
                    break;
                case 739:
                    productID = 4490936;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 19.05)';
                    break;
                case 740:
                    productID = 4490946;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 19.05)';
                    break;
                case 741:
                    productID = 4490946;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 19.05)';
                    break;
                case 747:
                    productID = 4490915;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 19.05)';
                    break;
                case 748:
                    productID = 4490915;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 19.05)';
                    break;



                case 649:
                    productID = 4130881;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким с куратором(старт 14.01)';
                    break;
                case 650:
                    productID = 4130881;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким с куратором(старт 14.01)';
                    break;
                case 651:
                    productID = 4051468;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким с наставником (старт 14.01)';
                    break;
                case 652:
                    productID = 4051468;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким с наставником (старт 14.01)';
                    break;
                case 663:
                    productID = 4098161;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (ВИП с Юлей) старт 27.01';
                    break;
                case 664:
                    productID = 4098161;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (ВИП с Юлей) старт 27.01';
                    break;
                case 672:
                    productID = 4130882;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким с куратором(старт 17.02)';
                    break;
                case 674:
                    productID = 4130886;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким с наставником(старт 17.02) (копия)';
                    break;
                case 675:
                    productID = 4130886;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким с наставником(старт 17.02) (копия)';
                    break;
                case 679:
                    productID = 4186562;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (ВИП с Юлей) старт 10.03';
                    break;
                case 680:
                    productID = 4186562;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (ВИП с Юлей) старт 10.03';
                    break;

                case 537:
                    productID = 3834812;
                    groupName = 'Астрологическое Таро (самостоятельный)';
                    break;

                case 538:
                    productID = 3834843;
                    groupName = 'Астрологическое Таро (самостоятельный)';
                    break;
                case 539:
                    productID = 3834848;
                    groupName = 'Астрологическое Таро (самостоятельный)';
                    break;
                case 540:
                    productID = 3834856;
                    groupName = 'Астрологическое Таро (с куратором)';
                    break;
                case 541:
                    productID = 3834857;
                    groupName = 'Астрологическое Таро (с куратором)';
                    break;

                case 624:
                    productID = 3834843;
                    groupName = 'Астрологическое Таро (самостоятельный)';
                    break;
                case 625:
                    productID = 3834848;
                    groupName = 'Астрологическое Таро (самостоятельный)';
                    break;
                case 718:
                    productID = 4268442;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 17.03) с наставником';
                    break;
                case 719:
                    productID = 4268442;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 17.03) с наставником';
                    break;
                case 724:
                    productID = 4268438;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 17.03)';
                    break;
                case 725:
                    productID = 4268438;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 17.03)';
                    break;
                case 730:
                    productID = 4342807;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (ВИП с Юлей) старт 21.04';
                    break;
                case 731:
                    productID = 4342807;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (ВИП с Юлей) старт 21.04';
                    break;

                case 726:
                    productID = 4398099;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 14.04)';
                    break;
                case 727:
                    productID = 4398099;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 14.04)';
                    break;

                case 728:
                    productID = 4398105;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 14.04)';
                    break;
                case 729:
                    productID = 4398105;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 14.04)';
                    break;


                case 700:
                    productID = 4260044;
                    groupName = 'Мастер-класс "Кармическое Таро" с кураторм';
                    break;
                case 712:
                    productID = 4260044;
                    groupName = 'Мастер-класс "Кармическое Таро" с кураторм';
                    break;
                case 703:
                    productID = 4260054;
                    groupName = 'Мастер-класс "Кармическое Таро" с кураторм';
                    break;
                case 713:
                    productID = 4260054;
                    groupName = 'Мастер-класс "Кармическое Таро" с кураторм';
                    break;

                case 701:
                    productID = 4260056;
                    groupName = 'Мастер-класс "Кармическое Таро" с экспертом и куратором';
                    break;
                case 714:
                    productID = 4260056;
                    groupName = 'Мастер-класс "Кармическое Таро" с экспертом и куратором';
                    break;
                case 704:
                    productID = 4260057;
                    groupName = 'Мастер-класс "Кармическое Таро" с экспертом и куратором с 04.03';
                    break;
                case 715:
                    productID = 4260057;
                    groupName = 'Мастер-класс "Кармическое Таро" с экспертом и куратором с 04.03';
                    break;

                case 702:
                    productID = 4260060;
                    groupName = 'Мастер-класс "Кармическое Таро" с Ирэной';
                    break;
                case 716:
                    productID = 4260060;
                    groupName = 'Мастер-класс "Кармическое Таро" с Ирэной';
                    break;
                case 705:
                    productID = 4260062;
                    groupName = 'Мастер-класс "Кармическое Таро" с Ирэной с 04.03';
                    break;
                case 717:
                    productID = 4260062;
                    groupName = 'Мастер-класс "Кармическое Таро" с Ирэной с 04.03';
                    break;


                case 542:
                    productID = 3834859;
                    groupName = 'Астрологическое Таро (с куратором)';
                    break;
                case 543:
                    productID = 3834865;
                    groupName = 'Астрологическое Таро (с экспертом)';
                    break;
                case 626:
                    productID = 3834857;
                    groupName = 'Астрологическое Таро (с куратором)';
                    break;
                case 627:
                    productID = 3834859;
                    groupName = 'Астрологическое Таро (с куратором)';
                    break;

                case 544:
                    productID = 3834869;
                    groupName = 'Астрологическое Таро (с экспертом)';
                    break;
                case 545:
                    productID = 3834871;
                    groupName = 'Астрологическое Таро (с экспертом)';
                    break;
                case 628:
                    productID = 3834869;
                    groupName = 'Астрологическое Таро (с экспертом)';
                    break;
                case 629:
                    productID = 3834871;
                    groupName = 'Астрологическое Таро (с экспертом)';
                    break;

                case 632:
                    productID = 4009771;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 16.12)';
                    break;
                case 635:
                    productID = 4009771;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 16.12)';
                    break;
                case 633:
                    productID = 4009797;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (ВИП с Юлей) старт 26.12';
                    break;
                case 634:
                    productID = 4009797;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (ВИП с Юлей) старт 26.12';
                    break;

                case 188:
                case 190:
                case 444:
                case 452:
                    //productID = 2533477;
                    productID = 3282050;
                    groupName = 'Обучение "Самостоятельный"';
                    break;
                case 201:
                case 203:
                    productID = 2533541;
                    groupName = 'Обучение "Самостоятельный тариф"';
                    break;
                case 191:
                case 193:
                case 446:
                case 453:
                    //productID = 2533501;
                    productID = 3282128;
                    groupName = 'Обучение "С обратной связью"';
                    break;
                case 204:
                case 206:
                    productID = 2533556;
                    groupName = 'Обучение "Тариф с обратной связью"';
                    break;
                case 194:
                case 196:
                case 448:
                case 454:
                    //productID = 2533526;
                    productID = 3282134;
                    groupName = 'Обучение "VIP тариф с Юлей"';
                    break;
                case 207:
                case 209:
                    productID = 2533564;
                    groupName = 'Обучение "VIP тариф с Юлей"';
                    break;
                case 197:
                case 199:
                case 450:
                case 455:
                    //productID = 2533537;
                    productID = 3282141;
                    groupName = 'Обучение "VIP тариф с Ирэной"';
                    break;
                case 210:
                case 212:
                    productID = 2533571;
                    groupName = 'Обучение "VIP тариф с Ирэной"';
                    break;
                case 340:
                case 341:
                    productID = 2898284;
                    groupName = 'Годовой расклад на ТАРО: 12 месяцев, 12 сфер жизни';
                    break;
                case 429:
                    productID = 3235444;
                    groupName = 'Годовой расклад на ТАРО: 12 месяцев, 12 сфер жизни';
                    break;
                case 352:
                case 353:
                    productID = 2976712;
                    groupName = 'Аркан года и аркан судьбы: как рассчитать и применить на практике';
                    break;
                case 399:
                case 400:
                    productID = 3025093;
                    groupName = 'Сканирование человека по чакрам';
                    break;
                case 432:
                    productID = 3235450;
                    groupName = 'Сканирование человека по чакрам';
                    break;
                case 420:
                    productID = 3207169;
                    groupName = 'Настоящее и ближайшее будущее в жизни кверента';
                    break;
                case 421:
                    productID = 3235452;
                    groupName = 'Настоящее и ближайшее будущее в жизни кверента';
                    break;
                case 441:
                case 442:
                    productID = 3287088;
                    groupName = 'Вебинар "Психологическое Таро"';
                    break;
                case 430:
                    productID = 3235435;
                    groupName = 'Как тарологу обнаружить негативное воздействие';
                    break;
                case 431:
                    productID = 3235449;
                    groupName = 'Аркан года и аркан судьбы: как рассчитать и применить на практике';
                    break;
                case 436:
                case 437:
                    productID = 3250352;
                    groupName = 'Вебинар “Анализ отношений: быть или не быть вместе?”';
                    break;
                case 439:
                    productID = 3273035;
                    groupName = 'Вебинар “Анализ отношений: быть или не быть вместе?”';
                    break;
                case 472:
                    productID = 3373113;
                    groupName = 'Вебинар "Психологическое Таро"';
                    break;
                case 428:
                    productsMulti.push({
                        id: 3373113,
                        name: 'Вебинар "Психологическое Таро"',
                        price: 2490
                    })
                    productsMulti.push({
                        id: 3235435,
                        name: 'Как тарологу обнаружить негативное воздействие',
                        price: 2490
                    })
                    productsMulti.push({
                        id: 3235444,
                        name: 'Годовой расклад на ТАРО: 12 месяцев, 12 сфер жизни',
                        price: 2490
                    })
                    productsMulti.push({
                        id: 3235449,
                        name: 'Аркан года и аркан судьбы: как рассчитать и применить на практике',
                        price: 1990
                    })
                    productsMulti.push({
                        id: 3235450,
                        name: 'Сканирование человека по чакрам',
                        price: 2490
                    })
                    productsMulti.push({
                        id: 3235452,
                        name: 'Настоящее и ближайшее будущее в жизни кверента',
                        price: 2490
                    })
                    productsMulti.push({
                        id: 3273035,
                        name: 'Вебинар “Анализ отношений: быть или не быть вместе?',
                        price: 2490
                    })
                    break;

                case 481:
                case 459:
                    productID = 3494142;
                    groupName = 'ТАРО: как помочь себе и близким (запуск 25.06) Тариф Самостоятельный';
                    break;
                case 482:
                    productID = 3623818;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 15.08)';
                    break;
                case 483:
                case 465:
                    productID = 3749714;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (ВИП с Юлей)';
                    break;
                case 484:
                case 468:
                    productID = 4612227;
                    groupName = 'ТАРО: как помочь себе и близким (ВИП с Ирэной)';
                    break;

                case 505:
                    productID = 3592462;
                    groupName = 'Мастер-классы (Тариф Самостоятельный)';
                    break;
                case 506:
                    productID = 3592474;
                    groupName = 'Мастер-классы (Тариф с Куратором)';
                    break;
                case 507:
                    productID = 3592476;
                    groupName = 'Мастер-классы (Тариф с Экспертом)';
                    break;
                case 508:
                    productID = 3735301;
                    groupName = 'Совет таро';
                    break;
                case 527:
                    productID = 3612957;
                    groupName = 'Совет таро';
                    break;
                case 511:
                    productID = 3667021;
                    groupName = 'Мастер-классы (2 поток) тариф Самостоятельный';
                    break;
                case 512:
                    productID = 3667037;
                    groupName = 'Мастер-классы (2 поток) тариф с куратором';
                    break;
                case 513:
                    productID = 3667047;
                    groupName = 'Мастер-классы (2 поток) тариф с куратором';
                    break;
                case 514:
                    productID = 3667055;
                    groupName = 'Мастер-классы (2 поток) тариф с куратором';
                    break;
                case 515:
                    productID = 3667059;
                    groupName = 'Мастер-классы (2 поток) тариф с экспертом';
                    break;
                case 516:
                    productID = 3667066;
                    groupName = 'Мастер-классы (2 поток) тариф с экспертом';
                    break;
                case 517:
                    productID = 3612957;
                    groupName = 'Мастер-классы (2 поток) тариф с экспертом';
                    break;
                case 521:
                    productID = 3703575;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 23.09)';
                    break;
                case 534:
                case 462:
                    productID = 3776500;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 21.10)';
                    break;
                case 522:
                    productID = 3494142;
                    groupName = 'ТАРО: как помочь себе и близким (запуск 25.06) Тариф Самостоятельный';
                    break;
                case 523:
                    productID = 3623818;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 15.08)';
                    break;
                case 524:
                    productID = 3574934;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (ВИП с Юлей)';
                    break;
                case 525:
                    productID = 3503037;
                    groupName = 'ТАРО: как помочь себе и близким (ВИП с Ирэной)';
                    break;

                case 528:
                    productID = 3494142;
                    groupName = 'ТАРО: как помочь себе и близким (запуск 25.06) Тариф Самостоятельный';
                    break;
                case 529:
                    productID = 3703575;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 23.09)';
                    break;
                case 530:
                    productID = 3749714;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (ВИП с Юлей)';
                    break;
                case 531:
                    productID = 3503037;
                    groupName = 'ТАРО: как помочь себе и близким (ВИП с Ирэной)';
                    break;
                case 564:
                    productID = 3858144;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 18.11)';
                    break;
                case 604:
                    productID = 3952753;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (старт 16.12)';
                    break;
                case 600:
                    productID = 3902637;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (ВИП с Юлей) старт 13.01';
                    break;
                case 601:
                    productID = 3902637;
                    groupName = 'ШКОЛА ТАРО: как помочь себе и близким (ВИП с Юлей) старт 13.01';
                    break;
            }
        });
        switch (ctx.bitrix.deal.UF_CRM_1628621924030) {
            case '72':
            case '606':
            case '695':
            case '96':
            case '290':
            case '439':
                payment = 'tinkoffcredit';
                break;
            case '73':
            case '288':
                payment = 'sberbank';
                break;
            //case '292':
            case '445':
            case '294':
            case '295':
            case '298':
            case '382':
            case '512':
            case '714':
            case '528':
            case '527':
            case '529':
                payment = 'BILL';
                break;
        }

        let response;
        if (productsMulti.length > 0) {
            let dealData;
            for (const item of productsMulti) {
                dealData = {
                    'user': {
                        'email': ctx.bitrix.contact.EMAIL[0].VALUE,
                        'phone': ctx.bitrix.contact.PHONE[0].VALUE,
                        'first_name': ctx.bitrix.contact.NAME,
                        // 'last_name': ctx.bitrix.contact.LAST_NAME,
                        'group': item.name,
                    },
                    'system': {
                        'refresh_if_exists': 1,
                    },
                    'session': {
                        'referer': 'https://edu.taroirena.ru/',
                    },
                    'deal': {
                        'quantity': 1,
                        'deal_cost': parseInt(item.price),
                        'deal_is_paid': "да",
                        'payment_type': payment,
                        'payment_status': 'accepted',
                        'deal_comment': 'Test',
                        'deal_status': 'in_work',
                        'offer_code': item.id,
                    }
                }
                response = await apiGetcourse.addDeal(dealData);
                await bot.sendMsg(confActualDeal.tgBot.defaultTgId, JSON.stringify(response));
                await bot.sendMsg('262475445', 'productsMulti' + JSON.stringify(dealData));
                await bot.sendMsg('262475445', 'productsMulti ' + JSON.stringify(response));
            }
        }
        else {
            if (isServiceFree.length > 0) {
                let dealData;
                for (const item of isServiceFree) {
                    dealData = {
                        'user': {
                            'email': ctx.bitrix.contact.EMAIL[0].VALUE,
                            'phone': ctx.bitrix.contact.PHONE[0].VALUE,
                            'first_name': ctx.bitrix.contact.NAME,
                            // 'last_name': ctx.bitrix.contact.LAST_NAME,
                            //'group': item.name,
                        },
                        'system': {
                            'refresh_if_exists': 1,
                        },
                        'session': {
                            'referer': 'https://edu.taroirena.ru/',
                        },
                        'deal': {
                            'quantity': 1,
                            'deal_cost': parseInt(item.price),
                            'deal_is_paid': "да",
                            'payment_type': payment,
                            'payment_status': 'accepted',
                            'deal_comment': 'Test',
                            'deal_status': 'in_work',
                            'offer_code': item.id,
                        }
                    }
                    response = await apiGetcourse.addDeal(dealData);
                    await bot.sendMsg(confActualDeal.tgBot.defaultTgId, JSON.stringify(response));
                    await bot.sendMsg('262475445', 'isServiceFree deal' + JSON.stringify(dealData));
                    await bot.sendMsg('262475445', 'isServiceFree ' + JSON.stringify(response));
                }
            }
            else {
                let dealData = {
                    'user': {
                        'email': ctx.bitrix.contact.EMAIL[0].VALUE,
                        'phone': ctx.bitrix.contact.PHONE[0].VALUE,
                        'first_name': ctx.bitrix.contact.NAME,
                        // 'last_name': ctx.bitrix.contact.LAST_NAME,
                        'group': groupName,
                    },
                    'system': {
                        'refresh_if_exists': 1,
                    },
                    'session': {
                        'referer': 'https://edu.taroirena.ru/',
                    },
                    'deal': {
                        'quantity': 1,
                        'deal_cost': parseInt(ctx.bitrix.deal.OPPORTUNITY),
                        'deal_is_paid': "да",
                        'payment_type': payment,
                        'payment_status': 'accepted',
                        'deal_comment': 'Test',
                        'deal_status': 'in_work',
                        'offer_code': productID,
                    }
                }
                response = await apiGetcourse.addDeal(dealData);

                if (response) {
                    await bot.sendMsg(confActualDeal.tgBot.defaultTgId, JSON.stringify(response));
                    await bot.sendMsg('262475445', 'single' + JSON.stringify(dealData));
                    await bot.sendMsg('262475445', 'single ' + JSON.stringify(response));
                }
            }
        }

        return ctx.body = 'OK';
    },

    changeWAMessageProp: async (ctx, next) => {

        const a = new TelegramBot(globConf.common.tgBot.token); //TG id
        if (!ctx.bitrix.contact.EMAIL || !ctx.bitrix.contact.PHONE || !ctx.bitrix.contact.EMAIL.length || !ctx.bitrix.contact.PHONE.length) {
            if (!ctx.bitrix.contact.EMAIL || !ctx.bitrix.contact.EMAIL.length) {
                await sendMessageManager(ctx.bitrix.deal.ASSIGNED_BY_ID, 'У контакта не заполнен email. Сделка https://crm.taroirena.ru/crm/deal/details/' + ctx.bitrix.deal.ID + '/');
            }
            if (!ctx.bitrix.contact.PHONE || !ctx.bitrix.contact.PHONE.length) {
                await sendMessageManager(ctx.bitrix.deal.ASSIGNED_BY_ID, 'У контакта не заполнен номер телефона. https://crm.taroirena.ru/crm/deal/details/' + ctx.bitrix.deal.ID + '/');
            }
            throw new Error('Not found email or phone in contact (deal)');
        }

        if (ctx.bitrix.deal.OPPORTUNITY) {
            let bx = new BX(globConf.common.bitrixWebhook);
            let deal = await bx.getDeal(ctx.bitrix.deal ? ctx.bitrix.deal.ID : null);
            let confActualDeal = await getActualConf(deal)
            let updateData = {};
            let lastProductID = 0;
            ctx.bitrix.products.forEach(i => {
                lastProductID = i.PRODUCT_ID;
            });
            switch (parseInt(lastProductID)) {
                case 188:
                    updateData[globConf.common.fieldDiscount] = '12990';
                    updateData[globConf.common.fieldOrderPay] = '10990';
                    updateData[globConf.common.fieldPartialPay] = '1000';
                    break;
                case 444:
                    updateData[globConf.common.fieldDiscount] = '19990';
                    updateData[globConf.common.fieldOrderPay] = '14990';
                    updateData[globConf.common.fieldPartialPay] = '1000';
                    break;
                case 191:
                    updateData[globConf.common.fieldDiscount] = '19990';
                    updateData[globConf.common.fieldOrderPay] = '15990';
                    updateData[globConf.common.fieldPartialPay] = '1000';
                    break;
                case 446:
                    updateData[globConf.common.fieldDiscount] = '24990';
                    updateData[globConf.common.fieldOrderPay] = '19990';
                    updateData[globConf.common.fieldPartialPay] = '1000';
                    break;
                case 194:
                    updateData[globConf.common.fieldDiscount] = '49990';
                    updateData[globConf.common.fieldOrderPay] = '39990';
                    updateData[globConf.common.fieldPartialPay] = '5000';
                    break;
                case 448:
                    updateData[globConf.common.fieldDiscount] = '39990';
                    updateData[globConf.common.fieldOrderPay] = '34990';
                    updateData[globConf.common.fieldPartialPay] = '5000';
                    break;
                case 197:
                    updateData[globConf.common.fieldDiscount] = '119990';
                    updateData[globConf.common.fieldOrderPay] = '99990';
                    updateData[globConf.common.fieldPartialPay] = '10000';
                    break;
                case 450:
                    updateData[globConf.common.fieldDiscount] = '149990';
                    updateData[globConf.common.fieldOrderPay] = '119990';
                    updateData[globConf.common.fieldPartialPay] = '10000';
                    break;
                case 618:
                    updateData[globConf.common.fieldDiscount] = '8990';
                    updateData[globConf.common.fieldOrderPay] = '8990';
                    updateData[globConf.common.fieldPartialPay] = '1000';
                    break;
                case 619:
                    updateData[globConf.common.fieldDiscount] = '9990';
                    updateData[globConf.common.fieldOrderPay] = '9990';
                    updateData[globConf.common.fieldPartialPay] = '1000';
                    break;
                case 620:
                    updateData[globConf.common.fieldDiscount] = '10990';
                    updateData[globConf.common.fieldOrderPay] = '10990';
                    updateData[globConf.common.fieldPartialPay] = '1000';
                    break;
                case 621:
                    updateData[globConf.common.fieldDiscount] = '12990';
                    updateData[globConf.common.fieldOrderPay] = '12990';
                    updateData[globConf.common.fieldPartialPay] = '1000';
                    break;
                case 622:
                    updateData[globConf.common.fieldDiscount] = '19990';
                    updateData[globConf.common.fieldOrderPay] = '19990';
                    updateData[globConf.common.fieldPartialPay] = '3000';
                    break;
                case 623:
                    updateData[globConf.common.fieldDiscount] = '21990';
                    updateData[globConf.common.fieldOrderPay] = '21990';
                    updateData[globConf.common.fieldPartialPay] = '3000';
                    break;
            }
            await bx.updateDeal(ctx.bitrix.deal.ID, updateData);
        }

        return ctx.body = 'OK';
    },

    perModuleStart: async (ctx, next) => {
        let bx = new BX(globConf.common.bitrixWebhook);
        let deal = await bx.getDeal(ctx.bitrix.deal ? ctx.bitrix.deal.ID : null);
        let confActualDeal = await getActualConf(deal)

        const a = new TelegramBot(globConf.common.tgBot.token); //TG id
        const bot = new TelegramBot(globConf.common.tgBot.token);

        let bank = false;
        switch (ctx.bitrix.deal[globConf.common.fieldBank]) {
            case '73': bank = new Sber(Object.assign(globConf.common.payment.sber2, confActualDeal.payment.sber2)); break;
            case '288': bank = new Sber(Object.assign(globConf.common.payment.sber2, confActualDeal.payment.sber2)); break;
            case '290': bank = new Tinkoff(Object.assign(globConf.common.payment.tinkoff2, confActualDeal.payment.tinkoff2)); break;
            //case '445': bank = new Everypay(Object.assign(globConf.common.payment.every_pay, confActualDeal.payment.every_pay)); break;
            // case '292': bank = new Everypay(Object.assign(globConf.common.payment.every_pay, confActualDeal.payment.every_pay)); break;
            //case '382': bank = new Everypay(Object.assign(globConf.common.payment.every_pay2, confActualDeal.payment.every_pay2)); break;
            case '445': bank = new Everypay(Object.assign(globConf.common.payment.every_pay2, confActualDeal.payment.every_pay2)); break;
            case '525': bank = new Everypay(Object.assign(globConf.common.payment.every_pay3, confActualDeal.payment.every_pay3)); break;
            case '528': bank = new Everypay(Object.assign(globConf.common.payment.every_pay4, confActualDeal.payment.every_pay4)); break;
            case '527': bank = new Everypay(Object.assign(globConf.common.payment.every_pay5, confActualDeal.payment.every_pay5)); break;
            case '529': bank = new Everypay(Object.assign(globConf.common.payment.every_pay6, confActualDeal.payment.every_pay6)); break;
        }

        if (bank) {
            let productsUpdate;
            let weekProducts;
            let productType;
            let modulePay;
            let productID;
            let perModuleProductData;

            if (ctx.bitrix.deal.UF_CRM_1683265350.length > 0) {
                productID = ctx.bitrix.products[(ctx.bitrix.products.length - 1)].PRODUCT_ID

                weekProducts = confActualDeal.permodule.products['week_' + ctx.bitrix.deal.UF_CRM_1683265350];

                if (ctx.bitrix.deal.UF_CRM_1683031176.length > 0) {
                    modulePay = parseInt(ctx.bitrix.deal.UF_CRM_1683031176) + 1
                }
                else {
                    modulePay = parseInt(1)
                }
                productType = confActualDeal.permodule.source_product[productID]

                if (parseInt(weekProducts[productType]['module_' + modulePay].crm) === parseInt(productID)) {
                    productsUpdate = await bx.getDealProduct(ctx.bitrix.deal.ID);
                    let items = [];
                    productsUpdate.forEach(i => {
                        if (parseInt(productID) === parseInt(i.PRODUCT_ID)) {
                            perModuleProductData = i;
                            items.push({
                                name: i.ORIGINAL_PRODUCT_NAME,
                                QUANTITY: i.QUANTITY,
                                PRICE: +i.PRICE,
                            });
                        }
                    });

                    let paymentUrl

                    if (bank === 'Stripe') {
                        paymentUrl = 'https://payment.taroirena.com/?id=' + ctx.bitrix.deal.ID;
                    }
                    else {
                        paymentUrl = await bank.init(ctx.bitrix.deal.ID, items, {
                            email: ctx.bitrix.contact.EMAIL[0].VALUE,
                            phone: ctx.bitrix.contact.PHONE[0].VALUE,
                            description: items.reduce((acc, p) => acc + `${p.name} ${p.QUANTITY}шт\n`, '')
                        });
                    }

                    if (paymentUrl) {
                        let updateData = {};
                        updateData[globConf.common.fieldAdditionalPay] = perModuleProductData.PRICE;
                        updateData[globConf.common.fieldUrlPayment] = paymentUrl;
                        await bx.updateDeal(ctx.bitrix.deal.ID, updateData);
                    }
                }
            }

            return ctx.body = 'OK';




            if (ctx.bitrix.products.length < 2) {
                if (ctx.bitrix.deal.STAGE_ID === confActualDeal.status.start_pay) {
                    let productID;
                    let rows = [];
                    ctx.bitrix.products.forEach(i => {
                        rows.push({ ID: i.ID, PRODUCT_ID: i.PRODUCT_ID, PRICE: i.PRICE, QUANTITY: i.QUANTITY });
                        productID = i.PRODUCT_ID;
                    });
                    switch (productID) {
                        case 189:
                            rows.push({ PRODUCT_ID: 190, PRICE: 9990, QUANTITY: 1 });
                            break;
                        case 192:
                            rows.push({ PRODUCT_ID: 193, PRICE: 14990, QUANTITY: 1 });
                            break;
                        case 195:
                            rows.push({ PRODUCT_ID: 196, PRICE: 29990, QUANTITY: 1 });
                            break;
                        case 198:
                            rows.push({ PRODUCT_ID: 199, PRICE: 89990, QUANTITY: 1 });
                            break;
                        case 202:
                            rows.push({ PRODUCT_ID: 203, PRICE: 11990, QUANTITY: 1 });
                            break;
                        case 205:
                            rows.push({ PRODUCT_ID: 206, PRICE: 17990, QUANTITY: 1 });
                            break;
                        case 208:
                            rows.push({ PRODUCT_ID: 209, PRICE: 34990, QUANTITY: 1 });
                            break;
                        case 211:
                            rows.push({ PRODUCT_ID: 212, PRICE: 109990, QUANTITY: 1 });
                            break;
                        case 445:
                            rows.push({ PRODUCT_ID: 452, PRICE: 13990, QUANTITY: 1 });
                            break;
                        case 447:
                            rows.push({ PRODUCT_ID: 453, PRICE: 18990, QUANTITY: 1 });
                            break;
                        case 449:
                            rows.push({ PRODUCT_ID: 454, PRICE: 34990, QUANTITY: 1 });
                            break;
                        case 451:
                            rows.push({ PRODUCT_ID: 455, PRICE: 109990, QUANTITY: 1 });
                            break;
                        case 618:
                            rows.push({ PRODUCT_ID: 624, PRICE: 7990, QUANTITY: 1 });
                            break;
                        case 619:
                            rows.push({ PRODUCT_ID: 625, PRICE: 8990, QUANTITY: 1 });
                            break;
                        case 620:
                            rows.push({ PRODUCT_ID: 626, PRICE: 9990, QUANTITY: 1 });
                            break;
                        case 621:
                            rows.push({ PRODUCT_ID: 627, PRICE: 11990, QUANTITY: 1 });
                            break;
                        case 622:
                            rows.push({ PRODUCT_ID: 628, PRICE: 16990, QUANTITY: 1 });
                            break;
                        case 623:
                            rows.push({ PRODUCT_ID: 629, PRICE: 18990, QUANTITY: 1 });
                            break;

                        case 706:
                            rows.push({ PRODUCT_ID: 712, PRICE: 11990, QUANTITY: 1 });
                            break;
                        case 707:
                            rows.push({ PRODUCT_ID: 713, PRICE: 13990, QUANTITY: 1 });
                            break;
                        case 708:
                            rows.push({ PRODUCT_ID: 714, PRICE: 15990, QUANTITY: 1 });
                            break;
                        case 709:
                            rows.push({ PRODUCT_ID: 715, PRICE: 17990, QUANTITY: 1 });
                            break;
                        case 710:
                            rows.push({ PRODUCT_ID: 716, PRICE: 21990, QUANTITY: 1 });
                            break;
                        case 711:
                            rows.push({ PRODUCT_ID: 717, PRICE: 23990, QUANTITY: 1 });
                            break;
                    }

                    await bx.setDealProduct(ctx.bitrix.deal.ID, rows);
                }
            }

            productsUpdate = await bx.getDealProduct(ctx.bitrix.deal.ID);

            let items = [];
            let additionalProductData;

            productsUpdate.forEach(i => {
                switch (i.PRODUCT_ID) {
                    case 190:
                    case 193:
                    case 196:
                    case 199:
                    case 203:
                    case 206:
                    case 209:
                    case 212:
                    case 452:
                    case 453:
                    case 454:
                    case 455:
                    case 624:
                    case 625:
                    case 626:
                    case 627:
                    case 628:
                    case 629:
                    case 712:
                    case 713:
                    case 714:
                    case 715:
                    case 716:
                    case 717:
                        additionalProductData = i;
                        items.push({
                            name: i.ORIGINAL_PRODUCT_NAME,
                            QUANTITY: i.QUANTITY,
                            PRICE: +i.PRICE,
                        });
                        break;
                }
            });

            let paymentUrl

            if (bank === 'Stripe') {
                paymentUrl = 'https://payment.taroirena.com/?id=' + ctx.bitrix.deal.ID;
            }
            else {
                paymentUrl = await bank.init(ctx.bitrix.deal.ID, items, {
                    email: ctx.bitrix.contact.EMAIL[0].VALUE,
                    phone: ctx.bitrix.contact.PHONE[0].VALUE,
                    description: items.reduce((acc, p) => acc + `${p.name} ${p.QUANTITY}шт\n`, '')
                });
            }

            if (paymentUrl) {
                let updateData = {};
                updateData[globConf.common.fieldAdditionalPay] = additionalProductData.PRICE;
                updateData[globConf.common.fieldUrlPayment] = paymentUrl;
                await bx.updateDeal(ctx.bitrix.deal.ID, updateData);
            }
        }
        else {
            await sendMessageManager(ctx.bitrix.deal.ASSIGNED_BY_ID, 'Выбран неверный банк. Сделка https://crm.taroirena.ru/crm/deal/details/' + ctx.bitrix.deal.ID + '/');
            throw new Error('Bank not init' + ctx.bitrix.deal.ID);
        }

        return ctx.body = 'OK';
    },

    perModuleFixGcourse: async (ctx, next) => {
        let bx = new BX(globConf.common.bitrixWebhook);
        let deal = await bx.getDeal(ctx.bitrix.deal ? ctx.bitrix.deal.ID : null);

        await perModuleEndOnlyGCourse(ctx, deal);
    }
}