const { DataTypes } = require('sequelize');
const seq = require('../config/db');

const BiometricDevice = seq.define('BiometricDevice', {
  deviceId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  deviceIp: { type: DataTypes.STRING, allowNull: false, unique: true },
  location: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
  createdBy: { type: DataTypes.STRING, allowNull: true },
  updatedBy: { type: DataTypes.STRING, allowNull: true },
  companyId: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'BiometricDevice',
  timestamps: true
});

module.exports = BiometricDevice;