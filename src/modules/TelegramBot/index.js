const Main = require('./Controllers/Main');
const middleware = require('./middleware');
const Index = require('koa-router');

const router = new Index({
    prefix: '/tg_bot'
});

router.use('/', middleware.checkTokenFile.bind(middleware));
router.use('/', middleware.loadBX);

router.post("/addTask", Main.addTask);
router.post("/doneTask", Main.doneTask);


module.exports = router;