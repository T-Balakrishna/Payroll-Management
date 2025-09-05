const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Bus = sequelize.define("Bus", {
  busId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  busNumber: { type: DataTypes.STRING, unique: true, allowNull: false },
  busDriverName: { type: DataTypes.STRING, allowNull: false },
  busRouteDetails: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM("active", "inactive"), defaultValue: "active", allowNull: false },
  createdBy: { type: DataTypes.STRING, allowNull: true },
  updatedBy: { type: DataTypes.STRING, allowNull: true },
}, {
  timestamps: true,
  tableName: "Bus",
});

module.exports = Bus;
