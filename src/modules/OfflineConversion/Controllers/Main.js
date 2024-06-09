const jsSHA = require("jssha");
const Setting = require('../Models/Setting');
const Helper = require(global.constant.DIR_HELPERS + 'common');
const Facebook = require(global.constant.DIR_CLASSES + '/Facebook');
const Yandex = require(global.constant.DIR_CLASSES + '/Yandex');
const GoogleAnalytics = require(global.constant.DIR_CLASSES + '/GoogleAnalytics');

module.exports = {
    index: async (ctx, next) => {
        let setting = await Setting.findByPk(ctx.request.body.settings_id);

        let s = [];
        for (let [key, value] of Object.entries(setting.dataValues)) {
            if (key == 'id' || key == 'createdAt' || key == 'updatedAt') continue;
            let keyFirst = key.split('_')[0];

            if (s[keyFirst] == undefined)
                s[keyFirst] = [];

            s[keyFirst][key] = value;
        }

        return ctx.render('/OfflineConversion/index', {
            name: 'Conversion',
            setting: s,
        });
    },

    sendDataFacebook: async (ctx, next) => {
        let system = await Setting.findByPk(ctx.request.body.settings_id);

        let productsFacebook = [];
        for (let value of ctx.bitrix.products) {
            productsFacebook.push({
                id: value.ID,
                quantity: value.QUANTITY,
                brand: value.PRODUCT_NAME,
                category: "product",
                price: value.PRICE
            });
        }

        let hashedPhoneNumber = '';
        if (ctx.bitrix.contact.PHONE && ctx.bitrix.contact.PHONE.length > 0) {
            let hashObj = new jsSHA("SHA-256", "TEXT", 1);
            hashObj.update(ctx.bitrix.contact.PHONE[0].VALUE);
            hashedPhoneNumber = hashObj.getHash("HEX");
        }

        let hashedEmailAddress = '';
        if (ctx.bitrix.contact.EMAIL && ctx.bitrix.contact.EMAIL.length > 0) {
            let hashObj = new jsSHA("SHA-256", "TEXT", 1);
            hashObj.update(ctx.bitrix.contact.EMAIL[0].VALUE);
            hashedEmailAddress = hashObj.getHash("HEX");
        }

        let data = JSON.stringify([
            {
                match_keys: {
                    phone: [hashedPhoneNumber],
                    email: [hashedEmailAddress],
                },
                currency: ctx.bitrix.deal.CURRENCY_ID,
                value: ctx.bitrix.deal.OPPORTUNITY,
                event_name: "Purchase",
                contents: productsFacebook,
                event_time: Math.round(new Date().getTime() / 1000)
            },
        ]);

        let responceInfo = {
            service: 'facebook',
            date: new Date()
        };

        if (await Facebook.sendEvent(system.dataValues.facebook_marker, system.dataValues.facebook_event_id, data) != 'error') {
            ctx.body = {
                status: 'success',
                data: responceInfo
            };
        } else {
            ctx.body = {
                status: 'error send',
                data: responceInfo
            };
            throw new Error('error send facebook');
        }

        return ctx.body;
    },

    sendFacebookConversion: async (ctx, next) => {
        let system = await Setting.findByPk(ctx.request.body.settings_id);

        if (ctx.bitrix.lead)
            ctx.bitrix.deal = ctx.bitrix.lead;

        let productsFacebook = [];
        for (let value of ctx.bitrix.products) {
            productsFacebook.push({
                id: value.ID,
                quantity: value.QUANTITY,
                item_price: value.PRICE
            });
        }

        let client_user_agent, fbc, fbp, client_ip_address, event_id;

        if (ctx.bitrix.lead) {
            client_user_agent = ctx.bitrix.lead.UF_CRM_1604489457808;
            fbc = ctx.bitrix.lead.UF_CRM_1603300087702;
            fbp = ctx.bitrix.lead.UF_CRM_1603299943600;
            client_ip_address = ctx.bitrix.lead.UF_CRM_1612023072992;
            event_id = ctx.bitrix.lead.UF_CRM_1603580545358;
        } else {
            client_user_agent = ctx.bitrix.deal.UF_CRM_5FA9328EA9289;
            fbc = ctx.bitrix.deal.UF_CRM_5F91B41130F0D;
            fbp = ctx.bitrix.deal.UF_CRM_5F91B4114C574;
            client_ip_address = ctx.bitrix.deal.UF_CRM_1612023171014;
            event_id = ctx.bitrix.deal.UF_CRM_1603872368118;
        }

        let userData = { client_ip_address, fbp, fbc, client_user_agent };

        let hashObj;

        if (ctx.bitrix?.contact?.PHONE && ctx.bitrix?.contact?.PHONE.length > 0) {
            hashObj = new jsSHA("SHA-256", "TEXT", 1);
            hashObj.update(ctx.bitrix.contact.PHONE[0].VALUE);
            userData.ph = hashObj.getHash("HEX");
        }

        if (ctx.bitrix?.contact?.EMAIL && ctx.bitrix?.contact?.EMAIL.length > 0) {
            hashObj = new jsSHA("SHA-256", "TEXT", 1);
            hashObj.update(ctx.bitrix.contact.EMAIL[0].VALUE);
            userData.em = hashObj.getHash("HEX");
        }

        if (ctx.bitrix?.contact?.SECOND_NAME) {
            hashObj = new jsSHA("SHA-256", "TEXT", 1);
            hashObj.update(ctx.bitrix.contact.SECOND_NAME);
            userData.ln = hashObj.getHash("HEX");
        }

        if (ctx.bitrix?.contact?.NAME) {
            hashObj = new jsSHA("SHA-256", "TEXT", 1);
            hashObj.update(ctx.bitrix.contact.NAME);
            userData.fn = hashObj.getHash("HEX");
        }

        if (ctx.bitrix?.contact?.ADDRESS_CITY) {
            hashObj = new jsSHA("SHA-256", "TEXT", 1);
            hashObj.update(ctx.bitrix.contact.ADDRESS_CITY);
            userData.ct = hashObj.getHash("HEX");
        }

        if (ctx.bitrix?.contact?.ADDRESS_COUNTRY) {
            hashObj = new jsSHA("SHA-256", "TEXT", 1);
            hashObj.update(ctx.bitrix.contact.ADDRESS_COUNTRY);
            userData.country = hashObj.getHash("HEX");
        }

        if (ctx.bitrix?.contact?.ADDRESS_POSTAL_CODE) {
            hashObj = new jsSHA("SHA-256", "TEXT", 1);
            hashObj.update(ctx.bitrix.contact.ADDRESS_POSTAL_CODE);
            userData.zp = hashObj.getHash("HEX");
        }

        let data = JSON.stringify([{
            event_name: ctx.request.query.event_name !== undefined ? ctx.request.query.event_name : "Purchase",
            event_source_url: "https://crm.taroirena.ru",
            action_source: 'website',
            event_time: Math.round(new Date().getTime() / 1000),
            event_id,
            user_data: userData,
            custom_data: {
                currency: ctx.bitrix.deal.CURRENCY_ID,
                value: ctx.bitrix.deal.OPPORTUNITY,
                contents: productsFacebook
            }
        }]);

        let responceInfo = {
            service: 'facebookConversion',
            date: new Date()
        };

        const response = await Facebook.sendEvent(system.dataValues.conversion_marker, system.dataValues.conversion_event_id, data);

        if (response.status) {
            ctx.body = {
                status: 'success',
                data: responceInfo
            };
        } else {
            ctx.body = {
                status: 'error send',
                data: responceInfo
            };
            throw new Error(JSON.stringify(response.error));
        }

        return ctx.body;
    },

    sendDataYandex: async (ctx, next) => {
        let setting = await Setting.findByPk(ctx.request.body.settings_id);

        let data = [];

        data.push({
            'ClientId': ctx.bitrix.deal.UF_CRM_5F91B41160ADF,
            'Target': setting.dataValues.yandex_target,
            'DateTime': Math.round(new Date().getTime() / 1000),
            'Price': ctx.bitrix.deal.OPPORTUNITY,
            'Currency': ctx.bitrix.deal.CURRENCY_ID,
        });

        let responceInfo = {
            service: 'yandex',
            date: new Date()
        };

        const yandex = new Yandex(setting.dataValues.yandex_token);
        if(ctx.bitrix.deal.UF_CRM_5F91B41160ADF && ctx.bitrix.deal.UF_CRM_5F91B41160ADF.length > 0) {
            let response = await yandex.sendEvent(setting.dataValues.yandex_counter, data, setting.dataValues.token);

            if (!response.error) {
                ctx.body = {
                    status: 'success',
                    data: responceInfo
                };
            }
            else {
                let errors = JSON.parse(response.error);

                ctx.body = {
                    status: 'error send',
                    data: responceInfo
                };
                throw new Error('error send yandex - ' + errors.errors[0].message);
            }
        }
        else {
            ctx.body = 'ok'
        }

        return ctx.body;
    },

    sendDataGoogleAnalytics: async (ctx, next) => {
        let setting = await Setting.findByPk(ctx.request.body.settings_id);
        let responceInfo = {
            service: 'google',
            date: new Date()
        };
        let data = {
            'cid': ctx.bitrix.deal.UF_CRM_5F91B411767A1,
            'ev': parseInt(ctx.bitrix.deal.OPPORTUNITY),
            't': 'event',
            'ec': setting.dataValues.ganalytics_category,
            'ea': setting.dataValues.ganalytics_name
        };

        if (await GoogleAnalytics.sendData(setting.dataValues.ganalytics_target, data) != 'error') {
            ctx.body = {
                status: 'success',
                data: responceInfo
            };
        } else {
            ctx.body = {
                status: 'error',
                data: responceInfo
            };
            throw new Error('error google');
        }

        return ctx.body;
    },

    sendDataGoogleAd: async (ctx, next) => {
        let setting = await Setting.findByPk(ctx.request.body.settings_id);

        let pathFile = global.constant.DIR_PUBLIC + setting.dataValues.token + '/' + setting.dataValues.google_path_file;

        let data = [];
        data.push({
            "Google Click ID": setting.dataValues.google_click_id,
            'Conversion Name': ctx.bitrix.deal.TITLE,
            'Conversion Time': Math.round(new Date().getTime() / 1000),
            'Conversion Value': ctx.bitrix.deal.OPPORTUNITY,
            'Conversion Currency': ctx.bitrix.deal.CURRENCY_ID,
        });

        await Helper.writeJsonInCSV(pathFile, data, true, 'Parameters:TimeZone=Europe/Moscow');

        return ctx.body = {
            status: 'success'
        };
    },

    saveSettings: async (ctx, next) => {
        let setting = await Setting.findByPk(ctx.request.body.settings_id);

        await Setting.update(ctx.request.body, { where: { id: setting.dataValues.id } });

        ctx.body = {
            'status': 'success'
        };
    }
};