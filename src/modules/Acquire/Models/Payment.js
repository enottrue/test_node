const [db, Model, DataTypes, Op] = require(global.constant.PATH_BASE);
const dayjs = require('dayjs');



class Payment extends Model { }

Payment.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    token: {
        type: DataTypes.STRING
    },
    order_id: {
        type: DataTypes.INTEGER
    },
    amount: {
        type: DataTypes.INTEGER
    },
    product_amount: {
        type: DataTypes.INTEGER
    },
    data: {
        type: DataTypes.TEXT
    },
    bank: {
        type: DataTypes.STRING,
        allowNull: false
    }

}, {
    sequelize: db,
    modelName: 'payments'
});

Payment.getPaymentsToDay = async (token, bank) => {

    let dateStart = new Date(new Date().setHours(0, 0, 0))
    let dateEnd = new Date(new Date().setHours(23, 59, 59))


    return bank ? await Payment.findAll({
        where: {
            'createdAt': {
                [Op.gt]: dateStart,
                [Op.lte]: dateEnd
            },
            'bank': bank
        }
    }) : await Payment.findAll({
        where: {
            'createdAt': {
                [Op.gt]: dateStart,
                [Op.lte]: dateEnd
            },
            // 'token': token
        }
    });
};



Payment.getDataByPeriod = async (token, start, end, offset = 3) => {
    // 2023-01-08 00:00:00

    if (start && end) {
        const a = start.split(' ')[0]
        const b = end.split(' ')[0]

        var dateStart = new Date(new Date(a).setHours(0, 0, 0))
        var dateEnd = new Date(new Date(b).setHours(23, 59, 59))

    }
    else {
        const current = dayjs().set('month', dayjs().get('month')).set('year', dayjs().get('year')).set('date', dayjs().get('date'))
        // console.log('current', current.$d)

        const st = dayjs().set('month', dayjs().get('month')).set('year', dayjs().get('year')).set('date', 1).set('hour', 0).set('minute', 0).set('second', 0)


        var dateStart = new Date(st.$d)
        var dateEnd = new Date(current.$d)
    }




    // console.log(`payments by period : ${start} - ${end}`, `| |`, process.env, new Date(), dateStart, dateEnd)

    const payments = await Payment.findAll({
        where: {
            'createdAt': {
                [Op.gt]: dateStart,
                [Op.lte]: dateEnd
            },
            // 'token': token
        }
    });

    // console.log('typeof', payments[0].dataValues)

    return payments
};

module.exports = Payment;