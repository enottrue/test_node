const fs = require('fs');

module.exports = {
    init: () => {
        fs.readdir(global.constant.DIR_MODULES, (err, items) => {
            items.forEach((item) => {
                if (fs.existsSync(global.constant.DIR_MODULES + item + '/cron.js')) {
                    let tempRoute = require(global.constant.DIR_MODULES + item + '/cron.js');
                    tempRoute.init();
                }
            });
        });
    },
};