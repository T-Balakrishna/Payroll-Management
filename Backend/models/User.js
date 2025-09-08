const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define("User", {
  userId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userMail: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  userNumber: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM("Staff", "Admin", "Department Admin"), allowNull: false },
  departmentId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Department", key: "departmentId" } },

  password: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM("active", "inactive"), defaultValue: "active" },
  createdBy: { type: DataTypes.STRING, allowNull: true },
  updatedBy: { type: DataTypes.STRING, allowNull: true },
}, {
  timestamps: true,
  tableName: "User"
});

module.exports = User;
