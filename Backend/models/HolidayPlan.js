const { DataTypes } = require('sequelize');
const seq = require('../config/db');

const HolidayPlan = seq.define('HolidayPlan', {
    holidayPlanId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    holidayPlanName: { type: DataTypes.STRING, allowNull: false, unique: true },
    
    startDate: { type: DataTypes.DATEONLY, allowNull: false }, // new
    endDate: { type: DataTypes.DATEONLY, allowNull: false },   // new

    weeklyOff: { 
        type: DataTypes.ENUM("Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"), 
        defaultValue: "Sunday"
    },
    status: { type: DataTypes.ENUM("active", "inactive"), defaultValue: "active", allowNull: false },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
}, {
    tableName: 'HolidayPlan',
    timestamps: true
});

module.exports = HolidayPlan;
