const rp = require('request-promise');

module.exports = class GoogleAnalytics {
    static async sendData(targetId, data, debug = false) {
        return await new Promise((response) => {
            let option = {
                method: 'GET',
                uri: 'https://www.google-analytics.com/' + (debug?'debug/':'') + 'collect?'+
                    'v='    + 1 +
                    '&tid=' + targetId +
                    '&cid=' + data.cid +
                    '&t='   + data.t   +
                    '&ec='  + data.ec  +
                    '&ea='  + data.ea  +
                    '&ev='  + data.ev,
                json: true
            };
            rp(option).then((res) => {
                response(res);
            }).catch((error) => {
                response('error');
            });
        });
    }
};