const { DataTypes } = require('sequelize');
const seq = require('../config/db');

const Shift = seq.define('Shift', {
    shiftId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    shiftName: { type: DataTypes.STRING, allowNull: false },
    shiftInStartTime: { type: DataTypes.TIME, allowNull: false },
    shiftInEndTime: { type: DataTypes.TIME, allowNull: false },
    shiftOutStartTime: { type: DataTypes.TIME, allowNull: false },
    shiftMinHours: { type: DataTypes.FLOAT, allowNull: false },
    shiftNextDay: { type: DataTypes.BOOLEAN, defaultValue: false },
    status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active', allowNull: false },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
}, {
    tableName: 'Shift',
    timestamps: true
});

module.exports = Shift;
