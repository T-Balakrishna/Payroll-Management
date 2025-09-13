// const { DataTypes } = require('sequelize');
// const seq = require('../config/db');
// const LeavePolicy = require('./LeavePolicy');
// const LeaveType = require('./LeaveType');

// const LeavePolicyDetails = seq.define('LeavePolicyDetails', {
//   id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
//   leavePolicyId: {
//     type: DataTypes.INTEGER,
//     allowNull: false,
//     references: { model: LeavePolicy, key: 'leavePolicyId' }
//   },
//   leaveTypeId: {
//     type: DataTypes.INTEGER,
//     allowNull: false,
//     references: { model: LeaveType, key: 'leaveTypeId' }
//   },
//   allocatedLeaves: { type: DataTypes.INTEGER, allowNull: false }
// }, {
//   tableName: 'LeavePolicyDetails',
//   timestamps: true
// });

// // Associations
// LeavePolicy.belongsToMany(LeaveType, {
//   through: LeavePolicyDetails,
//   foreignKey: 'leavePolicyId',
//   otherKey: 'leaveTypeId'
// });

// LeaveType.belongsToMany(LeavePolicy, {
//   through: LeavePolicyDetails,
//   foreignKey: 'leaveTypeId',
//   otherKey: 'leavePolicyId'
// });

// module.exports = LeavePolicyDetails;
