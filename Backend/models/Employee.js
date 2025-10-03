const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Employee = sequelize.define('Employee', {
  employeeId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employeeMail: { type: DataTypes.STRING },
  employeeNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  
  // Overview
  salutation: { type: DataTypes.STRING },
  firstName: { type: DataTypes.STRING },
  middleName: { type: DataTypes.STRING },
  lastName: { type: DataTypes.STRING },
  employeeName: { 
    type: DataTypes.VIRTUAL, 
    get() { return `${this.firstName} ${this.lastName}`; } 
  },
  gender: { type: DataTypes.ENUM('Male', 'Female', 'Other') },
  DOB: { type: DataTypes.DATEONLY },
  DOJ: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },

  // Address
  doorNumber: { type: DataTypes.STRING },
  streetName: { type: DataTypes.STRING },
  city: { type: DataTypes.STRING },
  district: { type: DataTypes.STRING },
  state: { type: DataTypes.STRING },
  pincode: { type: DataTypes.STRING },

  // Job details
  remainingPermissionHours: { type: DataTypes.FLOAT, allowNull: true },
  designationId: { type: DataTypes.INTEGER },
  employeeGradeId: { type: DataTypes.INTEGER },
  reportsTo: { type: DataTypes.INTEGER },
  departmentId: { type: DataTypes.INTEGER },
  employeeTypeId: { type: DataTypes.INTEGER },
  shiftId: { type: DataTypes.INTEGER },

  // Personal
  maritalStatus: { type: DataTypes.STRING },
  weddingDate: { type: DataTypes.DATEONLY, allowNull: true },
  bloodGroup: { type: DataTypes.STRING },
  religionId: { type: DataTypes.INTEGER },
  casteId: { type: DataTypes.INTEGER },
  aadharNumber: { type: DataTypes.STRING },
  passportNumber: { type: DataTypes.STRING },

  // Salary
  costToCompany: { type: DataTypes.FLOAT },
  salaryCurrency: { type: DataTypes.STRING },
  salaryMode: { type: DataTypes.STRING },
  payrollCostCenter: { type: DataTypes.STRING },
  panNumber: { type: DataTypes.STRING },
  pfNumber: { type: DataTypes.STRING },
  esiNumber: { type: DataTypes.STRING },
  uanNumber: { type: DataTypes.STRING },

  // Photo Upload
  photo: { type: DataTypes.STRING },

  // Exit
  resignationLetterDate: { type: DataTypes.DATEONLY },
  relievingDate: { type: DataTypes.DATEONLY },
  exitInterviewHeldOn: { type: DataTypes.DATEONLY },

  // Extra
  personalMail: { type: DataTypes.STRING },
  biometricNumber: { type: DataTypes.STRING, allowNull: true },
  acctNumber: { type: DataTypes.STRING },
  qualification: { type: DataTypes.STRING },
  experience: { type: DataTypes.STRING },
  referencePerson: { type: DataTypes.STRING },
  busId: { type: DataTypes.INTEGER },
  createdBy: { type: DataTypes.STRING },
  updatedBy: { type: DataTypes.STRING },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },

  // New fields
  companyId: { type: DataTypes.INTEGER, allowNull: false },

}, {
  tableName: 'Employee',
  timestamps: true
});

module.exports = Employee;