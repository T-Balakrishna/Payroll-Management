const { DataTypes } = require('sequelize');
const seq = require('../config/db');

const LeavePolicy = seq.define('LeavePolicy', {
  leavePolicyId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  policyName: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.STRING, allowNull: true },
  createdBy: { type: DataTypes.STRING },
  updatedBy: { type: DataTypes.STRING },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' }
}, {
  tableName: 'LeavePolicy',
  timestamps: true
});

module.exports = LeavePolicy;
