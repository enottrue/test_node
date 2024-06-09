const Middleware = require(global.constant.DIR_CLASSES + '/Middleware');
const middleware = new Middleware(require('./Models/Setting'));

module.exports = middleware;