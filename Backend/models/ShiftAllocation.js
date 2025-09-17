const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Import related models
const Employee = require("./Employee");
const Department = require("./Department");
const Shift = require("./Shift");

const ShiftAllocation = sequelize.define("ShiftAllocation", {
  allocationId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  employeeNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: Employee,
      key: "employeeNumber",
    },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  departmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Department,
      key: "departmentId",
    },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  shiftId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Shift,
      key: "shiftId",
    },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false, // true = general shift (8 hrs), false = special shift
  },
  status: {
    type: DataTypes.ENUM("active", "inactive"),
    allowNull: false,
    defaultValue: "active",
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  updatedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: "ShiftAllocation",
});

// ✅ Associations
Employee.hasMany(ShiftAllocation, { foreignKey: "employeeNumber" });
ShiftAllocation.belongsTo(Employee, { foreignKey: "employeeNumber" });

Department.hasMany(ShiftAllocation, { foreignKey: "departmentId" });
ShiftAllocation.belongsTo(Department, { foreignKey: "departmentId" });

Shift.hasMany(ShiftAllocation, { foreignKey: "shiftId" });
ShiftAllocation.belongsTo(Shift, { foreignKey: "shiftId" });

module.exports = ShiftAllocation;


