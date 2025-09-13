const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Department = require('./Department');
const Designation = require('./Designation');
const EmployeeGrade = require('./EmployeeGrade');
const EmployeeType = require('./EmployeeType');
const Shift = require('./Shift');
const Religion = require('./Religion');
const Caste = require('./Caste');
const Bus = require('./Bus');  // ✅ Added missing Bus import

const Employee = sequelize.define('Employee', {
  employeeId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  // Overview
  salutation: { type: DataTypes.STRING, allowNull: true },
  firstName: { type: DataTypes.STRING, allowNull: false },
  middleName: { type: DataTypes.STRING, allowNull: true },
  lastName: { type: DataTypes.STRING, allowNull: false },
  employeeName: { 
    type: DataTypes.VIRTUAL, 
    get() { return `${this.firstName} ${this.lastName}`; }   // ✅ backticks fixed
  },
  gender: { type: DataTypes.ENUM('Male','Female','Other'), allowNull: true },
  DOB: { type: DataTypes.DATEONLY, allowNull: true },
  DOJ: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },

  // Address
  doorNumber: { type: DataTypes.STRING },
  streetName: { type: DataTypes.STRING },
  city: { type: DataTypes.STRING },
  district: { type: DataTypes.STRING },
  state: { type: DataTypes.STRING },
  pincode: { type: DataTypes.STRING },

  // Job Details (foreign keys)
  designationId: { 
    type: DataTypes.INTEGER, 
    references: { model: Designation, key: 'designationId' } 
  },
  employeeGradeId: { 
    type: DataTypes.INTEGER, 
    references: { model: EmployeeGrade, key: 'employeeGradeId' } 
  },
  reportsTo: { 
    type: DataTypes.INTEGER, 
    references: { model: 'Employee', key: 'employeeId' } 
  },
  departmentId: { 
    type: DataTypes.INTEGER, 
    references: { model: Department, key: 'departmentId' } 
  },
  employeeTypeId: { 
    type: DataTypes.INTEGER,
    references: { model: EmployeeType, key: 'employeeTypeId' } 
  }, 
  employeeNumber: { type: DataTypes.STRING, allowNull: false, unique: true },

  // Attendance & Leaves
  holidayListPolicyId: { type: DataTypes.INTEGER },
  
  shiftId: { 
    type: DataTypes.INTEGER, 
    references: { model: Shift, key: 'shiftId' } 
  },

  // Personal
  maritalStatus: { type: DataTypes.STRING },
  bloodGroup: { type: DataTypes.STRING },
  religionId: { 
    type: DataTypes.INTEGER, 
    references: { model: Religion, key: 'religionId' } 
  },
  casteId: { 
    type: DataTypes.INTEGER, 
    references: { model: Caste, key: 'casteId' } 
  },
  aadharNumber: { type: DataTypes.STRING },
  passportNumber: { type: DataTypes.STRING },

  // Salary
  costToCompany: { type: DataTypes.FLOAT ,allowNull:true},
  salaryCurrency: { type: DataTypes.STRING,allowNull:true },
  salaryMode: { type: DataTypes.STRING ,allowNull:true},
  payrollCostCenter: { type: DataTypes.STRING ,allowNull:true},
  panNumber: { type: DataTypes.STRING,allowNull:true },
  pfNumber: { type: DataTypes.STRING ,allowNull:true},
  pfNominee: { type: DataTypes.STRING ,allowNull:true},
  esiNumber: { type: DataTypes.STRING ,allowNull:true},
  uanNumber: { type: DataTypes.STRING ,allowNull:true},

  // Photo
  photo: { type: DataTypes.BLOB('long') },

  // Exit
  resignationLetterDate: { type: DataTypes.DATEONLY },
  relievingDate: { type: DataTypes.DATEONLY },
  exitInterviewHeldOn: { type: DataTypes.DATEONLY },

  createdBy: { type: DataTypes.STRING },
  updatedBy: { type: DataTypes.STRING },

  // Extra Fields
  employeeMail: { type: DataTypes.STRING },
  personalMail: { type: DataTypes.STRING },
  salaryId: { type: DataTypes.INTEGER },
  acctNumber: { type: DataTypes.STRING },
  password: { type: DataTypes.STRING },
  qualification: { type: DataTypes.STRING },
  experience: { type: DataTypes.STRING },

  // 🔹 Changed fields
  referencePerson: { 
    type: DataTypes.INTEGER,
    references: { model: 'Employee', key: 'employeeId' }
  },
  busId: {
    type: DataTypes.INTEGER,
    references: { model: 'Bus', key: 'busId' }
  },

}, {
  tableName: 'Employee',
  timestamps: true
});

// ===================== ASSOCIATIONS =====================

// Employee belongsTo Department
Employee.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// Employee belongsTo Designation
Employee.belongsTo(Designation, { foreignKey: 'designationId', as: 'designation' });

// Employee belongsTo Grade
Employee.belongsTo(EmployeeGrade, { foreignKey: 'employeeGradeId', as: 'grade' });

// Employee belongsTo Shift
Employee.belongsTo(Shift, { foreignKey: 'shiftId', as: 'shift' });

// Employee belongsTo Religion
Employee.belongsTo(Religion, { foreignKey: 'religionId', as: 'religion' });

// Employee belongsTo Caste
Employee.belongsTo(Caste, { foreignKey: 'casteId', as: 'caste' });

// Employee reports to another Employee (self-reference)
Employee.belongsTo(Employee, { foreignKey: 'reportsTo', as: 'manager' });

// Employee has reference person (self-reference)
Employee.belongsTo(Employee, { foreignKey: 'referencePerson', as: 'referencePersonDetails' });

// Employee belongsTo Bus
Employee.belongsTo(Bus, { foreignKey: 'busId', as: 'bus' });

module.exports = Employee;
