const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Department = sequelize.define("Department", {
  departmentId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  departmentName: { type: DataTypes.STRING, unique: true, allowNull: false },
  departmentAckr: { type: DataTypes.STRING, unique: true, allowNull: false },
  status: { type: DataTypes.ENUM("active", "inactive"), defaultValue: "active", allowNull: false },
  createdBy: { type: DataTypes.STRING, allowNull: true },
  updatedBy: { type: DataTypes.STRING, allowNull: true },
}, {
  timestamps: true,
  tableName: "Department",
});

module.exports = Department;
