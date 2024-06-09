const [db, Model, DataTypes] = require(global.constant.PATH_BASE);

class Setting extends Model {}

Setting.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    token: {
        type: DataTypes.STRING
    },
    webhook: {
        type: DataTypes.STRING
    },
    field_date_payment: {
        type: DataTypes.STRING
    },
    field_delivery_type: {
        type: DataTypes.STRING
    },
    field_is_print: {
        type: DataTypes.STRING
    }
}, {
    sequelize: db,
    modelName: 'CR_setting'
});

module.exports = Setting;