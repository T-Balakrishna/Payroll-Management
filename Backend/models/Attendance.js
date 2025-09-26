const { DataTypes } = require('sequelize');
const seq = require('../config/db');
const Employee = require('./Employee');

const Attendance = seq.define('Attendance', {
  attendanceId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employeeNumber: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    references: { model: Employee, key: 'employeeNumber' } 
  },
  attendanceDate: { type: DataTypes.DATEONLY, allowNull: false },
  attendanceStatus: { 
    type: DataTypes.ENUM('Present', 'Absent', 'Half-Day', 'Leave', 'Holiday', 'Permission'), 
    allowNull: false 
  },
}, {
  tableName: 'Attendance',
  timestamps: true
});

// Correct associations
Attendance.belongsTo(Employee, { foreignKey: 'employeeNumber'});
Employee.hasMany(Attendance, { foreignKey: 'employeeNumber'});

module.exports = Attendance;
