const cnf = require('../config.json')// './config.json');
const TelegramBot = require(global.constant.DIR_CLASSES + 'Telegram');
const BX = require(global.constant.DIR_CLASSES + '/BX');

const emailIsSet = async (leadData) => {
    let bx = new BX(cnf.bitrixWebhook);

    if (leadData.HAS_EMAIL === 'N' && leadData.CONTACT_ID.length < 1) {
        await bx.imNotify(leadData.ASSIGNED_BY_ID, "<a href='/crm/lead/details/" + leadData.ID +"/'>Лиде " + leadData.TITLE + "</a>  не укзан email, хотя привязаны товары.\n Пожалуйста укажите email ")
        leadData.STATUS_ID = 1;
        await bx.updateLead(leadData.ID, leadData)
    }
}
const getProductSection = async (productID) => {
    let bx = new BX(cnf.bitrixWebhook);

    const product = await bx.getCatalogProductData(productID)
    if(product) {
        return product.product.iblockSectionId
    }
}


module.exports = {
    leadConvert: async (ctx, next) => {
        const bot = new TelegramBot(cnf.tgBot.token); //TG id
        let request = ctx.request.query;
        let bx = new BX(cnf.bitrixWebhook);
        let categoryID = 1
        let dealServices = []
        let dealProducts = []
        let dealTraining = []

        let contact
        let contactID
        if(request.id) {
            const lead = await bx.getLead(request.id)

            if (lead) {
                //change statusID
                lead.STATUS_ID = 'CONVERTED'
                const leadProductsRows = await bx.getLeadProduct(request.id)
                let countProduct = 0
                if(leadProductsRows) {
                    for (let product of leadProductsRows) {
                        let productSection = await bx.getProductSection(product.PRODUCT_ID)

                        switch (productSection) {
                            case 19:
                                countProduct += 1;
                                categoryID = 2
                                dealServices.push({
                                    PRODUCT_ID: product.PRODUCT_ID,
                                    PRICE: product.PRICE,
                                    QUANTITY: product.QUANTITY,
                                })
                            case 59:
                                countProduct += 1;
                                categoryID = 1
                                dealProducts.push({
                                    PRODUCT_ID: product.PRODUCT_ID,
                                    PRICE: product.PRICE,
                                    QUANTITY: product.QUANTITY,
                                })
                                break
                            case 20:
                                countProduct += 1;
                                categoryID = 1
                                dealProducts.push({
                                    PRODUCT_ID: product.PRODUCT_ID,
                                    PRICE: product.PRICE,
                                    QUANTITY: product.QUANTITY,
                                })
                                break
                            case 43:
                                countProduct += 1;
                                categoryID = 3
                                dealTraining.push({
                                    PRODUCT_ID: product.PRODUCT_ID,
                                    PRICE: product.PRICE,
                                    QUANTITY: product.QUANTITY,
                                })
                                break
                        }
                    }

                    if (!lead?.ADDRESS && countProduct && !lead?.CONTACT_ID) {
                    //if (!lead?.ADDRESS && countProduct && !lead?.CONTACT_ID) {
                        let leadUpdate = { STATUS_ID: '1' }
                        await bx.updateLead(lead.ID, leadUpdate)
                        await bx.imNotify(lead.ASSIGNED_BY_ID, "Пожалуйста заполните поле \"Адрес\"  <a href='/crm/lead/details/" + lead.ID +"/'>в лиде " + lead.TITLE + "</a> \n Именно поле 'Улица, дом, корпус, строение' ")
                        return false
                    }
                }
                else {
                    let leadUpdate = { STATUS_ID: '1' }
                    await bx.updateLead(lead.ID, leadUpdate)
                    await bx.imNotify(lead.ASSIGNED_BY_ID, "  <a href='/crm/lead/details/" + lead.ID +"/'>Лид " + lead.TITLE + "</a>  не может быть сконвертирован если не добавить не одного товара ")
                    return false
                }

                if (!lead?.CONTACT_ID) {
                    if (lead.HAS_PHONE === 'Y') {
                        let phone = lead.PHONE[0].VALUE
                        const duplicateSearch = bx.duplicateSearch({
                            entity_type: 'CONTACT',
                            type: 'PHONE',
                            values: [
                                phone,
                                '+' + phone,
                                '+1' + phone,
                                '+2' + phone,
                                '+3' + phone,
                                '+4' + phone,
                                '+5' + phone,
                                '+6' + phone,
                                '+7' + phone,
                                '+8' + phone,
                                '+9' + phone,
                            ],
                        })
                        if(duplicateSearch?.CONTACT) {
                            let contactID = duplicateSearch.CONTACT[0]
                            lead.CONTACT_ID = contactID
                        }
                    }
                    if (lead.HAS_EMAIL === 'Y') {
                        let email = lead.EMAIL[0].VALUE
                        const duplicateSearch = bx.duplicateSearch({
                            entity_type: 'CONTACT',
                            type: 'EMAIL',
                            values: [
                                email,
                            ],
                        })
                        if(duplicateSearch?.CONTACT) {
                            let contactID = duplicateSearch.CONTACT[0]
                            lead.CONTACT_ID = contactID
                        }
                    }
                    if(!lead?.ADDRESS && countProduct > 0){
                        let leadUpdate = { STATUS_ID: '1' }
                        await bx.updateLead(lead.ID, leadUpdate)
                        await bx.imNotify(lead.ASSIGNED_BY_ID, "Пожалуйста заполните поле \"Адрес\"  <a href='/crm/lead/details/" + lead.ID +"/'>в лиде " + lead.TITLE + "</a> \n Именно поле 'Улица, дом, корпус, строение' ")
                        return false
                    }

                    let newContact = {
                        NAME: lead.NAME ?? ' Не указан',
                        SECOND_NAME: lead.SECOND_NAME ?? ' Не указан',
                        LAST_NAME: lead.LAST_NAME ?? ' Не указан',
                        SOURCE_ID: lead.SOURCE_ID,
                        BIRTHDATE: lead.BIRTHDATE,
                        ASSIGNED_BY_ID: lead.ASSIGNED_BY_ID,
                        ADDRESS: lead.ADDRESS,
                        ADDRESS_2: lead.ADDRESS_2,
                        ADDRESS_CITY: lead.ADDRESS_CITY,
                        ADDRESS_COUNTRY: lead.ADDRESS_COUNTRY,
                        ADDRESS_COUNTRY_CODE: lead.ADDRESS_COUNTRY_CODE,
                        ADDRESS_POSTAL_CODE: lead.ADDRESS_POSTAL_CODE,
                        ADDRESS_PROVINCE: lead.ADDRESS_PROVINCE,
                        ADDRESS_REGION: lead.ADDRESS_REGION,
                    }

                    if (lead?.HAS_PHONE === 'Y') {
                        newContact['PHONE'] = [
                            {
                                VALUE_TYPE: 'WORK',
                                VALUE: lead.PHONE[0].VALUE,
                                TYPE_ID: 'PHONE',
                            }
                        ]
                    }
                    if (lead?.HAS_EMAIL === 'Y') {
                        newContact['EMAIL'] = [
                            {
                                VALUE_TYPE: 'WORK',
                                VALUE: lead.EMAIL[0].VALUE,
                                TYPE_ID: 'EMAIL',
                            }
                        ]
                    }
                    contact = await bx.addContact(newContact)
                    if(contact) {
                        lead.CONTACT_ID = contact
                        contactID = contact
                    }

                    const newAddress = {
                        ADDRESS_1: lead.ADDRESS,
                        ADDRESS_2: lead.ADDRESS_2,
                        CITY: lead.ADDRESS_CITY,
                        COUNTRY: lead.ADDRESS_COUNTRY,
                        COUNTRY_CODE: lead.ADDRESS_COUNTRY_CODE,
                        POSTAL_CODE: lead.ADDRESS_POSTAL_CODE,
                        PROVINCE: lead.ADDRESS_PROVINCE,
                        REGION: lead.ADDRESS_REGION,
                    }

                    await bx.addressUpdate(lead.CONTACT_ID, newAddress)
                }
                else {
                    contactID = lead.CONTACT_ID
                    const newAddress = {
                        ADDRESS_1: lead.ADDRESS,
                        ADDRESS_2: lead.ADDRESS_2,
                        CITY: lead.ADDRESS_CITY,
                        COUNTRY: lead.ADDRESS_COUNTRY,
                        COUNTRY_CODE: lead.ADDRESS_COUNTRY_CODE,
                        POSTAL_CODE: lead.ADDRESS_POSTAL_CODE,
                        PROVINCE: lead.ADDRESS_PROVINCE,
                        REGION: lead.ADDRESS_REGION,
                    }

                    await bx.addressUpdate(lead.CONTACT_ID, newAddress)
                }

                let address = lead.ASSIGNED_BY_ID +
                    '\n' + lead.ADDRESS +
                    '\n' + lead.ADDRESS_2 +
                    '\n' + lead.ADDRESS_CITY +
                    '\n' + lead.ADDRESS_COUNTRY +
                    '\n' + lead.ADDRESS_COUNTRY_CODE +
                    '\n' + lead.ADDRESS_POSTAL_CODE +
                    '\n' + lead.ADDRESS_PROVINCE +
                    '\n' + lead.ADDRESS_REGION

                let dealData = {
                    TITLE: lead.TITLE,
                    CONTACT_ID: contactID,
                    CATEGORY_ID: categoryID,
                    ASSIGNED_BY_ID: lead.ASSIGNED_BY_ID,
                    COMMENTS: lead.COMMENTS,
                    SOURCE_DESCRIPTION: lead.SOURCE_DESCRIPTION,
                    UTM_CAMPAIGN: lead.UTM_CAMPAIGN,
                    UTM_CONTENT: lead.UTM_CONTENT,
                    UTM_MEDIUM: lead.UTM_MEDIUM,
                    UTM_SOURCE: lead.UTM_SOURCE,
                    UTM_TERM: lead.UTM_TERM,
                    SOURCE_ID: lead.SOURCE_ID,
                    UF_CRM_5E7933830929C: lead.UF_CRM_1584999057385,
                    UF_CRM_5E7933830F261: lead.UF_CRM_1584999183,
                    UF_CRM_5E79338314E33: lead.UF_CRM_1584999195,
                    UF_CRM_1658594405211: lead.UF_CRM_1658594305626,
                    UF_CRM_63285DF2BCCD1: lead.UF_CRM_1660827441,
                    //UF_CRM_1663260944: lead.UF_CRM_1660827441,

                    UF_CRM_5F91B41130F0D: lead.UF_CRM_1603300087702,
                    UF_CRM_5F91B4114C574: lead.UF_CRM_1603299943600,
                    UF_CRM_5F91B411767A1: lead.UF_CRM_1603300242624,
                    UF_CRM_5F91B41160ADF: lead.UF_CRM_1603300161410,
                    UF_CRM_1603872368118: lead.UF_CRM_1603580545358,

                    UF_CRM_1597094640508: lead.UF_CRM_1597093920241,

                    UF_CRM_1585002261657: lead.UF_CRM_1595564388005,

                    UF_CRM_5F27C3BFCB830: lead.UF_CRM_1596378583712,

                    UF_CRM_5FA9328EA9289: lead.UF_CRM_1604489457808,
                    UF_CRM_1612023171014: lead.UF_CRM_1612023072992,

                    UF_CRM_60EFEE58F0AFA: lead.UF_CRM_1623835001,
                }

                if(lead.UF_CRM_1584999032422) {
                    if(cnf.crm.lead.deliveries_id[lead.UF_CRM_1584999032422]) {
                        dealData.UF_CRM_5E793382ECA8C = cnf.crm.lead.deliveries_id[lead.UF_CRM_1584999032422]
                    }
                }
                else {
                    dealData.UF_CRM_5E793382ECA8C = ''
                }

                const addDeal = await bx.addDeal(dealData)

                let dealID = false
                if(addDeal) {
                    dealID = addDeal
                }

                switch (categoryID) {
                    case 2:
                        dealProducts = dealServices
                        break
                    case 3:
                        dealProducts = dealTraining
                        break
                }

                let productRows = []
                for (let product of dealProducts) {
                    productRows.push(product)
                }

                let addProductDeal = await bx.setDealProduct(dealID, productRows)

                if (addProductDeal) {
                    await bx.updateLead(lead.ID, lead)
                }

                await bx.imNotify(lead.ASSIGNED_BY_ID, "  <a href='/crm/lead/details/" + lead.ID + "/'>Лид " + lead.TITLE + "</a> успешно сконвертирован!  ")
            }
        }
        else {
            throw new Error('Лид не найден = ID ' + request.id)
        }

        return ctx.body = 'ok'
    },
    billPayment: async (ctx, next) => {
        let current = new Date();
        let paddatepart = (part) => {
            return part >= 10 ? part.toString() : '0' + part.toString();
        };
        let date2str = (d) => {
            return d.getFullYear() + '-' + paddatepart(1 + d.getMonth()) + '-' + paddatepart(d.getDate()) + 'T' + paddatepart(d.getHours())
                + ':' + paddatepart(d.getMinutes()) + ':' + paddatepart(d.getSeconds()) + '+03:00';
        };
        const bot = new TelegramBot(cnf.tgBot.token); //TG id

        let bx = new BX(cnf.bitrixWebhook);
        let request = ctx.request.query;

        if(request.id) {
            const deal = await bx.getDeal(request.id)
            const invoices = await bx.getInvoiceByDealId(deal.ID)

            if (invoices) {
                for (let item in invoices) {
                    await bx.updateInvoices(invoices[item].ID, {
                        STATUS_ID: 'P',
                        PAY_VOUCHER_DATE: date2str(current)
                    })
                    if(parseInt(item) === 0){
                        await bx.updateDeal(deal.ID, { UF_CRM_1605160896595: date2str(current) })
                    }
                }

                let result = await bx.imNotify(deal.ASSIGNED_BY_ID, "<a href='/crm/deal/details/" + deal.ID +"/'>Счет сделки " + deal.TITLE + "</a>  был переведен в статус \"Оплачен\" ")
                if (result){
                    console.log(result)
                }
            }
        }
        else {
            throw new Error('Сделка не найдена = ID ' + request.id)
        }

        return ctx.body = 'ok'
    },
    addressIsSet: async (ctx, next) => {
        let bx = new BX(cnf.bitrixWebhook);
        let request = ctx.request.query;

        const leadID = request.ID
        const leadData = await bx.getLead(leadID)
        const leadAddress = leadData.ADDRESS
        let countProduct = 0
        let countService = 0

        const leadProducts = await bx.getLeadProduct(leadID)

        if (leadProducts && leadProducts.length > 0) {
            for (let iKey in leadProducts) {
                const sectionProduct = await getProductSection(leadProducts[iKey].PRODUCT_ID)
                switch (sectionProduct) {
                    case 19:
                        countService++
                        break
                    case 19:
                        countProduct++
                        break
                }
            }
        }
        if (countProduct > 0){
            await emailIsSet(leadData)
        }
        if (!leadAddress && countProduct > 0 && leadData.CONTACT_ID < 1) {
            leadData.STATUS_ID = 1;
            await bx.imNotify(leadData.ASSIGNED_BY_ID, "Пожалуйста заполните поле \"Адрес\" <a href='/crm/lead/details/" + leadData.ID +"/'>в Лиде " + leadData.TITLE + "</a> \n Именно поле 'Улица, дом, корпус, строение' ")
            await bx.updateLead(leadData.ID, leadData)
        }
    }
};