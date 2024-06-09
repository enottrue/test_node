const middleware = require('./middleware');
const Main = require('./Controllers/Main');
const Index = require('koa-router');
const router = new Index({
        prefix: '/offline_conversion'
});

router.use('/', middleware.checkTokenBase.bind(middleware));
router.use(["/yandex", "/facebook", "/google", "/googleAnalytics"], middleware.getBXDataDeal.bind(middleware));

router.use('/facebook', middleware.checkEventInBaseFacebook);

router.all("/", Main.index);

router.post("/facebookConversion", middleware.typeEvent.bind(middleware), Main.sendFacebookConversion);
router.post("/facebook", Main.sendDataFacebook);
router.post("/yandex", Main.sendDataYandex);
router.post("/googleAd", Main.sendDataGoogleAd);
router.post("/googleAnalytics", Main.sendDataGoogleAnalytics);

router.post("/saveSettings", Main.saveSettings);

module.exports = router;