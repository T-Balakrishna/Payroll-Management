const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const HolidayPlan = sequelize.define("HolidayPlan", {
  holidayPlanId: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  holidayPlanName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  weeklyOff: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      const rawValue = this.getDataValue("weeklyOff");
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue("weeklyOff", JSON.stringify(value));
    },
  },
  createdBy: {
    type: DataTypes.STRING,
  },
  updatedBy: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "active",
  }
}, {
    tableName: 'HolidayPlan',
    timestamps: true
});

module.exports = HolidayPlan;

