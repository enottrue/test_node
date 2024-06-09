const stripHtml = require("string-strip-html");
const BX = require(global.constant.DIR_CLASSES + '/BX');
const PDF = require(global.constant.DIR_CLASSES + '/PDF');
const common = require(global.constant.DIR_HELPERS + 'common');
const Setting = require('../Models/Setting');
const OHash = require('object-hash');

module.exports = {
    index: async (ctx, next) => {
        let setting = await Setting.findByPk(ctx.request.body.settings_id);
        let bx = new BX(setting.dataValues.webhook);

        let dealsInfo = await bx.getDealList({},[ "ID", "DATE_CREATE", "TITLE", setting.dataValues.field_is_print, setting.dataValues.field_date_payment ]);
        let totalPages = parseInt((dealsInfo.total / 50) + (dealsInfo.total%50?1:0));
        let deals = dealsInfo.result;

        return await ctx.render('/CreatorReceipts/index', {
            name: 'Creator receipts',
            deals: deals,
            activePage: 1,
            setting: setting.dataValues,
            totalPage: totalPages
        })
    },

    generate: async (ctx, next) => {
        let setting = await Setting.findByPk(ctx.request.body.settings_id);
        let bx = new BX(setting.dataValues.webhook);
        let selectsField = [
            "ID", "DATE_CREATE", "TITLE", "COMMENTS", "CONTACT_ID",
            setting.dataValues.field_is_print,
            setting.dataValues.field_date_payment,
            setting.dataValues.field_delivery_type
        ];
        let dealsInfo = await bx.getDealList({"ID" : ctx.request.body.dealIds}, selectsField);

        if ( dealsInfo.result.length == 0 )
            return ctx.body = {
                'status': 'error',
                'message': 'empty Deals'
            };

        let deals = [];
        let customFileds = require('../config/custum_field');

        for (let deal of dealsInfo.result) {
            let contact = await bx.getContact(deal.CONTACT_ID);
            let data = {
                title: deal.TITLE,
                dateCreate: deal.DATE_CREATE,
                datePayment: deal[setting.dataValues.field_date_payment],
                fio: contact.NAME + ' ' + contact.SECOND_NAME + ' ' + contact.LAST_NAME,
                products: [],
                delivery: {
                    name: customFileds[setting.dataValues.field_delivery_type][deal[setting.dataValues.field_delivery_type]],
                    price: 0
                },
                comment: deal.COMMENTS ? stripHtml(deal.COMMENTS).result : ''
            };

            let products = await bx.getDealProduct(deal.ID);

            for (let product of products) {
                data.products.push({
                    name: product.PRODUCT_NAME,
                    count: product.QUANTITY
                });
            }

            let updateData = {};
            updateData[setting.dataValues.field_is_print] = 'Y';
            await bx.updateDeal(deal.ID, updateData);


            deals.push(data);
        }

        let pdf = new PDF(setting.dataValues.token, {fileName: OHash(deals), deals: deals}, require('../config/pdf'), __dirname + '/../meta/fonts/arial');
        ctx.body = {
            'status': 'success',
            'url': pdf.getUrlFile()
        };

    },
    getPage: async (ctx, next) => {
        let setting = await Setting.findByPk(ctx.request.body.settings_id);
        let bx = new BX(setting.dataValues.webhook);
        let page = ctx.request.body.page;
        let filter = {};

        if (ctx.request.body.filter['dateCreate']['from'])
            filter['>DATE_CREATE'] = common.convertDate(ctx.request.body.filter['dateCreate']['from']);

        if (ctx.request.body.filter['dateCreate']['to'])
            filter['<DATE_CREATE'] = common.convertDate(ctx.request.body.filter['dateCreate']['to'], (date) => new Date(date.setDate(date.getDate() + 1)));

        if (ctx.request.body.filter['datePayment']['from'])
            filter['>' + setting.dataValues.field_date_payment] = common.convertDate(ctx.request.body.filter['datePayment']['from'], (date) => new Date(date.setDate(date.getDate() - 1)));

        if (ctx.request.body.filter['datePayment']['to'])
            filter['<' + setting.dataValues.field_date_payment] = common.convertDate(ctx.request.body.filter['datePayment']['to'], (date) => new Date(date.setDate(date.getDate() + 1)));

        filter[setting.dataValues.field_is_print] = (ctx.request.body.filter['isPrint'] == 'true'?1:'N');

        let dealsInfo = await bx.getDealList(filter, [ "ID", "DATE_CREATE", "TITLE", setting.dataValues.field_is_print, setting.dataValues.field_date_payment ], page);

        let totalPages = parseInt((dealsInfo.total / 50) + (dealsInfo.total%50?1:0));
        let deals = dealsInfo.result;

        return await ctx.render('/CreatorReceipts/contents/builder', {
            activePage: page,
            setting: setting.dataValues,
            totalPage: totalPages,
            deals: deals
        });
    }

};