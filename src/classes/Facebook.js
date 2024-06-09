const rp = require('request-promise');

module.exports = class Facebook {
    constructor() { }

    static async createEvent(act_id, marker, name) {
        return await new Promise((response) => {
            let option = {
                method: 'POST',
                uri: 'https://graph.facebook.com/' + act_id + '/offline_conversion_data_sets',
                body: {
                    access_token: marker,
                    name: name,
                },
                json: true
            };
            rp(option).then((res) => {
                response(res.id);
            }).catch((error) => {
                response('error');
            });
        });
    }

    static async sendEvent(marker, eventId, data) {
        return await new Promise((response) => {
            let option = {
                method: 'POST',
                uri: 'https://graph.facebook.com/v15.0/' + eventId + '/events',
                body: {
                    access_token: marker,
                    upload_tag: 'store_data',
                    data: data
                },
                json: true
            };
            rp(option).then((res) => {
                response({ status: true, res });
            }).catch((error) => {
                response({ status: false, error });
            });
        });
    }
};