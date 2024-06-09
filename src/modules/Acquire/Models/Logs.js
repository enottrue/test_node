const [db, Model, DataTypes, Op] = require(global.constant.PATH_BASE);

class logs extends Model {}

logs.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    order_id: {
        type: DataTypes.INTEGER
    },
    data: {
        type: DataTypes.TEXT
    },
    bank:{
        type: DataTypes.STRING,
        allowNull: false
    }

}, {
    sequelize: db,
    modelName: 'logs_payments'
});


module.exports = logs;