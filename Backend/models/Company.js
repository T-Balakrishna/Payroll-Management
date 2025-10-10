const { DataTypes } = require('sequelize');
const seq = require('../config/db');

const Company = seq.define('Company', {
  companyId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  companyAcr: { type: DataTypes.STRING, allowNull: false, unique: true, trim: true },
  companyName: { type: DataTypes.STRING, allowNull: false, trim: true },
  permissionHoursPerMonth: { type: DataTypes.INTEGER, defaultValue: 0,allowNull: true},
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
  createdBy: { type: DataTypes.STRING, allowNull: true },
  updatedBy: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'Company',
  timestamps: true
});

module.exports = Company;