const fs = require('fs');

module.exports = {
    init: (app) => {
        fs.readdir(global.constant.DIR_MODULES, (err, items) => {
            items.forEach((item) => {
                if (fs.existsSync(global.constant.DIR_MODULES + item + '/index.js')) {
                    let tempRoute = require(global.constant.DIR_MODULES + item + '/index.js');
                    app.use(tempRoute.routes()).use(tempRoute.allowedMethods());
                }
            });
        });
    }
};