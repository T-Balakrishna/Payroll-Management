const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const LeaveAllocation = sequelize.define("LeaveAllocation", {
  employeeNumber: { type: DataTypes.STRING, allowNull: false },
  leaveTypeId: { type: DataTypes.INTEGER, allowNull: false },
  leavePeriod: { type: DataTypes.STRING, allowNull: false },
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  endDate: { type: DataTypes.DATEONLY, allowNull: false },
  allotedLeave: { type: DataTypes.INTEGER, allowNull: false },
  usedLeave: { type: DataTypes.INTEGER, defaultValue: 0 },
  balance: { type: DataTypes.INTEGER, defaultValue: 0 },
  createdBy: { type: DataTypes.STRING, allowNull: false },
  updatedBy: { type: DataTypes.STRING, allowNull: true },
  // companyId: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'LeaveAllocation',
  timestamps: true
});

// Hook to auto-update balance before save
LeaveAllocation.beforeSave((allocation) => {
  allocation.balance = allocation.allotedLeave - allocation.usedLeave;
});

module.exports = LeaveAllocation;