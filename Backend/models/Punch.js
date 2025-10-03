const { DataTypes } = require('sequelize');
const seq = require('../config/db');

const Punch = seq.define('Punch', {
  punchId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  biometricNumber: { type: DataTypes.STRING, allowNull: false },
  deviceIp: { type: DataTypes.STRING, allowNull: true },
  punchTimestamp: { type: DataTypes.DATE, allowNull: false },
  createdBy: { type: DataTypes.STRING, allowNull: true },
  updatedBy: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'Punch',
  timestamps: true
});

module.exports = Punch;