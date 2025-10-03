const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Department = sequelize.define(
  "Department",
  {
    departmentId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    departmentName: { type: DataTypes.STRING, allowNull: false },
    departmentAckr: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.ENUM("active", "inactive"), defaultValue: "active", allowNull: false },
    createdBy: { type: DataTypes.STRING, allowNull: true },
    updatedBy: { type: DataTypes.STRING, allowNull: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    timestamps: true,
    tableName: "Department",
    indexes: [
      {
        unique: true,
        fields: ["companyId", "departmentName"], // departmentName unique within company
      },
      {
        unique: true,
        fields: ["companyId", "departmentAckr"], // departmentAckr unique within company
      },
    ],
  }
);

module.exports = Department;
