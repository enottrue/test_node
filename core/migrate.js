const fs = require('fs');
global.constant = require('./globalVars');

const args = process.argv.slice(2);

const migrateModule = async (model, data) => {
    await model.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true })
        .then(() => model.sync({ force: args[2] == 'force' }));
    if (args[2] == 'force' && data) {
        data.forEach((res) => {
            if (typeof model.customMigrate == 'function') model.customMigrate(res);
            else model.create(res);
        });
    }
};

if (args[0] == 'all') {
    fs.readdir(global.constant.DIR_MODULES, (err, items) => {
        items.forEach((item) => {
            if (!fs.existsSync(global.constant.DIR_MODULES + item + '/index.js')) return;

            new Promise((res) => {
                let result = [];
                if (args[1] == 'all') {
                    fs.readdir(global.constant.DIR_MODULES + item + '/Models', (err, models) => {
                        if (models === undefined) {
                            res(result);
                            return;
                        }
                        for (let model of models) {
                            let tempModel = require(global.constant.DIR_MODULES + item + '/Models/' + model);

                            let tempData = false;
                            if (fs.existsSync(global.constant.DIR_MODULES + item + '/migrate/' + model.replace('js', 'json')))
                                tempData = require(global.constant.DIR_MODULES + item + '/migrate/' + model.replace('js', 'json'));

                            result.push([tempModel, tempData]);
                        }
                        res(result);
                    });
                } else {
                    if (!fs.existsSync(global.constant.DIR_MODULES + item + '/Models/' + args[1] + '.js')) return;

                    let tempModel = require(global.constant.DIR_MODULES + item + '/Models/' + args[1] + '.js');
                    let tempData = false;
                    if (fs.existsSync(global.constant.DIR_MODULES + item + '/migrate/' + args[1] + '.json'))
                        tempData = require(global.constant.DIR_MODULES + item + '/migrate/' + args[1] + '.json');

                    result.push([tempModel, tempData]);
                    res(result); 
                }
            }).then(migrateData => migrateData.forEach(data => migrateModule(...data)));
        })
    });
} else {

    if (fs.existsSync(global.constant.DIR_MODULES + args[0] + '/index.js')) {
        if (fs.existsSync(global.constant.DIR_MODULES + args[0] + '/Models/' + args[1] + '.js')) {
            let tempModel = require(global.constant.DIR_MODULES + args[0] + '/Models/' + args[1] + '.js');
            let tempData = false;
            if (fs.existsSync(global.constant.DIR_MODULES + args[0] + '/migrate/' + args[1] + '.json'))
                tempData = require(global.constant.DIR_MODULES + args[0] + '/migrate/' + args[1] + '.json');

            migrateModule(...[tempModel, tempData]);
        } else {
            console.log('Model ' + args[1] + ' not found');
        }
    } else {
        console.log('Module ' + args[0] + ' not found');
    }
}