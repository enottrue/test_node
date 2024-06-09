const rp = require('request-promise');
const jsSHA = require("jssha");
const helpers = require(global.constant.DIR_HELPERS + "/common");

const fs = require('fs')
const path = require('path')

module.exports = class Sber {
    #baseUrl;
    #login;
    #password;
    #notificationURL;
    #failURL;
    #orderId;
    #secretKey;

    constructor(configSber) {
        this.#baseUrl = configSber.urlApi;
        this.#login = configSber.login;
        this.#password = configSber.password;
        this.#notificationURL = configSber.notificationURL;
        this.#failURL = configSber.failURL;
        this.#secretKey = configSber.secretKey;
    }

    async init(dealID, products, info) {
        const cert = path.resolve('/etc/ssl/certs/russian_trusted_root_ca_pem.pem')

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
        const amount = products.reduce((acc, i) => acc + (+i.PRICE * i.QUANTITY), 0) * 100;
        const amountDescr = products.reduce((acc, i) => acc + (+i.PRICE * i.QUANTITY), 0);
        let data;
        let orderBundle;
        if (existCandles) {
            orderBundle = {
                cartItems: {
                    items: [],
                }
            };
            products.forEach(item => {
                orderBundle.cartItems.items.push({
                    'positionId': item.ID,
                    'name': item.PRODUCT_NAME,
                    'quantity': {
                        value: item.QUANTITY,
                        measure: 'шт',
                    },
                    'itemAmount': (item.PRICE * item.QUANTITY) * 100,
                    'itemCode': item.PRODUCT_ID,
                    'tax': 0,
                    'itemPrice': (item.PRICE) * 100,
                    'itemAttributes': {
                        attributes: [{
                            name: 'paymentMethod',
                            value: 4
                        }, {
                            name: 'paymentObject',
                            value: 1
                        }]
                    },
                })
            })
            data = {
                userName: this.#login,
                password: this.#password,
                orderNumber: dealID,
                amount,
                returnUrl: this.#notificationURL,
                failUrl: this.#failURL,
                sessionTimeoutSecs: 60 * 60 * 24 * 7,
                email: info.email,
                description: info.description + `(${amountDescr}р.)`,
                phone: info.phone,
                orderBundle,
                taxSystem: 1
            };
        }
        else {
            orderBundle = {
                cartItems: {
                    items: [],
                }
            };
            products.forEach(item => {
                orderBundle.cartItems.items.push({
                    'positionId': item.ID ? item.ID : item.PRODUCT_ID,
                    'name': item.NAME ? item.NAME : item.PRODUCT_NAME,
                    'quantity': {
                        value: item.QUANTITY,
                        measure: 'шт',
                    },
                    'itemAmount': (item.PRICE * item.QUANTITY) * 100,
                    'itemCode': item.PRODUCT_ID,
                    'tax': 0,
                    'itemPrice': (item.PRICE) * 100,
                    'itemAttributes': {
                        attributes: [{
                            name: 'paymentMethod',
                            value: 4
                        }, {
                            name: 'paymentObject',
                            value: 1
                        }]
                    },
                })
            })
            data = {
                userName: this.#login,
                password: this.#password,
                orderNumber: dealID,
                amount: parseInt(amount),
                returnUrl: this.#notificationURL,
                failUrl: this.#failURL,
                sessionTimeoutSecs: 60 * 60 * 24 * 7,
                email: info.email,
                description: info.description + `(${amountDescr}р.)`,
                phone: info.phone,
                //orderBundle,
                //taxSystem: 5
            };
        }

        let orderPrefix = 0;
        let response;
        do {
            data.orderNumber = dealID + '_' + orderPrefix;
            response = await rp({
                method: 'POST',
                uri: this.#baseUrl + '/register.do?' + helpers.objToUrl(data),
                json: true,
                ca: fs.readFileSync(cert)
            });
            orderPrefix++;
        } while (response.errorCode === '1')

        if (response.formUrl) {
            this.#orderId = response.orderId;
            return response.formUrl;
        }
        else helpers.telegramLog({ ...response, dealID });

        return false;
    }

    async initCandles(dealID, products, info) {
        const amount = products.reduce((acc, i) => acc + (+i.PRICE * i.QUANTITY), 0) * 100;
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
        data = {
            userName: this.#login,
            password: this.#password,
            orderNumber: dealID,
            amount,
            returnUrl: this.#notificationURL,
            failUrl: this.#failURL,
            sessionTimeoutSecs: 60 * 60 * 24 * 7,
            email: info.email,
            description: info.description + `(${amount}р.)`,
            phone: info.phone,
            orderBundle: JSON.stringify(orderBundle),
            taxSystem: 1
        };

        let orderPrefix = 0;
        let response;
        do {
            data.orderNumber = dealID + '_' + orderPrefix;
            response = await rp({
                method: 'POST',
                uri: this.#baseUrl + '/register.do?' + helpers.objToUrl(data),
                json: true,
                ca: fs.readFileSync(cert)

            });
            orderPrefix++;
        } while (response.errorCode === '1')

        if (response.formUrl) {
            this.#orderId = response.orderId;
            return response.formUrl;
        }
        else helpers.telegramLog({ ...response, dealID });

        return false;
    }

    checkToken(data) {
        data = { ...data };
        const token = data.checksum;

        delete data.checksum;
        delete data.sign_alias;
        delete data.token;
        let orderIdSplit = data?.orderNumber?.split('_');
        let orderId = orderIdSplit[0] ? orderIdSplit[0] : data.orderNumber
        const strData = `amount;${data.amount};mdOrder;${data.mdOrder};operation;${data.operation};orderNumber;${data.orderNumber};status;${data.status};`;
        const shaObj = new jsSHA('SHA-256', 'TEXT');
        shaObj.setHMACKey(this.#secretKey, 'TEXT');
        shaObj.update(strData);
        const sum = shaObj.getHMAC('HEX').toUpperCase();

        console.log("token")
        console.log(token)
        console.log("sum")
        console.log(sum)
        return sum === token;
    }

    checkTokenKurs(data) {
        data = { ...data };
        const token = data.checksum;

        delete data.checksum;
        delete data.sign_alias;
        delete data.token;

        const strData = `mdOrder;${data.mdOrder};operation;${data.operation};orderNumber;${data.orderNumber};status;${data.status};`;
        const shaObj = new jsSHA('SHA-256', 'TEXT');
        shaObj.setHMACKey(this.#secretKey, 'TEXT');
        shaObj.update(strData);
        const sum = shaObj.getHMAC('HEX').toUpperCase();

        return sum === token;
    }
}