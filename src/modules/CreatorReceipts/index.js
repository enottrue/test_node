const Main = require('./Controllers/Main');
const middleware = require('./middleware');
const Index = require('koa-router');

const router = new Index({
    prefix: '/creator_receipts'
});

router.use('/', middleware.checkTokenBase.bind(middleware));

router.all("/", Main.index);
router.post("/getPage", Main.getPage);
router.post("/generate", Main.generate);

module.exports = router;