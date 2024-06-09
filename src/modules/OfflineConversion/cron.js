const cron = require('node-cron');
const fs = require('fs');
const Setting = require('./Models/Setting');

module.exports = {
    init: async () => {
        cron.schedule('0 0,12 * * *', async () => {
            let setting = await Setting.findAll();
            let filePath;
            for(let value of setting) {
                filePath = global.constant.DIR_PUBLIC + value.dataValues.token + '/' + value.dataValues.google_path_file;

                if( fs.existsSync(filePath) )
                    await fs.unlinkSync(filePath);
            }

        });
    }
};