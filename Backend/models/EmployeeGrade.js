//Teachiing and Non-Teaching
const { DataTypes } = require('sequelize');
const seq = require('../config/db');

const EmployeeGrade = seq.define('EmployeeGrade', {
    employeeGradeId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    employeeGradeName: { type: DataTypes.STRING, allowNull: false, unique: true },
    employeeGradeAckr: { type: DataTypes.STRING, allowNull: false, unique: true },
    status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active', allowNull: false },
    createdBy: { type: DataTypes.STRING, allowNull: true },
    updatedBy: { type: DataTypes.STRING, allowNull: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
}, {
    tableName: 'EmployeeGrade',
    timestamps: true
});

module.exports = EmployeeGrade;