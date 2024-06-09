const jsSHA = require("jssha");
const BX = require('./BX');

const widgetDataPermissions = require('../modules/Acquire/widgetPermissionsConfig.json')

module.exports = class Middleware {
    #model = {};
    #cnf = {};

    constructor(obj, conf = false) {
        if (!conf) this.#model = obj;
        else this.#cnf = obj;
    }

    async widgetDataTokenBase(ctx, next) {
        if (ctx.request.query.token === undefined || !widgetDataPermissions[ctx.request.query.token]) {
            return ctx.body = 'Unauthorized token';
        } else {
            if (widgetDataPermissions[ctx.request.query.token]?.id) {
                ctx.request.body.widgetUserName = widgetDataPermissions[ctx.request.query.token]?.name
            }
            await next();
        }
    }

    async checkTokenBase(ctx, next) {
        if (ctx.request.query.token === undefined) {
            return ctx.body = 'Undefined token';
        } else {
            let hashObj = new jsSHA("SHA-256", "TEXT", 1);
            hashObj.update(ctx.request.query.token);
            let tokenHash = hashObj.getHash("HEX");

            let setting = await this.#model.findOne({
                where: { token: tokenHash }
            });

            if (!setting) {
                setting = await this.#model.create({
                    'token': tokenHash
                });
            }
            ctx.request.body.settings_id = setting.dataValues.id;

            await next();
        }
    }

    async checkTokenFile(ctx, next) {
        if (ctx.request.query.payment_reference) {
            await next();
        }
        else {
            if (ctx.request.query.token === undefined) {
                return ctx.body = 'Undefined token';
            } else {
                if (this.#cnf[ctx.request.query.token] === undefined)
                    return ctx.body = 'invalid token';

                ctx.cnf = this.#cnf[ctx.request.query.token];
                await next();
            }
        }
    }

    async getBXDataLead(ctx, next) {
        let webhook = '';
        if (Object.keys(this.#model).length > 0) {
            let setting = await this.#model.findByPk(ctx.request.body.settings_id);
            webhook = setting.dataValues.webhook;
        } else {
            webhook = this.#cnf[ctx.request.query.token].bitrixWebhook
        }

        let bx = new BX(webhook);
        let type, id;
        if (ctx.request.body?.document_id) {
            let [tmpType, tmpId] = ctx.request.body.document_id[2].split('_');
            type = tmpType;
            id = tmpId;
        } else {
            id = ctx.request.query.ID;
            type = ctx.request.query.TYPE;
        }

        if (!type || !id)
            throw new Error(`undefind type - ${type} or id - ${id}`);

        if (type == 'LEAD' && parseInt(id) > 0) {
            let lead = await bx.getLead(id);
            let products = await bx.getLeadProduct(id);

            let contact;
            if (lead.CONTACT_ID)
                contact = await bx.getContact(lead.CONTACT_ID);

            ctx.bitrix = { lead, contact, products, bx };

            await next();
        } else {
            return ctx.body = {
                status: 'error deal'
            };
        }
    }

    async getBXDataInvoice(ctx, next) {
        let webhook = '';
        if (Object.keys(this.#model).length > 0) {
            let setting = await this.#model.findByPk(ctx.request.body.settings_id);
            webhook = setting.dataValues.webhook;
        } else {
            webhook = this.#cnf.bitrixWebhook
        }
        let bx = new BX(webhook);
        let type, entityTypeId, invoiceid;

            type = ctx.request.query.TYPE;
            entityTypeId = ctx.request.query.ENTITYTYPEID;
            invoiceid = ctx.request.query.INVOICEID;

        if (!type || !entityTypeId  || !invoiceid ) 
        throw new Error(`undefind type - ${type} or entityTypeId - ${entityTypeId} or invoiceid - ${invoiceid}`);

        if (type == 'INVOICE' && parseInt(invoiceid) > 0) {
            let uppercaseProductRows = await bx.getInvoiceProduct(invoiceid);
            let invoice = await bx.getInvoice(invoiceid,entityTypeId);

        const products = uppercaseProductRows.productRows.map(row => {
            const newRow = {};
            for (const key in row) {
              newRow[key.toUpperCase()] = row[key];
            }
            return newRow;
          });
            let contact = await bx.getContact(invoice.item.contactIds[0]);
            ctx.bitrix = { invoice, contact, products, bx };
            await next();
        } else {
            return ctx.body = {
                status: 'error invoice'
            };
        }
    }

    async getBXDataDeal(ctx, next) {
        let webhook = '';
        if (Object.keys(this.#model).length > 0) {
            let setting = await this.#model.findByPk(ctx.request.body.settings_id);
            webhook = setting.dataValues.webhook;
        } else {
            webhook = this.#cnf.bitrixWebhook
        }

        let bx = new BX(webhook);
        let type, id;
        if (ctx.request.body?.document_id) {
            let [tmpType, tmpId] = ctx.request.body.document_id[2].split('_');
            type = tmpType;
            id = tmpId;
        } else {
            id = ctx.request.query.ID;
            type = ctx.request.query.TYPE;
        }

        if (!type || !id)
            throw new Error(`undefind type - ${type} or id - ${id}`);

        if (type == 'DEAL' && parseInt(id) > 0) {
            let deal = await bx.getDeal(id);
            let contact = await bx.getContact(deal.CONTACT_ID);
            let products = await bx.getDealProduct(id);

            ctx.bitrix = { deal, contact, products, bx };

            await next();
        } else {
            return ctx.body = {
                status: 'error deal'
            };
        }
    }

}