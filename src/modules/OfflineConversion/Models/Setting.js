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
    facebook_marker: {
        type: DataTypes.STRING
    },
    facebook_act_id: {
        type: DataTypes.STRING
    },
    facebook_event_id: {
        type: DataTypes.STRING
    },
    conversion_event_id: {
        type: DataTypes.STRING
    },
    conversion_marker: {
        type: DataTypes.STRING
    },
    facebook_event_name: {
        type: DataTypes.STRING
    },
    yandex_counter: {
        type: DataTypes.STRING
    },
    yandex_token: {
        type: DataTypes.STRING
    },
    yandex_target: {
        type: DataTypes.STRING
    },
    ganalytics_target: {
        type: DataTypes.STRING
    },
    ganalytics_category: {
        type: DataTypes.STRING
    },
    ganalytics_name: {
        type: DataTypes.STRING
    },
    google_click_id: {
        type: DataTypes.STRING
    },
    google_path_file: {
        type: DataTypes.STRING
    }
}, {
    sequelize: db,
    modelName: 'OC_setting'
});

module.exports = Setting;