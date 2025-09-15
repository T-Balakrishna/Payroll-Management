const { DataTypes } = require('sequelize');
const seq = require('../config/db');
const Employee = require('./Employee');
const BiometricDevice = require('./BiometricDevice');

const Punch = seq.define('Punch', {
  punchId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  biometricNumber: { type: DataTypes.INTEGER, allowNull: false },
  employeeNumber: { type: DataTypes.STRING, allowNull: true,  },
  deviceIp: { type: DataTypes.STRING, allowNull: true,references: { model: BiometricDevice, key: 'deviceIp' } },
  punchTimestamp: { type: DataTypes.DATE, allowNull: false },
  createdBy: { type: DataTypes.STRING, allowNull: true },
  updatedBy: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'Punch',
  timestamps: true
});

// Associations
// Employee.hasMany(Punch, { foreignKey: 'employeeNumber' });
// Punch.belongsTo(Employee, { foreignKey: 'employeeNumber' });

BiometricDevice.hasMany(Punch, { foreignKey: 'deviceIp' });
Punch.belongsTo(BiometricDevice, { foreignKey: 'deviceIp' });

module.exports = Punch;


//references: { model: Employee, key: 'employeeNumber' }
// references: { model: BiometricDevice, key: 'deviceIp' } 