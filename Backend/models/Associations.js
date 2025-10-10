
const defineAssociations = (models) => {
  const { 
    Attendance, 
    Company, 
    Employee, 
    BiometricDevice, 
    Bus, 
    Caste, 
    Department, 
    Designation, 
    EmployeeGrade, 
    Shift, 
    Religion, 
    EmployeeType, 
    Holiday, 
    HolidayPlan, 
    Leave, 
    LeaveType, 
    LeaveAllocation, 
    Punch, 
    User,
    Permission
  } = models;

  // BelongsTo associations (many-to-one)
  // Employee core associations
  Employee.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
  Employee.belongsTo(Designation, { foreignKey: 'designationId', as: 'designation' });
  Employee.belongsTo(EmployeeType, { foreignKey: 'employeeTypeId', as: 'employeeType' });
  Employee.belongsTo(EmployeeGrade, { foreignKey: 'employeeGradeId', as: 'grade' });
  Employee.belongsTo(Shift, { foreignKey: 'shiftId', as: 'shift' });
  Employee.belongsTo(Religion, { foreignKey: 'religionId', as: 'religion' });
  Employee.belongsTo(Caste, { foreignKey: 'casteId', as: 'caste' });
  Employee.belongsTo(Employee, { foreignKey: 'reportsTo', targetKey: 'employeeId', as: 'manager' });  // INTEGER key
  Employee.belongsTo(Bus, { foreignKey: 'busId', as: 'bus' });
  Employee.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

  // Attendance
  Attendance.belongsTo(Employee, { foreignKey: 'employeeNumber', targetKey: 'employeeNumber', as: 'employee' });
  Attendance.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

  // Leave & Allocation
  Leave.belongsTo(Employee, { foreignKey: 'employeeNumber', targetKey: 'employeeNumber', as: 'employee' });
  Leave.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', as: 'leaveType' });
  Leave.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
  LeaveAllocation.belongsTo(Employee, { foreignKey: 'employeeNumber', targetKey: 'employeeNumber', as: 'employee' });
  LeaveAllocation.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', as: 'leaveType' });

  // Punch (uses biometricNumber)
  Punch.belongsTo(Employee, { foreignKey: 'biometricNumber', targetKey: 'biometricNumber', as: 'employee' });
  Punch.belongsTo(BiometricDevice, { foreignKey: 'deviceIp', as: 'biometricDevice' });
  Punch.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

  // Holiday
  Holiday.belongsTo(HolidayPlan, { foreignKey: 'holidayPlanId', as: 'holidayPlan', onDelete: 'CASCADE' });
  Holiday.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

  // User
  User.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
  User.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

  // Company-scoped models
  Department.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
  Designation.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
  EmployeeGrade.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
  EmployeeType.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
  Shift.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
  BiometricDevice.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

  // HasMany associations (one-to-many inverses)
  // Company
  Company.hasMany(Employee, { foreignKey: 'companyId', as: 'employees' });
  Company.hasMany(Department, { foreignKey: 'companyId', as: 'departments' });
  Company.hasMany(Designation, { foreignKey: 'companyId', as: 'designations' });
  Company.hasMany(EmployeeGrade, { foreignKey: 'companyId', as: 'employeeGrades' });
  Company.hasMany(EmployeeType, { foreignKey: 'companyId', as: 'employeeTypes' });
  Company.hasMany(Shift, { foreignKey: 'companyId', as: 'shifts' });
  Company.hasMany(BiometricDevice, { foreignKey: 'companyId', as: 'biometricDevices' });
  Company.hasMany(Attendance, { foreignKey: 'companyId', as: 'attendances' });
  Company.hasMany(Holiday, { foreignKey: 'companyId', as: 'holidays' });
  Company.hasMany(Punch, { foreignKey: 'companyId', as: 'punches' });
  Company.hasMany(User, { foreignKey: 'companyId', as: 'users' });

  // Department
  Department.hasMany(Employee, { foreignKey: 'departmentId', as: 'employees' });
  Department.hasMany(User, { foreignKey: 'departmentId', as: 'users' });
  Department.hasMany(Leave, { foreignKey: 'departmentId', as: 'leaves' });

  // Other Employee-scoped
  Designation.hasMany(Employee, { foreignKey: 'designationId', as: 'employees' });
  EmployeeType.hasMany(Employee, { foreignKey: 'employeeTypeId', as: 'employees' });
  EmployeeGrade.hasMany(Employee, { foreignKey: 'employeeGradeId', as: 'employees' });
  Shift.hasMany(Employee, { foreignKey: 'shiftId', as: 'employees' });
  Religion.hasMany(Employee, { foreignKey: 'religionId', as: 'employees' });
  Caste.hasMany(Employee, { foreignKey: 'casteId', as: 'employees' });
  Bus.hasMany(Employee, { foreignKey: 'busId', as: 'employees' });

  // Self-referential
  Employee.hasMany(Employee, { foreignKey: 'reportsTo', sourceKey: 'employeeId', as: 'reportingEmployees' });

  // Employee one-to-many
  Employee.hasMany(Attendance, { foreignKey: 'employeeNumber', sourceKey: 'employeeNumber', as: 'attendances' });
  Employee.hasMany(Leave, { foreignKey: 'employeeNumber', sourceKey: 'employeeNumber', as: 'leaves' });
  Employee.hasMany(LeaveAllocation, { foreignKey: 'employeeNumber', sourceKey: 'employeeNumber', as: 'leaveAllocations' });
  Employee.hasMany(Punch, { foreignKey: 'biometricNumber', sourceKey: 'biometricNumber', as: 'punches' });

  // LeaveType
  LeaveType.hasMany(Leave, { foreignKey: 'leaveTypeId', as: 'leaves' });
  LeaveType.hasMany(LeaveAllocation, { foreignKey: 'leaveTypeId', as: 'leaveAllocations' });

  // HolidayPlan
  HolidayPlan.hasMany(Holiday, { foreignKey: 'holidayPlanId', as: 'holidays', onDelete: 'CASCADE' });

  // BiometricDevice
  BiometricDevice.hasMany(Punch, { foreignKey: 'deviceIp', as: 'punches' });

  Permission.belongsTo(Employee, { foreignKey: 'employeeNumber', as: 'employee' });
  Employee.hasMany(Permission, { foreignKey: 'employeeNumber', as: 'permissions' });
  Company.hasMany(Permission, { foreignKey: 'companyId', as: 'permissions' });
  Permission.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
};

module.exports = defineAssociations;