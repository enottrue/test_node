const Main = require('./Controllers/Main');
const Index = require('koa-router');
const middleware = require('./middleware');
const router = new Index({
    prefix: '/google-studio'
});


router.use('/', middleware.checkTokenFile.bind(middleware));

router.post("/get-data", Main.getData);
router.post("/get-schema", Main.getSchema);

module.exports = router;