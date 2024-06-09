const Payment = require(global.constant.DIR_MODULES + 'Acquire/Models/Payment');

module.exports = {
    index: async (ctx, next) => {
        return await ctx.render('/Graph/index', {
            nameCompany: 'Graph'
        })
    }, 

    getData: async (ctx, next) => {
        return ctx.body = await Payment.getDataByPeriod(ctx.request.query.token, ctx.request.body.start, ctx.request.body.end);
    }
};