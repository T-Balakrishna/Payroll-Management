const { DataTypes } = require('sequelize');
const seq = require('../config/db');
const Permission = seq.define('Permission', {
  permissionId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
  employeeNumber: { type: DataTypes.STRING, allowNull: false },
  permissionDate: { type: DataTypes.DATEONLY, allowNull: false },
  permissionHours: { type: DataTypes.INTEGER, allowNull: false },
  remainingHours: { type: DataTypes.INTEGER, allowNull: false },
  companyId:{ type: DataTypes.INTEGER, allowNull: false },
  createdBy: { type: DataTypes.STRING, allowNull: true },
  updatedBy: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'Permission',
  timestamps: true 
});
module.exports = Permission;