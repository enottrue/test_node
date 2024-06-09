const Main = require('./Controllers/ElasticSearch.js');
const Index = require('koa-router');
const router = new Index({
    prefix: '/elasticsearch'
});

router.get("/", Main.index);
router.post("/", Main.index);

module.exports = router;