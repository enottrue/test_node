const Main = require('./Controllers/Main');
const Index = require('koa-router');

const router = new Index({
    prefix: '/mc'
});

router.post("/create-order", Main.createOrder);
router.post("/change-ship", Main.changeOnShip);
router.post("/change-shipped", Main.changeOnShipped);
router.post("/custom-add-db", Main.customAddIdDB);
router.post("/test", Main.test);
//router.post("/get-all-orders", Main.getAllOrders);

module.exports = router;