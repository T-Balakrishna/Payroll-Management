const { DataTypes } = require('sequelize');
const seq = require('../config/db');
const Employee = require('./Employee');
const BiometricDevice = require('./BiometricDevice');

const Punch = seq.define('Punch', {
  punchId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  biometricId: { type: DataTypes.STRING, allowNull: false },
  employeeId: { type: DataTypes.INTEGER, allowNull: true, references: { model: Employee, key: 'employeeId' } },
  deviceId: { type: DataTypes.INTEGER, allowNull: true, references: { model: BiometricDevice, key: 'deviceId' } },
  punchTimestamp: { type: DataTypes.DATE, allowNull: false },
  createdBy: { type: DataTypes.STRING, allowNull: true },
  updatedBy: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'Punch',
  timestamps: true
});

// Associations
Employee.hasMany(Punch, { foreignKey: 'employeeId' });
Punch.belongsTo(Employee, { foreignKey: 'employeeId' });

BiometricDevice.hasMany(Punch, { foreignKey: 'deviceId' });
Punch.belongsTo(BiometricDevice, { foreignKey: 'deviceId' });

module.exports = Punch;
