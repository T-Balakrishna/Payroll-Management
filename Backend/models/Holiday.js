// models/Holiday.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const HolidayPlan = require("./HolidayPlan");

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
      references: { model: "HolidayPlan", key: "holidayPlanId" },
      onDelete: "CASCADE",
    },
    // isWeeklyOff: { type: DataTypes.BOOLEAN, defaultValue: false },
    status: { type: DataTypes.ENUM("active", "inactive"), defaultValue: "active" },
    createdBy: { type: DataTypes.STRING, allowNull: true },
    updatedBy: { type: DataTypes.STRING, allowNull: true },
  },
  {
    timestamps: true,
    tableName: "Holiday",
  }
);

// association (optional but useful)
Holiday.belongsTo(HolidayPlan, { foreignKey: "holidayPlanId" });

module.exports = Holiday;
