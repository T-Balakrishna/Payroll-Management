const { DataTypes } = require('sequelize');
const seq = require('../config/db');
const Employee = require('./Employee');
const LeaveType = require('./LeaveType');

const Leave = seq.define('Leave', {
  leaveId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employeeNumber: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    references: { model: Employee, key: 'employeeNumber' } 
  },
  leaveTypeId: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    references: { model: LeaveType, key: 'leaveTypeId' } 
  },
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  endDate: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'), defaultValue: 'Pending' },
  reason: { type: DataTypes.STRING, allowNull: true },
  createdBy: { type: DataTypes.STRING, allowNull: true },
  updatedBy: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'Leave',
  timestamps: true
});

// Associations
Employee.hasMany(Leave, { foreignKey: 'employeeNumber' });
Leave.belongsTo(Employee, { foreignKey: 'employeeNumber' });

LeaveType.hasMany(Leave, { foreignKey: 'leaveTypeId' });
Leave.belongsTo(LeaveType, { foreignKey: 'leaveTypeId' });

module.exports = Leave;