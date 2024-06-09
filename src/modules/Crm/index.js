const Main = require('./Controllers/Main');
const Index = require('koa-router');

const router = new Index({
    prefix: '/crm'
});

router.post("/lead-convert", Main.leadConvert);
router.post("/bill-payment", Main.billPayment);
router.post("/lead/stage/4", Main.addressIsSet);

module.exports = router;