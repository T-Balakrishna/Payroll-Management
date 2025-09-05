const { DataTypes } = require('sequelize');
const seq = require('../config/db');

const HolidayPlan = seq.define('HolidayPlan', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
}, {
    tableName: 'HolidayPlan',
    timestamps: true
});

module.exports = HolidayPlan;
