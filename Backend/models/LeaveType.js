const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const LeaveType = sequelize.define("LeaveType", {
  leaveTypeId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  leaveTypeName: { type: DataTypes.STRING, allowNull: false, unique: true },
  maxAllocationPertype: { type: DataTypes.INTEGER, allowNull: true },
  allowApplicationAfterDays: { type: DataTypes.INTEGER, allowNull: true },
  minWorkingDaysForLeave: { type: DataTypes.INTEGER, allowNull: true },
  maxConsecutiveLeaves: { type: DataTypes.INTEGER, allowNull: true },
  isCarryForward: { type: DataTypes.BOOLEAN, defaultValue: false },
  isLeaveWithoutPay: { type: DataTypes.BOOLEAN, defaultValue: false },
  isPartiallyPaidLeave: { type: DataTypes.BOOLEAN, defaultValue: false },
  isOptionalLeave: { type: DataTypes.BOOLEAN, defaultValue: false },
  allowNegativeBalance: { type: DataTypes.BOOLEAN, defaultValue: false },
  allowOverAllocation: { type: DataTypes.BOOLEAN, defaultValue: false },
  includeHolidaysAsLeave: { type: DataTypes.BOOLEAN, defaultValue: false },
  isCompensatory: { type: DataTypes.BOOLEAN, defaultValue: false },
  allowEncashment: { type: DataTypes.BOOLEAN, defaultValue: false },
  isEarnedLeave: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: { type: DataTypes.ENUM("active", "inactive"), defaultValue: "active" },
  createdBy: { type: DataTypes.STRING, allowNull: true },
  updatedBy: { type: DataTypes.STRING, allowNull: true },
}, {
  timestamps: true,
  tableName: "LeaveType",
});

module.exports = LeaveType;