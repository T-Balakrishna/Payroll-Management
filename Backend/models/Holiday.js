const { DataTypes } = require('sequelize');
const seq = require('../config/db');
const HolidayPlan = require('./HolidayPlan');

const Holiday = seq.define('Holiday', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: false },
    holidayPlanId: { 
        type: DataTypes.INTEGER, 
        allowNull: false, 
        references: { model: HolidayPlan, key: 'id' } 
    },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
}, {
    tableName: 'Holiday',
    timestamps: true
});

Holiday.belongsTo(HolidayPlan, { foreignKey: 'holidayPlanId' });
HolidayPlan.hasMany(Holiday, { foreignKey: 'holidayPlanId' });

module.exports = Holiday;
