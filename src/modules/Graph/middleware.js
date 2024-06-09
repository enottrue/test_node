const Middleware = require(global.constant.DIR_CLASSES + 'Middleware');

const middleware = new Middleware(require('./config.json') , true);

module.exports = middleware;