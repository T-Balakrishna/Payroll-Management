const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Caste = sequelize.define("Caste", {
  casteId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  casteName: { type: DataTypes.STRING, allowNull: false, unique: true },
  status: { type: DataTypes.ENUM("active", "inactive"), defaultValue: "active", allowNull: false },
  createdBy: { type: DataTypes.STRING, allowNull: true },
  updatedBy: { type: DataTypes.STRING, allowNull: true },
}, {
  timestamps: true,
  tableName: "Caste",
});

module.exports = Caste;
