process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 1;
const tg = require('node-telegram-bot-api');
const fs = require('fs');
const Helper = require(global.constant.DIR_HELPERS + 'common');

module.exports = class Telegram {
    constructor(token) {
        this.token = token;
        this.bot = new tg(this.token);
    }

    async sendMsg(id, msg) {
        if (!msg) {
            msg = 'msg was not defined. classes/Telegram.js'
        }
        try {
            let response = await this.bot.sendMessage(id, msg);
            return response.message_id !== undefined;
        } catch (e) {
            // await this.bot.sendMessage(`TelegramBot: can't send notification to the chat with ID: ${id}, msg: ${e?.response?.body?.description}`);
            console.log('Error!!', this.token, e)
            throw new Error(`TelegramBot:\n\rID: ${id}\n\rmsg: ${e.response?.body?.description}`);
        }

    }

    async sendMsgWithFileData(id, msg, data = {}) {
        try {
            let response;
            if (Object.keys(data).length) {

                let fileName = global.constant.DIR_PUBLIC + 'logs/' + Date.now() + '.json';
                Helper.createPath(fileName);
                fs.writeFileSync(fileName, JSON.stringify(data));

                response = await this.bot.sendDocument(id, fileName, { caption: msg }, { contentType: 'application/json' })
            } else {
                response = await this.bot.sendMessage(id, msg);
            }
            return response.message_id !== undefined;
        } catch (e) {
            // console.log(e)
            if (e?.response?.body?.description) {
                throw new Error(`TelegramBot:\n\rID: ${id}\n\rmsg: ${e?.response?.body?.description}`);
            }
            else {
                console.log(`TelegramBot:\n\rID: ${id}\n\rmsg: ${e}`);
            }

        }

    }
};