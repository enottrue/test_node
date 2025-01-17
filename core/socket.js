const fs = require('fs');

module.exports = {
    usersConnect: [],
    init: (io) => {
        fs.readdir(global.constant.DIR_MODULES, (err, items) => {
            items.forEach((item) => {
                if (fs.existsSync(global.constant.DIR_MODULES + item + '/socket.js')) {
                    let tempRoute = require(global.constant.DIR_MODULES + item + '/socket.js');
                    tempRoute.init(io);
                }
            });
        });
    }
};