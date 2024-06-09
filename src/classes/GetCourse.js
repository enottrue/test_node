const rp = require('request-promise');

module.exports = class GetCourse {
    constructor(apiUrl, apiToken) {
        this.api = apiUrl;
        this.apiToken = apiToken;
    }

    async addDeal(data) {
        let buff = Buffer.from(JSON.stringify(data)).toString('base64');
        let queryParams = {
            action: 'add',
            key: this.apiToken,
            params: buff
        }

        //console.log(data);
        //throw new Error(JSON.stringify(data));
        return await this.request('deals', queryParams);
    }

    async request(method, data, onlyResult = false) {
        return await new Promise((response) => {
            let option = {
                method: 'POST',
                uri: this.api + '/' + method,
                form: data,
                //json: true
            };
            rp(option).then((res) => {
                if (onlyResult) response(res.result);
                else response(res);
                //console.log(response(res));
            }).catch((error) => response(error));
        });
    }

};