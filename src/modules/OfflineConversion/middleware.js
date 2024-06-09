const Facebook = require(global.constant.DIR_CLASSES + '/Facebook');
const Middleware = require(global.constant.DIR_CLASSES + '/Middleware');
const Setting  = require('./Models/Setting');
const middleware = new Middleware(Setting);

middleware.checkEventInBaseFacebook = async (ctx, next) => {
    let setting = await Setting.findByPk(ctx.request.body.settings_id);

    if (setting.dataValues.facebook_act_id &&
        setting.dataValues.facebook_marker &&
        setting.dataValues.facebook_event_name) {
        if (!setting.dataValues.facebook_event_id || setting.dataValues.facebook_event_id == 'error') {
           await setting.update({
                facebook_event_id: await Facebook.createEvent(
                    setting.dataValues.facebook_act_id,
                    setting.dataValues.facebook_marker,
                    setting.dataValues.facebook_event_name)
            },{
               where: { id: setting.dataValues.id }
           });
        }
    }

   next();
};

middleware.typeEvent = async (ctx, next) => {
    if (ctx.request.body?.document_id) {
        let [tmpType, tmpId] = ctx.request.body.document_id[2].split('_');
        type = tmpType;
        id = tmpId;
    } else {
       id = ctx.request.query.ID;
       type = ctx.request.query.TYPE; 
    }
    
    if (!type || !id) 
        throw `undefind type - ${type} or id - ${id}`;

    if (type === 'DEAL') middleware.getBXDataDeal.call(middleware, ctx, next);
    if (type === 'LEAD') middleware.getBXDataLead.call(middleware, ctx, next);  
    if (type === 'INVOICE') middleware.getBXDataInvoice.call(middleware, ctx, next);  

};


module.exports = middleware;