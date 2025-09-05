const { DataTypes } = require('sequelize');
const seq = require('../config/db');

const BiometricDevice = seq.define('BiometricDevice', {
  deviceId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  deviceName: { type: DataTypes.STRING, allowNull: false },
  ipAddress: { type: DataTypes.STRING, allowNull: false },
  location: { type: DataTypes.STRING, allowNull: true },
  deviceType: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.ENUM('active','inactive'), defaultValue: 'active' },
  createdBy: { type: DataTypes.STRING, allowNull: true },
  updatedBy: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'BiometricDevice',
  timestamps: true
});

module.exports = BiometricDevice;
