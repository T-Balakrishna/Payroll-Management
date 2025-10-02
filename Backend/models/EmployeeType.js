// pf non-pf

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const EmployeeType = sequelize.define("EmployeeType", {
  employeeTypeId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  employeeTypeName: { type: DataTypes.STRING, allowNull: false, unique: true },
  employeeTypeAckr: { type: DataTypes.STRING, allowNull: false, unique: true },
  status: { type: DataTypes.ENUM("active", "inactive"), defaultValue: "active", allowNull: false },
  createdBy: { type: DataTypes.STRING, allowNull: true },
  updatedBy: { type: DataTypes.STRING, allowNull: true },
  companyId: { type: DataTypes.INTEGER, allowNull: false },
}, {
  timestamps: true,
  tableName: "EmployeeType",
});

module.exports = EmployeeType;
