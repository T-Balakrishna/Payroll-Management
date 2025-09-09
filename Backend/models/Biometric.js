const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Employee = require("./Employee");

const Biometric = sequelize.define("Biometric", {
  biometricId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  biometricNumber: { type: DataTypes.STRING, allowNull: false, unique: true }, // deviceUserId
  employeeNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    references: { model: "Employee", key: "employeeNumber" }
  },
}, {
  timestamps: true,
  tableName: "Biometric"
});

// Relations
Employee.hasOne(Biometric, { foreignKey: "employeeNumber" });
Biometric.belongsTo(Employee, { foreignKey: "employeeNumber" });

module.exports = Biometric;
