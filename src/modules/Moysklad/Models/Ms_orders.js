const [db, Model, DataTypes, Op] = require(global.constant.PATH_BASE);

class Ms_orders extends Model { }

Ms_orders.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    bx_id: {
        type: DataTypes.INTEGER
    },
    ms_id: {
        type: DataTypes.STRING
    },
}, {
    sequelize: db,
    modelName: 'moysklad_orders'
});

Ms_orders.getOrderByBX = async (id) => {
    return await Ms_orders.findOne({
        where: {
            'bx_id': id,
        }
    });
};
Ms_orders.getOrderByMS = async (id) => {
    return await Ms_orders.findOne({
        where: {
            'ms_id': id,
        }
    });
};

module.exports = Ms_orders;