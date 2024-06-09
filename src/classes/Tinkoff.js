const rp = require('request-promise');
const jsSHA = require("jssha");
const helpers = require(global.constant.DIR_HELPERS + "/common");

module.exports = class Tinkoff {
    #baseUrl;
    #terminalId;
    #notificationURL;
    #passwordTerminal;
    #Tax;
    #Taxation;

    constructor(configTinkoff) {
        this.#baseUrl = configTinkoff.urlApi
        this.#terminalId = configTinkoff.terminalId
        this.#notificationURL = configTinkoff.notificationURL
        this.#passwordTerminal = configTinkoff.passwordTerminal
        this.#Tax = configTinkoff.tax
        this.#Taxation = configTinkoff.taxation
    }

    checkToken(payment) {
        payment.Password = this.#passwordTerminal;

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

    async init(dealID, products, contact) {

        let payment_subject
        let payment_mode;
        
        switch (contact.payment_mode) {
            case '79':
                payment_mode = 'full_payment';
                break;
            case '80':
                payment_mode = 'prepayment';
                break;
            case '616':
                payment_mode = 'full_payment';
                break;
            case '617':
                payment_mode = 'partial_prepayment';
                break;
                default:
        }
        switch (contact.payment_subject) {
            case '717':
                payment_subject = 'service';
                break;
            case '716':
                payment_subject = 'commodity';
                break;
            case '720':
                payment_subject = 'commodity'; 
                    break;
            case '721':
                payment_subject = 'service';
                    break;
            default:
        }

        const price = products.reduce((acc,i) => acc + (+i.PRICE * i.QUANTITY), 0) * 100;
        let tokenData = [
            { "Amount": price },
            { "OrderId": dealID },
            { "NotificationURL": this.#notificationURL },
            { "Password": this.#passwordTerminal },
            { "TerminalKey": this.#terminalId }
        ];

        tokenData.sort((a, b) => {
            let keyA = Object.keys(a)[0];
            let keyB = Object.keys(b)[0];
            return keyA.localeCompare(keyB);
        });

        let hashObj = new jsSHA("SHA-256", "TEXT", 1);
        hashObj.update(tokenData.reduce((acc, i) => acc + (Object.values(i)[0]), ''));
        let token = hashObj.getHash("HEX");
        
        let items = [];
        
        products.forEach(i => {
            items.push({
                Name: i.ORIGINAL_PRODUCT_NAME || i.PRODUCTNAME,
                Quantity: i.QUANTITY,
                Amount: +(i.PRICE * 100) * i.QUANTITY,
                Price: +i.PRICE * 100,
                Tax: this.#Tax,
                PaymentMethod:payment_mode,
                PaymentObject:payment_subject
            });
        });

        let receipt = {
            Email: contact.email,
            Phone: contact.phone,
            Taxation: this.#Taxation,
            Items: items
        };

        let requestBody = {
            Amount: price,
            OrderId: dealID,
            TerminalKey: this.#terminalId,
            NotificationURL: this.#notificationURL,
            Receipt: receipt,
            Token: token
        };

       // process.stdout.write('Response  Tinkoff: ' + JSON.stringify(requestBody) + '\n')

        let response = await rp({
            method: 'POST',
            uri: this.#baseUrl + '/Init',
            body: requestBody,
            json: true
        });

        // let response = await rp({
        //     method: 'POST',
        //     uri: this.#baseUrl + '/Init',
        //     body: {
        //         Amount: price,
        //         OrderId: dealID,
        //         TerminalKey: this.#terminalId,
        //         NotificationURL: this.#notificationURL,
        //         Receipt: receipt,
        //         Token: token
        //     },
        //     json: true
        // });

        if (response.Success) return response.PaymentURL;
        else helpers.telegramLog({...response, dealID});

        return false;
    }
}