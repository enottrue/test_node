const rp = require('request-promise');

const moyskladLib = require('moysklad');
const fetch = require('node-fetch');
const Bottleneck = require("bottleneck");

const BX = require(global.constant.DIR_CLASSES + '/BX');
const cnf = require("../modules/Moysklad/config.json");

module.exports = class MoySklad {
    #cnf
    #ms = {};
    #bx = {};

    constructor(cnf) {
        this.#cnf = cnf;
        this.#ms = moyskladLib({ token: this.#cnf.ms.auth.token, fetch, apiVersion: '1.2' })
        this.#bx = new BX(this.#cnf.bitrixWebhook)
        this.limiter = new Bottleneck({
            minTime: 500,
            maxConcurrent: 1,
        })
    }

    async create(itemType, data) {
        // setTimeout(()=>{
        //     return this.#ms.POST(itemType, data)
        // },3000);
        return this.#ms.POST(itemType, data);
    }

    async get(itemType, id) {
        // setTimeout(()=>{
        //     return this.#ms.GET([itemType, id])
        // },3000);
        return this.#ms.GET([itemType, id]);
    }

    async delete(itemType, id) {
        // setTimeout(()=>{
        //     return this.#ms.DELETE([itemType, id])
        // },3000);
        return this.#ms.DELETE([itemType, id]);
    }

    async update(itemType, id, data) {
        // setTimeout(()=>{
        //     return this.#ms.PUT([itemType, id], data)
        // },3000);
        return this.#ms.PUT([itemType, id], data);
    }

    async upload(id, itemType, data) {
        if (id) return this.update(itemType, id, data);
        else return this.create(itemType, data);
    }


    async formatBxToMsProducts (products, reserved = true) {
        const msFormatProducts = []

        let skuMs

        for(let product of products) {
            let catalogProductData = await this.#bx.getCatalogProductData(product.PRODUCT_ID)

            if(catalogProductData) {
                if (catalogProductData.product.property70) {
                    skuMs = catalogProductData.product.property70.value
                }
                else {
                    if (catalogProductData.product.parentId) {
                        let catalogProductParentData = await this.#bx.getCatalogProductData(catalogProductData.product.parentId.value)

                        if (catalogProductParentData.product.property70) {
                            skuMs = catalogProductParentData.product.property70.value
                        }
                    }
                }

                if (skuMs) {
                    let productMeta = await this.limiter.schedule(async () => await this.getProductMeta(skuMs))

                    if(productMeta) {
                        if (reserved) {
                            msFormatProducts.push({
                                quantity: product.QUANTITY,
                                price: (parseFloat(product.PRICE) * 100),
                                assortment: {
                                    meta: productMeta
                                },
                                reserve: product.QUANTITY
                            })
                        }
                        else {
                            msFormatProducts.push({
                                quantity: product.QUANTITY,
                                price: (parseFloat(product.PRICE) * 100),
                                assortment: {
                                    meta: productMeta
                                },
                                reserve: 0
                            })
                        }
                    }
                }
            }
        }

        return msFormatProducts
    }

    genOrganization () {
        return {
            meta: {
                href: `${this.#cnf.ms.url}/${this.#cnf.ms.entity.organization}/${this.#cnf.ms.meta.organization}`,
                type: 'organization',
                mediaType: 'application/json',
            },
        }
    }
    genAgent () {
        return {
            meta: {
                href: `${this.#cnf.ms.url}/${this.#cnf.ms.entity.agent}/${this.#cnf.ms.meta.agent}`,
                type: 'counterparty',
                mediaType: 'application/json',
            },
        }
    }
    genStore() {
        return {
            meta: {
                href: `${this.#cnf.ms.url}/${this.#cnf.ms.entity.store}/${this.#cnf.ms.meta.mainStore}`,
                type: 'store',
                mediaType: 'application/json',
            },
        }
    }
    async genDescription(contact, deal, manager) {
        const fullName = this.getClientFullName(contact)
        const trackNumber = this.getTrackNumber(deal)
        const phone = parseInt(await this.getPhone(contact, deal.ID))
        const email = await this.getEmail(contact, deal.ID)
        const address = await this.getAddress(contact, deal.ID)
        const delivery = await this.getDeliveryName(deal, deal.ID)
        const managerName = await this.getFullnameManager(manager, deal.ID)
        const comment = this.getDealComments(deal)

        return `${fullName ? `ФИО: ${fullName}\n` : ''}` +
            `${trackNumber ? `Трек: ${trackNumber}\n` : ''}` +
            `${phone ? `Номер телефона: ${phone}\n` : ''}` +
            `${email ? `Email: ${email}\n` : ''}` +
            `${address ? `Адрес: ${address}\n` : ''}` +
            `${delivery ? `Доставка: ${delivery}\n` : ''}` +
            `${managerName ? `Ответственный менеджер по сделке в CRM: ${managerName}\n` : ''}` +
            `${comment ? `Комментарий к отгрузке (МойСклад): ${comment}` : ''}`;
    }
    genState(state) {
        return {
            meta: this.#cnf.ms.meta.states[state]
        }
    }
    genStateDemand(state) {
        return {
            meta: this.#cnf.ms.meta.states_demand[state]
        }
    }

    async genAttributes (contact, deal, manager) {
        const fullName = this.getClientFullName(contact)
        const phone = await this.getPhone(contact, deal.ID, manager.ID)
        const email = await this.getEmail(contact, deal.ID, manager.ID)
        const address = await this.getAddress(contact, deal.ID, manager.ID)
        const managerName = await this.getFullnameManager(manager, deal.ID, manager.ID)
        const paymentDate = this.formatOrderDate()

        return [
            {
                meta: {
                    href: this.#cnf.ms.url + '/' + this.#cnf.ms.entity.customOrder + "/metadata/attributes/8a854e1b-3c52-11ea-0a80-065100094f1e",
                    type: "attributemetadata",
                    mediaType: "application/json",
                },
                //'id' => '8a854e1b-3c52-11ea-0a80-065100094f1e', // ФИО
                value: fullName
            },
            {
                meta: {
                    href: this.#cnf.ms.url + '/' + this.#cnf.ms.entity.customOrder +"/metadata/attributes/8a85522a-3c52-11ea-0a80-065100094f1f",
                    type: "attributemetadata",
                    mediaType: "application/json",
                },
                //'id' => '8a85522a-3c52-11ea-0a80-065100094f1f', // телефон
                value: parseInt(phone)
            },
            {
                meta: {
                    href: this.#cnf.ms.url + '/' + this.#cnf.ms.entity.customOrder +"/metadata/attributes/8a855341-3c52-11ea-0a80-065100094f20",
                    type: "attributemetadata",
                    mediaType: "application/json",
                },
                //'id' => '8a855341-3c52-11ea-0a80-065100094f20', // email
                value: email
            },
            {
                meta: {
                    href: this.#cnf.ms.url + '/' + this.#cnf.ms.entity.customOrder +"/metadata/attributes/b7711371-3c52-11ea-0a80-005200099a73",
                    type: "attributemetadata",
                    mediaType: "application/json",
                },
                //'id' => 'b7711371-3c52-11ea-0a80-005200099a73', // адрес
                value: address
            },
            {
                meta: {
                    href: this.#cnf.ms.url + '/' + this.#cnf.ms.entity.customOrder +"/metadata/attributes/d225ecd1-efaa-11ea-0a80-021200165c4e",
                    type: "attributemetadata",
                    mediaType: "application/json",
                },
                //'id' => 'd225ecd1-efaa-11ea-0a80-021200165c4e', // Ответственный менеждер
                value: managerName
            },
            {
                meta: {
                    href: this.#cnf.ms.url + '/' + this.#cnf.ms.entity.customOrder +"/metadata/attributes/6406d645-188c-11eb-0a80-012800016b57",
                    type: "attributemetadata",
                    mediaType: "application/json",
                },
                //'id' => '6406d645-188c-11eb-0a80-012800016b57', // Дата оплаты заказа
                value: paymentDate
            },
        ]
    }

    async getProductMeta (code) {
        let response = await this.#ms.GET('entity/product', { filter: { code } })
        let meta

        if(response) {
            if(response?.rows && response.rows[0]) {
                meta = response.rows[0].meta
            }
        }

        return meta
    }

    getClientFullName(data) {
        let name = null,
            lastName = null,
            secondName = null,
            fullname = ''

        if (!data) {
            return ''
        }
        name = data.NAME
        lastName = data.LAST_NAME
        secondName = data.SECOND_NAME

        fullname += name ? name.trim() : ''
        fullname += lastName ? ' ' + lastName.trim() : ''
        fullname += secondName ? ' ' + secondName.trim() : ''

        return fullname
    }
    async getAddress (data , id, managedID) {
        let address = null,
            country = null,
            city = null,
            fulladdress = ''

        if (!data) {
            return ''
        }

        let addressList = await this.#bx.getAddress({ "ANCHOR_ID": data.ID });

        address = data.ADDRESS
        if (!address) {
            address = data.ADDRESS_2

            if (!address) {
                if(addressList[0]) {
                    address = '';
                    if(addressList[0]?.ADDRESS_1){
                        address += addressList[0].ADDRESS_1
                    }
                    if(addressList[0]?.ADDRESS_2){
                        address += ',' + addressList[0].ADDRESS_2
                    }
                }
                else {
                    await this.#bx.addCrmTimeline({
                        "ENTITY_ID": id,
                        "ENTITY_TYPE": "deal",
                        "COMMENT": "Не указан адрес у контакта. Ид контакта = " + data.ID
                    })
                    throw new Error('Не указан адрес у контакта. Ид контакта = ' + data.ID)
                }
            }
        }

        if (!data.ADDRESS_COUNTRY) {
            if(addressList[0]) {
                if(addressList[0]?.COUNTRY){
                    country = addressList[0].COUNTRY
                }
            }
            else {
                await this.#bx.addCrmTimeline({
                    "ENTITY_ID": id,
                    "ENTITY_TYPE": "deal",
                    "COMMENT": "Не указана страна у контакта. Ид контакта = " + data.ID
                })
                throw new Error('Не указана страна у контакта. Ид контакта = ' + data.ID)
            }
        }
        else {
            country = data.ADDRESS_COUNTRY
        }

        if (!data.ADDRESS_CITY) {
            if(addressList[0]) {
                if(addressList[0]?.CITY){
                    city = addressList[0].CITY
                }
            }
            else {
                await this.#bx.imNotify(managedID, "Не указан город у контакта. <a href='/crm/deal/details/" + id +"/'>Лид </a>")
                await this.#bx.addCrmTimeline({
                    "ENTITY_ID": id,
                    "ENTITY_TYPE": "deal",
                    "COMMENT": "Не указан город у контакта. Ид контакта = " + data.ID
                })
                throw new Error('Не указан город у контакта. Ид контакта = ' + data.ID)
            }
        }
        else {
            city = data.ADDRESS_CITY
        }

        fulladdress += country ? country.trim() : ''
        fulladdress += city ? ', ' + city.trim() : ''
        fulladdress += address ? ', ' + address.trim() : ''

        return fulladdress
    }
    async getPhone (data, id, managedID)  {
        let phone = null

        if (!data) {
            return ''
        }

        if (data.HAS_PHONE && data.HAS_PHONE === 'Y') {
            phone = data.PHONE[0].VALUE.replace('+7', '7')

            if (!phone) {
                await this.#bx.imNotify(managedID, "Не указан номер телефона у контакта. <a href='/crm/deal/details/" + id +"/'>Лид </a>")
                await this.#bx.addCrmTimeline({
                    "ENTITY_ID": id,
                    "ENTITY_TYPE": "deal",
                    "COMMENT": "Не указан номер телефона у контакта. Ид контакта = " + data.ID
                })
                throw new Error('Не указан номер телефона у контакта. Ид контакта = ' + data.ID)
            }
        }

        return phone
    }
    async getEmail (data, id, managedID) {
        let email = null

        if (!data) {
            return ''
        }

        if (data.HAS_EMAIL && data.HAS_EMAIL === 'Y') {
            email = data.EMAIL[0].VALUE

            if (!email) {
                await this.#bx.imNotify(managedID, "Не указан емаил у контакта. <a href='/crm/deal/details/" + id +"/'>Лид </a>")
                await this.#bx.addCrmTimeline({
                    "ENTITY_ID": id,
                    "ENTITY_TYPE": "deal",
                    "COMMENT": "Не указан емаил у контакта. Ид контакта = " + data.ID
                })
                throw new Error('Не указан емаил у контакта. Ид контакта = ' + data.ID)
            }
        }

        return email
    }
    async getDeliveryName (data, id, managedID) {
        let delivery = null

        if (!data) {
            return ''
        }

        if (data[cnf.crm.fields.delivery_id]) {
            delivery = cnf.crm.deliveries_id[data[cnf.crm.fields.delivery_id]]

            if (!delivery) {
                await this.#bx.imNotify(managedID, "Не найден указанный способ доставки у сделки. <a href='/crm/deal/details/" + id +"/'>Лид </a>")
                await this.#bx.addCrmTimeline({
                    "ENTITY_ID": id,
                    "ENTITY_TYPE": "deal",
                    "COMMENT": "Не найден указанный способ доставки у сделки. Ид контакта = " + data.ID
                })

                throw new Error('Не найден указанный способ доставки у сделки. Ид сделки = ' + data.ID)
            }
        }
        else {
            await this.#bx.imNotify(managedID, "Не указан способ доставки у сделки. <a href='/crm/deal/details/" + id +"/'>Лид </a>")
            await this.#bx.addCrmTimeline({
                "ENTITY_ID": id,
                "ENTITY_TYPE": "deal",
                "COMMENT": "Не указан способ доставки у сделки. Ид контакта = " + data.ID
            })
            throw new Error('Не указан способ доставки у сделки. Ид сделки = ' + data.ID)
        }

        return delivery
    }
    getDealTotal (data) {
        if (!data) {
            return ''
        }

        //if (!data.OPPORTUNITY) {
        //    throw new Error('Не указан способ доставки у сделки. Ид сделки = ' + data.ID)
        //}

        return data.OPPORTUNITY
    }
    getDealComments (data) {
        if (!data) {
            return ''
        }

        //if (!data.COMMENTS) {
        //    throw new Error('Не указан комментарий у сделки. Ид сделки = ' + data.ID)
        //}

        return data.COMMENTS
    }
    getTrackNumber (data) {
        let trackNumber = null

        if (!data) {
            return ''
        }

        if (!data[cnf.crm.fields.track_number]) {
            trackNumber = data[cnf.crm.fields.track_number]

            //if(!trackNumber) {
            //    throw new Error('Не указан трек-номер у сделки. Ид сделки = ' + data.ID)
            //}
        }

        return trackNumber
    }
    async getOrderName (data) {
        let order_number = null

        if (!data) {
            return ''
        }
        //if (data[this.#cnf.crm.fields.order_number]) {
            //order_number = data[this.#cnf.crm.fields.order_number]

            //if(!order_number) {
                order_number = 'CRM_'.data
            //}
            //if(!trackNumber) {
            //    throw new Error('Не указан трек-номер у сделки. Ид сделки = ' + data.ID)
            //}
        //}
        //else {
        //    order_number = data['TITLE']
        //}

        return order_number
    }
    async getFullnameManager (data, id, managedID) {
        let name = null,
            lastName = null,
            secondName = null,
            fullname = ''

        if (!data) {
            await this.#bx.imNotify(managedID, "Не удалось получить данные менеджера. <a href='/crm/deal/details/" + id +"/'>Лид </a>")
            await this.#bx.addCrmTimeline({
                "ENTITY_ID": id,
                "ENTITY_TYPE": "deal",
                "COMMENT": "Не удалось получить данные менеджера. ИД менеджера = " + data.ID
            })
            throw new Error('Не удалось получить данные менеджера. ИД менеджера = ' + data.ID)
        }

        name = data.NAME
        lastName = data.LAST_NAME
        secondName = data.SECOND_NAME

        fullname += name ? name : ''
        fullname += lastName ? ' ' + lastName : ''
        fullname += secondName ? ' ' + secondName : ''

        return fullname
    }
    formatOrderDate () {
        const dateNow = new Date().toLocaleString("ru-RU", {timeZone: "Europe/Moscow"})
        const fullDateSplit = dateNow.split(', ') //Y-m-d H:i:s
        const splitDate = fullDateSplit[0].split('.') // [0 => 'd', 1 => 'm', 2 => 'y']
        const splitTime = fullDateSplit[1].split(':') // [0 => 'H', 1 => 'i', 2 => 's']

        return splitDate[2] + '-' + splitDate[1] + '-' + splitDate[0] + ' ' + splitTime[0] + ':' + splitTime[1] + ':' + splitTime[2]
    }

    async getLaraOrderOld(id) {
        const response = await fetch('https://app.taroirena.ru/get-old-order');
        const data = await response.json();
        console.log(data);
    }
    async getLaraOrderAll() {
        const response = await fetch('https://app.taroirena.ru/moisklad-test');
        return await response.json();
    }
};