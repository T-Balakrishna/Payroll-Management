const {DataTypes} = require('sequelize')
const seq = require('../config/db')

  const Employee = seq.define('Employee', {
    empId:{type:DataTypes.STRING},
    empName: DataTypes.STRING,
    gender: DataTypes.STRING,
    maritalStatus: DataTypes.STRING,
    dob: DataTypes.DATE,
    address: DataTypes.STRING,
    location: DataTypes.STRING,
    phone: DataTypes.STRING,
    // photo: DataTypes.BLOB('long'), // for images
    bloodGrp: DataTypes.STRING,
    doj: DataTypes.DATE,
    weeklyOff: DataTypes.STRING,
    religion: DataTypes.STRING,
    caste: DataTypes.STRING,
    qualification: DataTypes.STRING,
    experience: DataTypes.STRING,
    pfNumber: DataTypes.STRING,
    pfNominee: DataTypes.STRING,
    esiNumber: DataTypes.STRING,

    // depyId: DataTypes.INTEGER,
    // desgId: DataTypes.INTEGER,
    // empType: DataTypes.INTEGER,
    // salaryTypeId: DataTypes.INTEGER,
    // shiftTypeId: DataTypes.INTEGER,
    // refPersonId: DataTypes.STRING,
    // bankId: DataTypes.INTEGER,
    // busNumber: DataTypes.INTEGER,
  });

//   Employee.associate = (models) => {
//     Employee.belongsTo(models.Department, { foreignKey: 'depyId' });
//     Employee.belongsTo(models.Designation, { foreignKey: 'desgId' });
//     Employee.belongsTo(models.EmployeeType, { foreignKey: 'empType' });
//     Employee.belongsTo(models.SalaryType, { foreignKey: 'salaryTypeId' });
//     Employee.belongsTo(models.ShiftType, { foreignKey: 'shiftTypeId' });
//     Employee.belongsTo(models.Employee, { foreignKey: 'refPersonId', as: 'RefPerson' });
//     Employee.belongsTo(models.Bank, { foreignKey: 'bankId' });
//     Employee.belongsTo(models.BusMaster, { foreignKey: 'busNumber' });
//   };

  module.exports = Employee;
