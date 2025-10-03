const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Holiday = sequelize.define(
  "Holiday",
  {
    holidayId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    holidayDate: { type: DataTypes.DATEONLY, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: false },
    holidayPlanId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: { type: DataTypes.ENUM("active", "inactive"), defaultValue: "active" },
    createdBy: { type: DataTypes.STRING, allowNull: true },
    updatedBy: { type: DataTypes.STRING, allowNull: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    timestamps: true,
    tableName: "Holiday",
  }
);

module.exports = Holiday;