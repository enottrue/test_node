const Main = require('./Controllers/Main');
const middleware = require('./middleware');
const Index = require('koa-router');

const router = new Index({
    prefix: '/acquire'
});

//router.use('/', middleware.checkTokenFile.bind(middleware));
router.use("/createPayment", middleware.getBXDataDeal.bind(middleware));
router.use("/createPaymentInvoice", middleware.getBXDataInvoice.bind(middleware));
router.use("/createPayKurs", middleware.getBXDataDeal.bind(middleware));
router.use("/addGetCourse", middleware.getBXDataDeal.bind(middleware));
router.use("/setWAfield", middleware.getBXDataDeal.bind(middleware));
router.use("/createAdditionalPayment", middleware.getBXDataDeal.bind(middleware));
router.use("/createAdditionalPaymentCandles", middleware.getBXDataDeal.bind(middleware));
router.use("/perModuleStart", middleware.getBXDataDeal.bind(middleware));
router.use("/permodule-fix-gcourse", middleware.getBXDataDeal.bind(middleware));
router.use("/widget-data", middleware.widgetDataTokenBase.bind(middleware));

router.get("/widget-data", Main.widgetData);

router.post("/getGetcourceData", Main.getGetcourceData);


router.post("/createPayment", Main.createPayment);
router.post("/createPaymentInvoice", Main.createPaymentInvoice);
router.get("/notificationSber", Main.notificationSber);
router.post("/notificationTinkoff", Main.notificationTinkoff);
router.post("/notificationTinkoff2", Main.notificationTinkoff2);
router.post("/notificationTinkoff3", Main.notificationTinkoff3);
router.post("/notificationTinkoff5", Main.notificationTinkoff5);
router.get("/notification-every-pay", Main.notificationEveryPay);
router.get("/notification-every-pay-2", Main.notificationEveryPay2);
router.get("/notification-every-pay-3", Main.notificationEveryPay3);
router.post("/notification-yookassa", Main.notificationYookassa);
router.get("/returned-client", Main.yookassaClientCheck);
router.get("/check-client", Main.everyPayClientCheck);

router.post("/notification-epay", Main.notificationEPay);
router.post("/permodule-fix-gcourse", Main.perModuleFixGcourse);

router.post("/createPayKurs", Main.createPayKurs);
router.post("/notificationTinkoffCredit", Main.notificationTinkoffCredit);

router.post("/addGetCourse", Main.addGetCourse);
router.post("/setWAfield", Main.changeWAMessageProp);

router.post("/createAdditionalPayment", Main.createAdditionalPayment);
router.post("/createAdditionalPaymentCandles", Main.createAdditionalPaymentCandles);

router.post("/perModuleStart", Main.perModuleStart);

module.exports = router;