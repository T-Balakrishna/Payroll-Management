const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Designation = sequelize.define("Designation", {
  designationId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  designationName: { type: DataTypes.STRING, unique: true, allowNull: false },
  designationAckr: { type: DataTypes.STRING, unique: true, allowNull: false },
  status: { type: DataTypes.ENUM("active", "inactive"), defaultValue: "active", allowNull: false },
  createdBy: { type: DataTypes.STRING, allowNull: true },
  updatedBy: { type: DataTypes.STRING, allowNull: true },
  companyId: { type: DataTypes.INTEGER, allowNull: false },
}, {
  timestamps: true,
  tableName: "Designation",
});

module.exports = Designation;