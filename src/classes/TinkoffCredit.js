const rp = require('request-promise');
const jsSHA = require("jssha");
const helpers = require(global.constant.DIR_HELPERS + "/common");
const globConf = require("../modules/Acquire/config.json");

module.exports = class TinkoffCredit {
    #demoMode;
    #baseUrl;
    #shopId;
    #showcaseId;
    #notificationURL;
    #promocode;

    constructor(configTinkoffCredit) {
        this.#demoMode = configTinkoffCredit.demo
        this.#baseUrl = configTinkoffCredit.urlApi
        this.#shopId = configTinkoffCredit.shopId
        this.#showcaseId = configTinkoffCredit.showcaseId
        this.#notificationURL = configTinkoffCredit.notificationURL
        this.#promocode = configTinkoffCredit.promocode
    }

    checkToken(payment) {
        payment.ShopId = this.#shopId;

        let tokenData = {};

        Object.keys(payment)
            .filter(i => i !== 'Token')
            .sort()
            .forEach(key => tokenData[key] = payment[key]);

        let hashObj = new jsSHA("SHA-256", "TEXT", 1);
        hashObj.update(Object.values(tokenData).reduce((acc, i) => acc + i, ''));
        let token = hashObj.getHash("HEX");

        return token === payment.Token;
    }

    async init(dealID, products, contact, promoCode) {
        let items = [];
        
        products.forEach(i => {
            items.push({
                name: i.ORIGINAL_PRODUCT_NAME,
                quantity: i.QUANTITY,
                price: +i.PRICE,
            });
        });

        let cost = 0;
        products.forEach(i => {
            cost += (i.PRICE * i.QUANTITY);
        });

        let promoCodeID = '';

        if(promoCode) {
            promoCodeID = this.#promocode[promoCode]
        }
        else {
            throw new Error('field promocode (TCS tariff) is empty -' + dealID);
        }
        /*switch (promoCode){
            case '82':
                promoCodeID = 'installment_0_0_4_5,38';
                break;
            case '83':
                promoCodeID = 'installment_0_0_6_7';
                break;
            case '308':
                promoCodeID = 'installment_0_0_10_10,68';
                break;
            case '265':
                promoCodeID = 'installment_0_0_12_15,59';
                break;
        }*/

        let bodyRequest;
        if(this.#demoMode){
            bodyRequest = {
                shopId: this.#shopId,
                showcaseId: this.#showcaseId,
                demoFlow: 'sms',
                sum: cost,
                orderNumber: dealID,
                promoCode: promoCodeID,
                items: items,
                webhookURL: this.#notificationURL,
                values: {
                    mobilePhone: contact.phone,
                    email: contact.email,
                },
            };
        }
        else{
            let date = new Date();
            bodyRequest = {
                shopId: this.#shopId,
                showcaseId: this.#showcaseId,
                //demoFlow: 'sms',
                sum: cost,
                orderNumber: dealID+'_'+date.getTime(),
                promoCode: promoCodeID,
                items: items,
                //webhookURL: this.#notificationURL,
                values: {
                    mobilePhone: contact.phone,
                    email: contact.email,
                },
            };
        }

        let response = await rp({
            method: 'POST',
            uri: this.#baseUrl,
            body: bodyRequest,
            json: true
        });

        if (response.link) return response.link;
        else helpers.telegramLog({...response, dealID});

        return false;
    }
}