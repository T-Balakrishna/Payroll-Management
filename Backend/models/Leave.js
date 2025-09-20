const { DataTypes } = require('sequelize');
const seq = require('../config/db');
const Employee = require('./Employee');
const LeavePolicy = require('./LeavePolicy');
const LeaveType = require('./LeaveType');

const LeaveRequest = seq.define('LeaveRequest', {
  leaveId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employeeId: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    references: { model: Employee, key: 'employeeId' } 
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
  tableName: 'LeaveRequest',
  timestamps: true
});

// Associations
Employee.hasMany(LeaveRequest, { foreignKey: 'employeeId' });
LeaveRequest.belongsTo(Employee, { foreignKey: 'employeeId' });

LeaveType.hasMany(LeaveRequest, { foreignKey: 'leaveTypeId' });
LeaveRequest.belongsTo(LeaveType, { foreignKey: 'leaveTypeId' });

module.exports = LeaveRequest; 
