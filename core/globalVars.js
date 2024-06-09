const path = require('path');

module.exports = {
    PROJECT_ROOT: path.normalize(__dirname + '/../'),
    DIR_MODULES: path.normalize(__dirname + '/../src/modules/'),
    DIR_HELPERS: path.normalize(__dirname + '/../src/helpers/'),
    DIR_VIEWS: path.normalize(__dirname + '/../src/views/'),
    PATH_BASE:   path.normalize(__dirname + '/db'),
    DIR_CLASSES: path.normalize(__dirname + '/../src/classes/'),
    DIR_PUBLIC: path.normalize(__dirname + '/../public/'),
    DIR_CONFIG: path.normalize(__dirname + '/../config/')

};