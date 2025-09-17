const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Employee = require("./Employee");
const LeaveType = require("./LeaveType");

const LeaveAllocation = sequelize.define("LeaveAllocation", {
  employeeNumber : {
    type:DataTypes.STRING,
    references: { model: Employee, key: 'employeeNumber' },
    allowNull:false,
  },
  leaveTypeId:{
    type:DataTypes.INTEGER,
    references: { model: LeaveType, key: 'leaveTypeId' },
    allowNull:false,
  },
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
},{
    tableName: 'LeaveAllocation',
    timestamps: true
});
// Associations
LeaveAllocation.belongsTo(Employee, { foreignKey: "employeeNumber" });
Employee.hasMany(LeaveAllocation, { foreignKey: "employeeNumber" });

LeaveAllocation.belongsTo(LeaveType, { foreignKey: "leaveTypeId" });
LeaveType.hasMany(LeaveAllocation, { foreignKey: "leaveTypeId" });

// Hook to auto-update balance before save
LeaveAllocation.beforeSave((allocation) => {
  allocation.balance = allocation.allotedLeave - allocation.usedLeave;
});

module.exports = LeaveAllocation;