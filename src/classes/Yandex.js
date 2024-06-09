const rp = require('request-promise');
const fs = require('fs');
const Helpers = require(global.constant.DIR_HELPERS + '/common');

module.exports = class Yandex {
    #token;

    constructor(token) {
        this.#token = token;
    }

    async sendEvent(counter, data, tokenService) {
        let filePath = global.constant.DIR_PUBLIC + tokenService + '/offline_conversion/' + 'yandex.csv';

        if (! await Helpers.writeJsonInCSV(filePath, data)) return;

        let file = await new Promise((resolve) => {
            setTimeout(async () => {
                resolve(await fs.createReadStream(filePath));
            }, 1000);
        });

        return await new Promise((response) => {
            let option = {
                method: 'POST',
                uri: "https://api-metrika.yandex.ru/management/v1/counter/" + counter + "/offline_conversions/upload?client_id_type=CLIENT_ID",
                formData: {
                    file: {
                        value: file,
                        options: {
                            name: 'file',
                            filename: 'data.csv',
                            contentType: 'text/csv'
                        }
                    }
                },
                insecure: true,
                headers: {
                    'Content-Type': "multipart/form-data",
                    'Authorization': "OAuth " + this.#token,
                }
            };

            rp(option).then((res) => {
                response(JSON.parse(res));
                fs.unlinkSync(filePath);
            }).catch((error) => {
                response(error);
            });
        });
    }

    async testConnect(counter) {
        return await new Promise((response) => {
            let option = {
                method: 'GET',
                uri: "https://api-metrika.yandex.ru/management/v1/counter/" + counter + "/offline_conversions/visit_join_threshold",
                headers: {
                    'Content-Type': "multipart/form-data",
                    'Authorization': "OAuth " + this.#token,
                }
            };

            rp(option).then((res) => {
                response(res);
            }).catch((error) => {
                response(error);
            });
        });
    }

};