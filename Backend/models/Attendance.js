const { DataTypes } = require('sequelize');
const seq = require('../config/db');
const Employee = require('./Employee');

const Attendance = seq.define('Attendance', {
  attendanceId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, references: { model: Employee, key: 'employeeId' } },
  attendanceDate: { type: DataTypes.DATEONLY, allowNull: false },
  attendanceStatus: { type: DataTypes.ENUM('Present', 'Absent', 'Half-Day', 'Leave', 'Holiday', 'Permission'), allowNull: false },
}, {
  tableName: 'Attendance',
  timestamps: true
});

Attendance.belongsTo(Employee, { foreignKey: 'employeeId' });
Employee.hasMany(Attendance, { foreignKey: 'employeeId' });

module.exports = Attendance;
