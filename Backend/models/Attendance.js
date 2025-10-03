const { DataTypes } = require('sequelize');
const seq = require('../config/db');
const Attendance = seq.define('Attendance', {
  attendanceId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employeeNumber: { type: DataTypes.STRING, allowNull: false },
  attendanceDate: { type: DataTypes.DATEONLY, allowNull: false },
  attendanceStatus: {
    type: DataTypes.ENUM('Present', 'Absent', 'Half-Day', 'Leave', 'Holiday', 'Permission'),
    allowNull: false
  },
  companyId: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'Attendance',
  timestamps: true
});
module.exports = Attendance;