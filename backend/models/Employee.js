const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Employee = sequelize.define('Employee', {
    employeeId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    // ── Identification & Login ─────────────────────────────────────
    employeeCode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      comment: 'Unique employee code / Employee Number',
    },

    biometricNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      comment: 'Biometric ID / Enrollment Number from device',
    },

    password: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Hashed password - only if local authentication is used',
    },

    // ── Basic Information ──────────────────────────────────────────
    salutation:         { type: DataTypes.STRING(10), allowNull: true },
    firstName:          { type: DataTypes.STRING(50), allowNull: false },
    middleName:         { type: DataTypes.STRING(50), allowNull: true },
    lastName:           { type: DataTypes.STRING(50), allowNull: false },
    gender:             { type: DataTypes.ENUM('Male', 'Female', 'Other'), allowNull: false },
    dateOfBirth:        { type: DataTypes.DATEONLY, allowNull: false, field: 'DOB' },
    bloodGroup:         { type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'), allowNull: true },
    maritalStatus:      { type: DataTypes.ENUM('Single', 'Married', 'Divorced', 'Widowed'), allowNull: true },
    weddingDate:        { type: DataTypes.DATEONLY, allowNull: true },
    profilePhoto:       { type: DataTypes.STRING(500), allowNull: true, field: 'photo' },

    // ── Contact Information ────────────────────────────────────────
    personalEmail:      { type: DataTypes.STRING(150), allowNull: false, validate: { isEmail: true } },
    officialEmail:      { type: DataTypes.STRING(150), allowNull: true, validate: { isEmail: true }, field: 'employeeMail' },
    mobileNumber:       { type: DataTypes.STRING(15), allowNull: false },
    alternateMobile:    { type: DataTypes.STRING(15), allowNull: true },
    emergencyContactName:       { type: DataTypes.STRING(100), allowNull: true },
    emergencyContactNumber:     { type: DataTypes.STRING(15), allowNull: true },
    emergencyContactRelationship: { type: DataTypes.STRING(50), allowNull: true },

    // ── Current Address ────────────────────────────────────────────
    currentAddressLine1: { type: DataTypes.STRING(150), allowNull: false },
    currentAddressLine2: { type: DataTypes.STRING(150), allowNull: true },
    currentCity:         { type: DataTypes.STRING(100), allowNull: false },
    currentState:        { type: DataTypes.STRING(100), allowNull: false },
    currentPincode:      { type: DataTypes.STRING(10), allowNull: false },
    currentCountry:      { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'India' },

    // Permanent Address
    permanentAddressLine1: { type: DataTypes.STRING(150), allowNull: true },
    permanentAddressLine2: { type: DataTypes.STRING(150), allowNull: true },
    permanentCity:         { type: DataTypes.STRING(100), allowNull: true },
    permanentState:        { type: DataTypes.STRING(100), allowNull: true },
    permanentPincode:      { type: DataTypes.STRING(10), allowNull: true },
    permanentCountry:      { type: DataTypes.STRING(100), allowNull: true },

    // ── Employment Information ─────────────────────────────────────
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'companies', key: 'companyId' },
    },

    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'departments', key: 'departmentId' },
    },

    designationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'designations', key: 'designationId' },
    },

    employeeGradeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'employee_grades', key: 'employeeGradeId' },
    },

    employeeTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'employee_types', key: 'employeeTypeId' },
    },

    dateOfJoining:      { type: DataTypes.DATEONLY, allowNull: false, field: 'DOJ' },
    confirmationDate:   { type: DataTypes.DATEONLY, allowNull: true },
    probationPeriod:    { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0, comment: 'in months' },

    reportingManagerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'employees', key: 'employeeId' },
      field: 'reportsTo',
    },

    workLocation:       { type: DataTypes.STRING(100), allowNull: true },

    employmentStatus:   {
      type: DataTypes.ENUM('Active', 'Resigned', 'Terminated', 'On Leave', 'Retired', 'Notice Period'),
      allowNull: false,
      defaultValue: 'Active'
    },

    // ── Shift & Attendance ─────────────────────────────────────────
    shiftTypeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'shift_types', key: 'shiftTypeId' },
    },

    leavePolicyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'leave_policies', key: 'leavePolicyId' },
    },

    weeklyOff: {
      type: DataTypes.ENUM('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'),
      allowNull: true,
      defaultValue: 'Sunday'
    },

    isOvertimeApplicable: { type: DataTypes.BOOLEAN, defaultValue: false },
    remainingPermissionHours: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },

    // ── Salary & Bank Details ──────────────────────────────────────
    basicSalary:        { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    costToCompany:      { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    salaryCurrency:     { type: DataTypes.STRING(3), defaultValue: 'INR' },
    paymentMode:        { type: DataTypes.ENUM('Bank Transfer', 'Cash', 'Cheque'), defaultValue: 'Bank Transfer' },
    bankName:           { type: DataTypes.STRING(100), allowNull: true },
    bankAccountNumber:  { type: DataTypes.STRING(50), allowNull: true },
    ifscCode:           { type: DataTypes.STRING(11), allowNull: true },
    panNumber:          { type: DataTypes.STRING(10), allowNull: true },
    uanNumber:          { type: DataTypes.STRING(20), allowNull: true },
    esiNumber:          { type: DataTypes.STRING(20), allowNull: true },

    // ── Transport & Hostel ─────────────────────────────────────────
    isTransportRequired: { type: DataTypes.BOOLEAN, defaultValue: false },
    busId:              { type: DataTypes.INTEGER, allowNull: true, references: { model: 'buses', key: 'busId' } },
    pickupPoint:        { type: DataTypes.STRING(150), allowNull: true },

    // ── Documents ──────────────────────────────────────────────────
    aadhaarNumber:      { type: DataTypes.STRING(12), allowNull: true },
    passportNumber:     { type: DataTypes.STRING(20), allowNull: true },
    drivingLicenseNumber: { type: DataTypes.STRING(20), allowNull: true },
    voterIdNumber:      { type: DataTypes.STRING(20), allowNull: true },

    // ── Exit Information ───────────────────────────────────────────
    resignationLetterDate: { type: DataTypes.DATEONLY, allowNull: true },
    relievingDate:         { type: DataTypes.DATEONLY, allowNull: true },
    exitInterviewHeldOn:   { type: DataTypes.DATEONLY, allowNull: true },

    // ── Status & Audit ─────────────────────────────────────────────
    status: {
      type: DataTypes.ENUM('Active', 'Inactive'),
      allowNull: false,
      defaultValue: 'Active'
    },

    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'userId' },
      onDelete: 'SET NULL',
    },

    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'userId' },
      onDelete: 'SET NULL',
    },

  }, {
    tableName: 'employees',
    timestamps: true,
    paranoid: true,

    hooks: {
      beforeValidate: (employee) => {
        if (employee.dateOfBirth) {
          const dob = new Date(employee.dateOfBirth);
          const retirement = new Date(dob);
          retirement.setFullYear(dob.getFullYear() + 58);
          employee.dateOfRetirement = retirement.toISOString().split('T')[0];
        }
      }
    }
  });

  // ── Virtual Fields ─────────────────────────────────────────────────
  Employee.prototype.getFullName = function () {
    const parts = [
      this.salutation || '',
      this.firstName,
      this.middleName || '',
      this.lastName
    ].filter(Boolean);
    return parts.join(' ').trim();
  };

  Employee.prototype.getAge = function () {
    if (!this.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  // ── Associations ───────────────────────────────────────────────────
  Employee.associate = (models) => {
    Employee.belongsTo(models.Company,       { foreignKey: 'companyId', as: 'company' });
    Employee.belongsTo(models.Department,    { foreignKey: 'departmentId', as: 'department' });
    Employee.belongsTo(models.Designation,   { foreignKey: 'designationId', as: 'designation' });
    Employee.belongsTo(models.EmployeeGrade, { foreignKey: 'employeeGradeId', as: 'grade' });
    Employee.belongsTo(models.EmployeeType,  { foreignKey: 'employeeTypeId', as: 'employeeType' });
    Employee.belongsTo(models.Employee,      { as: 'Manager', foreignKey: 'reportingManagerId' });
    Employee.belongsTo(models.Bus,           { foreignKey: 'busId', as: 'bus' });

    Employee.hasMany(models.LeaveRequest,    { foreignKey: 'employeeId', as: 'leaveRequests' });
    Employee.hasMany(models.Attendance,      { foreignKey: 'employeeId', as: 'attendances' });
    Employee.hasMany(models.BiometricPunch,  { foreignKey: 'employeeId', as: 'biometricPunches' });
    Employee.hasMany(models.ShiftAssignment, { foreignKey: 'employeeId', as: 'shiftAssignments' });
    Employee.hasMany(models.EmployeeLoan,    { foreignKey: 'employeeId', as: 'loans' });
    Employee.hasMany(models.EmployeeSalaryMaster, { foreignKey: 'employeeId', as: 'salaryMasters' });
    Employee.hasMany(models.SalaryGeneration, { foreignKey: 'employeeId', as: 'salaryGenerations' });
    Employee.hasMany(models.SalaryRevisionHistory, { foreignKey: 'employeeId', as: 'salaryRevisions' });
    Employee.hasMany(models.LeaveAllocation, { foreignKey: 'employeeId', as: 'leaveAllocations' });
    Employee.hasMany(models.LeaveRequestHistory, { foreignKey: 'actionBy', as: 'leaveActions' });
    Employee.hasMany(models.LeaveApproval, { foreignKey: 'approverId', as: 'leaveApprovals' });
  };

  return Employee;
};