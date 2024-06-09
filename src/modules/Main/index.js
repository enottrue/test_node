const Main = require('./Controllers/Main');
const Index = require('koa-router');
const router = new Index({
    prefix: ''
});

router.get("/", Main.index);
router.get("/test", Main.test);

module.exports = router;