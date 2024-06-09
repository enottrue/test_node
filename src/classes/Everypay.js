const rp = require('request-promise');
const jsSHA = require("jssha");
const helpers = require(global.constant.DIR_HELPERS + "/common");

module.exports = class Everypay {
    #baseUrl;
    #callbackUrl;
    #username;
    #secret;
    #account;
    #fail;
    #success;
    #return;

    constructor(configEverypay) {
        this.#baseUrl = configEverypay.urlApi;
        this.#callbackUrl = configEverypay.callbackApi;
        this.#username = configEverypay.username;
        this.#secret = configEverypay.secret;
        this.#account = configEverypay.account;
        this.#fail = configEverypay.fail;
        this.#success = configEverypay.success;
        this.#return = configEverypay.returnUrl;
    }

    async init(dealID, products, info) {
        let existCandles = false;
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
        })
        let productAmount = (products.reduce((acc, i) => acc + (+i.PRICE * i.QUANTITY), 0))
        let amount = await this.convertCurrency(productAmount);
        let data;
        let timestamp = new Date();

        data = {
            timestamp: timestamp.toISOString(),
            api_username: this.#username,
            account_name: this.#account,
            amount: amount,
            order_reference: dealID + '-' + timestamp.toISOString(),
            nonce: dealID + '-' + timestamp.toISOString(),
            customer_url: this.#return,
        }

        let response;
        const auth = 'Basic ' + new Buffer(this.#username + ':' + this.#secret).toString('base64');
        do {
            response = await rp({
                method: 'POST',
                uri: this.#baseUrl,
                body: data,
                json: true,
                headers: {
                    'Authorization': auth
                },
            });
        } while (response.errorCode === '1')

        if (response.payment_link) {
            return response.payment_link;
        }
        else helpers.telegramLog({ ...response, dealID });

        return false;
    }

    async initCandles(dealID, products, info) {
        let productAmount = (products.reduce((acc, i) => acc + (+i.PRICE * i.QUANTITY), 0) * 100)
        let amount = await this.convertCurrency(productAmount);
        let data;

        let orderBundle = {
            cartItems: {
                items: [],
            }
        };
        products.forEach(item => {
            let productName;
            if (item.name) {
                productName = item.name;
            }
            else {
                productName = item.PRODUCT_NAME;
            }
            orderBundle.cartItems.items.push({
                "positionId": item.ID,
                "name": productName,
                "itemAmount": (item.PRICE * item.QUANTITY) * 100,
                "quantity": {
                    "value": item.QUANTITY,
                    "measure": "шт",
                },
                "itemCode": item.ID,
                "itemPrice": item.PRICE * 100,
            })
        })
        let timestamp = new Date();
        data = {
            timestamp: timestamp.toISOString(),
            api_username: this.#username,
            account_name: this.#account,
            amount: amount,
            order_reference: dealID + '_' + timestamp.toISOString(),
            nonce: dealID + '_' + timestamp.toISOString(),
            customer_url: this.#success,
        }

        let response;
        const auth = 'Basic ' + new Buffer(this.#username + ':' + this.#secret).toString('base64');
        do {
            response = await rp({
                method: 'POST',
                uri: this.#baseUrl + '?' + helpers.objToUrl(data),
                //body: data,
                json: true,
                headers: {
                    'Authorization': auth
                },
            });
        } while (response.errorCode === '1')

        if (response.payment_link) {
            return response.payment_link;
        }
        else helpers.telegramLog({ ...response, dealID });

        return false;
    }

    async checkToken(data) {
        data = { ...data };
        const auth = 'Basic ' + new Buffer(this.#username + ':' + this.#secret).toString('base64');
        let response = await rp({
            method: 'GET',
            uri: this.#callbackUrl + data.payment_reference + '?api_username=' + this.#username,
            body: data,
            json: true,
            headers: {
                'Authorization': auth
            },
        });
        if (response){
            console.log(response)
        }
        if (response.payment_state) {
            return response.payment_state
        }
        else {
            return false
        }
    }

    async getDataById(data) {
        data = { ...data };
        const auth = 'Basic ' + new Buffer(this.#username + ':' + this.#secret).toString('base64');
        let response = await rp({
            method: 'GET',
            uri: this.#callbackUrl + data.payment_reference + '?api_username=' + this.#username,
            body: data,
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

    checkTokenKurs(data) {
        data = { ...data };

        return true
        //const token = data.checksum;

        //delete data.checksum;
        //delete data.sign_alias;
        //delete data.token;

        //const strData = `mdOrder;${data.mdOrder};operation;${data.operation};orderNumber;${data.orderNumber};status;${data.status};`;
        //const shaObj = new jsSHA('SHA-256', 'TEXT');
        //shaObj.setHMACKey(this.#secretKey, 'TEXT');
        //shaObj.update(strData);
        //const sum = shaObj.getHMAC('HEX').toUpperCase();

        //return sum === token;
    }

    async convertCurrency(amount) {
        /**
         * Корректировка округления десятичных дробей.
         *
         * @param {String}  type  Тип корректировки.
         * @param {Number}  value Число.
         * @param {Integer} exp   Показатель степени (десятичный логарифм основания корректировки).
         * @returns {Number} Скорректированное значение.
         */
        function decimalAdjust(type, value, exp) {
            // Если степень не определена, либо равна нулю...
            if (typeof exp === 'undefined' || +exp === 0) {
                return Math[type](value);
            }
            value = +value;
            exp = +exp;
            // Если значение не является числом, либо степень не является целым числом...
            if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
                return NaN;
            }
            // Сдвиг разрядов
            value = value.toString().split('e');
            value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
            // Обратный сдвиг
            value = value.toString().split('e');
            return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
        }

        // Десятичное округление к ближайшему
        if (!Math.round10) {
            Math.round10 = function (value, exp) {
                return decimalAdjust('round', value, exp);
            };
        }
        // Десятичное округление вниз
        if (!Math.floor10) {
            Math.floor10 = function (value, exp) {
                return decimalAdjust('floor', value, exp);
            };
        }
        // Десятичное округление вверх
        if (!Math.ceil10) {
            Math.ceil10 = function (value, exp) {
                return decimalAdjust('ceil', value, exp);
            };
        }

        let base = 'RUB';
        let convert = 'EUR';
        let response = await rp({
            method: 'GET',
            uri: 'https://www.cbr-xml-daily.ru/daily_json.js',
            json: true
        });
        if (response) {
            let convertRubToEur = response['Valute'][convert].Value;
            return Math.round10((amount > 0 ? amount : 0) / convertRubToEur, -1);
        }
    }

}