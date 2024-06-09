
const [db, Model, DataTypes, Op] = require(global.constant.PATH_BASE);

class Tasks extends Model {}

Tasks.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    token:{
        type: DataTypes.STRING
    },
    task_id: {
        type: DataTypes.STRING
    },
    deadline: {
        type: DataTypes.DATE
    },
    status: {
        type: DataTypes.INTEGER
    },
}, {
    sequelize: db,
    modelName: 'TG_tasks'
});
Tasks.getTasts = async (token) => {
    return await Tasks.findAll({
        where: {
            'deadline': {[Op.lte]: db.fn('NOW')},
            'status':  {[Op.lt]: 3},
            'token': token
        }
    });
};

module.exports = Tasks;