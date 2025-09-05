const { DataTypes } = require('sequelize');
const seq = require('../config/db');

const User = seq.define('User', {
  collegeMail: { type: DataTypes.STRING, primaryKey: true , unique:true , allowNull :false},
  doj: {type : DataTypes.DATE,defaultValue: DataTypes.NOW , allowNull:false},
  weeklyOff: { type: DataTypes.STRING, unique:true , allowNull :false},
  deptId: DataTypes.INTEGER,
  desgId: DataTypes.INTEGER,
  empType: DataTypes.INTEGER,
  emType: DataTypes.INTEGER,
  shiftTypeId: DataTypes.INTEGER,
  role: DataTypes.STRING,
  salaryTypeId: DataTypes.INTEGER
});

module.exports = User;
