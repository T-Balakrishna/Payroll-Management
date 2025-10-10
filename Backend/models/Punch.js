const { DataTypes } = require('sequelize');
const seq = require('../config/db');

const Punch = seq.define('Punch', {
  punchId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  biometricNumber: { type: DataTypes.STRING, allowNull: false },
  deviceIp: { type: DataTypes.STRING, allowNull: true },
  punchTimestamp: { type: DataTypes.DATE, allowNull: false },
  companyId: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'Punch',
  timestamps: false
});

module.exports = Punch;