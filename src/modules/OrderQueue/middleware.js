const Middleware = require(global.constant.DIR_CLASSES + '/Middleware');

const middleware = new Middleware(require('./config.json') , true);

middleware.checkGroup = async (ctx, next) => {
    if (ctx.request.query.group === undefined) {
        return ctx.body = 'Undefined group';
    } else {
        ctx.groupId = ctx.request.query.group;

        await next();
    }
};

module.exports = middleware;