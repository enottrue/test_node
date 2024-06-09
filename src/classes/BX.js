const rp = require('request-promise');
const cnf = require("../modules/Crm/config.json");

module.exports = class BX {
    constructor(webhook) {
        this.webhook = webhook;
    }

    async getContact(id) {
        return await this.request('crm.contact.get', { id: id });
    }
    async addContact (contactData) {
        let data = {
            fields: contactData,
            params: {
                REGISTER_SONET_EVENT: 'Y'
            }
        }
        return await this.request('crm.contact.add', data);
    }

    async getLead(id) {
        return await this.request('crm.lead.get', { id: id });
    }
    async getLeadProduct(id) {
        return await this.request('crm.lead.productrows.get', { ID: id });
    }
    async addLead (leadData) {
        let data = {
            fields: leadData,
            params: {
                REGISTER_SONET_EVENT: 'Y'
            }
        }
        return await this.request('crm.lead.add.json', data);
    }
    async updateLead(id, data) {
        return await this.request('crm.lead.update', { id: id, fields: data, params: { "REGISTER_SONET_EVENT": "Y" } });
    }

    async getDeal(id) {
        return await this.request('crm.deal.get', { id: id });
    }
    async getDealUF(id) {
        return this.request('crm.deal.userfield.get', { id: id });
    }
    async getDealList(filter, select, page = 1) {
        return await this.request('crm.deal.list', {
            order: { "ID": "DESC" },
            filter: filter,
            select: select,
            start: ((!page ? 1 : page) - 1) * 50,
        }, false);
    }


    async getContactByEmailAndPhone(email, phone) {
        const resultByPhone = await this.request('crm.contact.list', {
            filter: { 'PHONE': phone },
            select: ['ID']
        });
    
        if (resultByPhone.length > 0) {
            console.log('найден по телефону', phone);
            return resultByPhone[0].ID;
        } else {
            console.log('не найден по телефону', phone);
    
            const resultByEmail = await this.request('crm.contact.list', {
                filter: { 'EMAIL': email },
                select: ['ID']
            });
    
            if (resultByEmail.length > 0) {
                return resultByEmail[0].ID;
            } else {
                return null;
            }
        }
    }
    
    async getDealListByEmailAndFunnelId(email,status, phone, funnelId, amount, startDate, endDate, page = 1) {
        const contactId = await this.getContactByEmailAndPhone(email, phone);
        if (!contactId) {
            return [];
        }
    
        const filter = {
            'CONTACT_ID': contactId,
            'CATEGORY_ID': funnelId,
            'OPPORTUNITY': amount, // Сумма сделки
            ">DATE_CREATE": startDate,
            "<DATE_CREATE": endDate
        };
        
        const select = ['ID', 'TITLE', 'DATE_CREATE']; // Выбранные поля
    
        const deals = await this.request('crm.deal.list', {
            filter: filter,
            select: select,
            start: ((!page ? 1 : page) - 1) * 50,
        }, false);

        let stageid;
        switch (status) {
            case '590': //подписание документов
                stageid = 'C3:PREPARATION';
                break;    
            case '592': //Рассрочка не одобрена
                stageid = 'C3:PREPAYMENT_INVOICE';
                break;
            case '593': //Договор подписан
                stageid = 'C3:4';
                break;
                default:
        }

        const dealIds = deals.result.map(deal => deal.ID);
        await this.updateDeal(dealIds[0], { UF_CRM_1716283687451: status, STAGE_ID: stageid});

        return deals;
    }

    async getDealProduct(id) {
        return await this.request('crm.deal.productrows.get', { ID: id });
    }
    async getInvoiceProduct(id) {
        return await this.request('crm.item.productrow.list', {
            "filter": {
                "=ownerType": "SI",
                "=ownerId": id
            }
        });
    }
    async getInvoice(id,entityTypeId) {
        return await this.request('crm.item.get', { id: id, entityTypeId: entityTypeId });
    }
    async setDealProduct(id, rows) {
        return await this.request('crm.deal.productrows.set', { ID: id, rows: rows });
    }
    async addDeal (dealData) {
        let data = {
            fields: dealData,
            params: {
                REGISTER_SONET_EVENT: 'Y'
            }
        }
        return await this.request('crm.deal.add', data);
    }
    async updateDeal(id, data) {
        return await this.request('crm.deal.update', { id: id, fields: data });
    }

    async updateInvoice(id, entityTypeId, data) {
       return await this.request('crm.item.update', { id: id, entityTypeId: entityTypeId, fields: data });
    }

    async imNotify(userId, text) {
        /*let data = {
            to: userId,
            text: text,
            type: "SYSTEM"
        };*/
        let data = {
            USER_ID: userId,
            MESSAGE: text,
            //type: "SYSTEM"
        };
        //return await this.request('im.notify', data);
        return await this.request('im.notify.system.add', data);
    }

    async duplicateSearch(data) {
        return await this.request('crm.duplicate.findbycomm', data);
    }
    async getDepartment(id) {
        return await this.request('department.get', { ID: id });
    }

    async getUsers(filter) {
        return await this.request('user.get', filter);
    }

    async getListByDate(type, start, end, limit = 500) {
        let res = []
        let response = [];
        do {
            response =  await this.request(`crm.${type}.list`, {
                select: ['*', 'UF_*'],
                filter: { ">DATE_CREATE": start, "<DATE_CREATE": end },
                start: response.next
            }, false);
            
            res = res.concat(response.result);

            if(res.length >= limit) break;
        } while(response.total > res.length);
        
        return res;
    }

    async getListAll(type, limit = 500) {
        let res = []
        let response = [];
        do {
            response =  await this.request(`crm.${type}.list`, {
                select: ['*', 'UF_*'],
                start: response.next
            }, false);
            
            res = res.concat(response.result);

            if(res.length >= limit) break;
        } while(response.total > res.length);
        
        return res;
    }

    async getFields(type) {
        return await this.request(`crm.${type}.fields`);
    }

    async getActivity(id) {
        return await this.request('crm.activity.get', { id: id });
    }

    async getCatalogProduct(id) {
        return await this.request('crm.catalog.get', { ID: id });
    }

    async getCatalogProductData(id) {
        return await this.request('catalog.product.get', { id: id });
    }


    async getProductData(id) {
        return await this.request('catalog.product.list', {
            'select': ['id', 'iblockId', 'name', 'quantity', 'xmlId'],
            'filter':{
                id: id,
            }
        });
    }


    async getInvoiceById(id) {
        return this.request('crm.invoice.list', { "filter": { "ID": id } });
    }

    async getInvoiceByDealId(id) {
        return this.request('crm.invoice.list', { "filter": { "UF_DEAL_ID": id } });
    }

    async getInvoices(filter, select, page = 1) {
        return this.request('crm.invoice.list', {
            order: { "DATE_INSERT": "ASC" },
            filter: filter,
            select: select,
            start: ((!page ? 1 : page) - 1) * 50,
        }, false);
    }
    async updateInvoices(id, data) {
        return this.request('crm.invoice.update', { id: id, fields: data });
    }

    async getRequisite(filter) {
        return this.request('crm.requisite.list', { filter });
    }
    async addRequisite(data) {
        return this.request('crm.requisite.add', data);
    }
    async getCompany(id) {
        return this.request('crm.company.get', { id: id });
    }

    async getAddress(filter) {
        return this.request('crm.address.list', {
            filter,
            //select: ["TYPE_ID", "ADDRESS_1", "ADDRESS_2"]
        });
    }
    async addAddress(data) {
        return this.request('crm.address.add', data);
    }
    async updateAddress(data) {
        return this.request('crm.address.update', data);
    }

    /*fields:
    {
        "ENTITY_ID": 10,
        "ENTITY_TYPE": "deal",
        "COMMENT": "New comment was added"
    }*/
    async addCrmTimeline(data) {
        return this.request('crm.timeline.comment.add', { fields: data }, false);
    }

    async getBXDeal(id) {
        const bx = new BX(this.webhook);

        const deal = await bx.getDeal(id);
        const contact = await bx.getContact(deal.CONTACT_ID);
        const products = await bx.getDealProduct(id);
        const invoices = await bx.getInvoiceByDealId(id);
        const manager = await bx.getUsers({ 'ID': deal.ASSIGNED_BY_ID });

        return { deal, contact, products, invoices, manager: manager?.[0] };
    }
    async getProductSection (id) {
        let bx = new BX(cnf.bitrixWebhook);
        if(id) {
            const product = await bx.getCatalogProductData(id)

            if(product) {
                if(!product.product.iblockSectionId) {
                    if(product.product.parentId.value && product.product.parentId.value !== id) {
                        const subProduct = await bx.getCatalogProductData(product.product.parentId.value)

                        if(subProduct) {
                            return subProduct.product.iblockSectionId
                        }
                    }
                }
                else {
                    return product.product.iblockSectionId
                }
                //
            }
            else {
                return false
            }
        }
        else {
            return false
        }
    }
    async addressUpdate (contactID, address) {
        let bx = new BX(cnf.bitrixWebhook);
        let reqID = false
        let errorReq = false
        let reqList = await bx.getRequisite({
            order: {'DATE_CREATE': 'ASC'},
            filter: {
                'ENTITY_TYPE_ID': 3,
                'ENTITY_ID': contactID,
            },
            select: { }
        })

        if(reqList) {
            reqList = reqList[0]
            reqID = reqList.ID
        }
        else {
            const addResult = await bx.addRequisite({
                fields: {
                    ENTITY_TYPE_ID: 3,
                    ENTITY_ID: contactID,
                    PRESENT_ID: 1,
                    NAME: 'Реквизит',
                    ACTIVE: 'Y',
                    SORT: 100
                }
            })
            if(reqID){
                reqID = addResult
            }
            else {
                errorReq = true
            }
        }

        address.TYPE_ID = 1
        address.ENTITY_TYPE_ID = 8
        address.ENTITY_ID = reqID

        let updateAddress = await bx.updateAddress({
            fields: address
        })

        if (!updateAddress) {
            await bx.addAddress({
                fields: address
            })
        }
    }

    async request(method, data, onlyResult = true) {

        return await new Promise((response) => {
            let option = {
                method: 'POST',
                uri: this.webhook + '/' + method,
                body: data,
                json: true
            };
            rp(option).then((res) => {
                if (onlyResult) response(res.result);
                else response(res);
            }).catch((error) => response(error));
        });
    }

};