const { DataTypes } = require('sequelize');
const seq = require('../config/db');

const Leave = seq.define('Leave', {
  leaveId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employeeNumber: { type: DataTypes.STRING, allowNull: false },
  leaveTypeId: { type: DataTypes.INTEGER, allowNull: false },
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  endDate: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'), defaultValue: 'Pending' },
  reason: { type: DataTypes.STRING, allowNull: true },
  createdBy: { type: DataTypes.STRING, allowNull: true },
  updatedBy: { type: DataTypes.STRING, allowNull: true },
  companyId: { type: DataTypes.INTEGER, allowNull: false },
  departmentId: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'Leave',
  timestamps: true
});

module.exports = Leave;