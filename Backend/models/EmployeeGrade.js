// teaching non teACHING

const { DataTypes } = require('sequelize');
const seq = require('../config/db');

const EmployeeGrade = seq.define('EmployeeGrade', {
    employeeGradeId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    employeeGradeName: { type: DataTypes.STRING, allowNull: false, unique: true },
    employeeGradeAckr: { type: DataTypes.STRING, allowNull: false, unique: true },
    status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active', allowNull: false },
    createdBy: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.STRING }
}, {
    tableName: 'EmployeeGrade',
    timestamps: true
});

module.exports = EmployeeGrade;
