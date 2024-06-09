const Main = require('./Controllers/Main');
const middleware = require('./middleware');
const Index = require('koa-router');
const router = new Index({
    prefix: '/graph'
});

router.use(['/', '/getData'], middleware.checkTokenFile.bind(middleware));

router.get("/", Main.index);
router.post("/getData", Main.getData);

module.exports = router;