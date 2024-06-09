const Middleware = require(global.constant.DIR_CLASSES + '/Middleware');
const BX = require(global.constant.DIR_CLASSES + '/BX');
const middleware = new Middleware(require('./config.json'), true);

middleware.loadBX = async (ctx, next) => {
    ctx.bx = new BX(ctx.cnf.bitrixWebhook);
    if (!ctx.request.body.data.FIELDS.ID)
        return ctx.body = 'invalid data crm';
    
    ctx.bxActivity = await ctx.bx.getActivity(ctx.request.body.data.FIELDS.ID);
    await next();
};

module.exports = middleware;