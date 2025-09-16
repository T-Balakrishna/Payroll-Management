const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Employee = require("./Employee");
const LeaveType = require("./LeaveType");

const LeaveAllocation = sequelize.define("LeaveAllocation", {
  leavePeriod: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  allotedLeave: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  usedLeave: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  balance: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  updatedBy: {
    type: DataTypes.STRING,
  },
});
// Associations
LeaveAllocation.belongsTo(Employee, { foreignKey: "employeeId" });
Employee.hasMany(LeaveAllocation, { foreignKey: "employeeId" });

LeaveAllocation.belongsTo(LeaveType, { foreignKey: "leaveTypeId" });
LeaveType.hasMany(LeaveAllocation, { foreignKey: "leaveTypeId" });

// Hook to auto-update balance before save
LeaveAllocation.beforeSave((allocation) => {
  allocation.balance = allocation.allotedLeave - allocation.usedLeave;
});

module.exports = LeaveAllocation;
