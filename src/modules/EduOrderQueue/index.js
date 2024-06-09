const Main = require('./Controllers/Main');
const middleware = require('./middleware');
const Index = require('koa-router');

const router = new Index({
    prefix: '/edu_order_queue'
});

router.use('/', middleware.checkTokenFile.bind(middleware));
router.use('/', middleware.getBXDataLead.bind(middleware));
router.use('/', middleware.checkGroup);
router.post("/", Main.index);

module.exports = router;