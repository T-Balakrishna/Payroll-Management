const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Religion = sequelize.define("Religion", {
  religionId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  religionName: { type: DataTypes.STRING, allowNull: false, unique: true },
  status: { type: DataTypes.ENUM("active", "inactive"), defaultValue: "active" },
  createdBy: { type: DataTypes.STRING, allowNull: true },
  updatedBy: { type: DataTypes.STRING, allowNull: true },
}, {
  timestamps: true,
  tableName: "Religion",
});

module.exports = Religion;