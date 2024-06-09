const BX = require(global.constant.DIR_CLASSES + '/BX');

module.exports = {
    getData: async (ctx, next) => {
        const typeData = ctx.request.body.typeData;
        const start = ctx.request.body.start;
        const end = ctx.request.body.end;
        if (!typeData || !start || !end) return ctx.body = 'error req';

        const bx = new BX(ctx.cnf.bitrixWebhook);

        let data;
        if (typeData == 'product') data = await bx.getListAll(typeData);
        else data = await bx.getListByDate(typeData, start, end);

        if (typeData === 'deal') {
            const pAll = data.map(async (item, index) => {
                const pData = await (typeData === 'lead' ? bx.getLeadProduct(item.ID) : bx.getDealProduct(item.ID));
                item.PRODUCTS = JSON.stringify(pData.map(pItem => ({ id: pItem.ID, count: pItem.QUANTITY, value: pItem.PRICE })));
                return item;
            });
            const res = await Promise.all(pAll);
            return ctx.body = JSON.stringify(await Promise.all(pAll));
        } else {

            return ctx.body = JSON.stringify(data);
        }
    },

    getSchema: async (ctx, next) => {
        const typeData = ctx.request.body.typeData;
        if (!typeData) return ctx.body = 'error req';

        const bx = new BX(ctx.cnf.bitrixWebhook);

        let shema = await bx.getFields(typeData);
        if ( typeData === 'deal')
            shema.PRODUCTS = true;

        return ctx.body = JSON.stringify(Object.keys(shema));
    }

};