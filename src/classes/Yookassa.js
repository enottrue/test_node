const rp = require('request-promise');
const jsSHA = require("jssha");
const helpers = require(global.constant.DIR_HELPERS + "/common");
const globConf = require("../modules/Acquire/config.json");

module.exports = class Yookassa {
    #baseUrl;
    #returnedUrl;
    #username;
    #secret;
    #fail;

    constructor(configYookassa) {
        this.#baseUrl = configYookassa.urlApi;
        this.#returnedUrl = configYookassa.returnUrl;
        this.#username = configYookassa.username;
        this.#secret = configYookassa.secret;
        this.#fail = configYookassa.returnUrl;

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
                return_url: this.#returnedUrl + '?deal=' + dealID,
                fail_url: this.#fail + '?deal=' + dealID,
            },
        }

       // process.stdout.write('Response items Yookassa: ' + JSON.stringify(items) + '\n');

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