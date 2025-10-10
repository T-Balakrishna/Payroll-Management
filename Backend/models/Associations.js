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

  /** ================= BELONGS TO (Many → One) ================= **/

  // Employee core associations
  Employee.belongsTo(Department, { foreignKey: 'departmentId', targetKey: 'departmentId', as: 'department' });
  Employee.belongsTo(Designation, { foreignKey: 'designationId', targetKey: 'designationId', as: 'designation' });
  Employee.belongsTo(EmployeeType, { foreignKey: 'employeeTypeId', targetKey: 'employeeTypeId', as: 'employeeType' });
  Employee.belongsTo(EmployeeGrade, { foreignKey: 'employeeGradeId', targetKey: 'employeeGradeId', as: 'grade' });
  Employee.belongsTo(Shift, { foreignKey: 'shiftId', targetKey: 'shiftId', as: 'shift' });
  Employee.belongsTo(Religion, { foreignKey: 'religionId', targetKey: 'religionId', as: 'religion' });
  Employee.belongsTo(Caste, { foreignKey: 'casteId', targetKey: 'casteId', as: 'caste' });
  Employee.belongsTo(Employee, { foreignKey: 'reportsTo', targetKey: 'employeeId', as: 'manager' });
  Employee.belongsTo(Bus, { foreignKey: 'busId', targetKey: 'busId', as: 'bus' });
  Employee.belongsTo(Company, { foreignKey: 'companyId', targetKey: 'companyId', as: 'company' });

  // Attendance
  Attendance.belongsTo(Employee, { foreignKey: 'employeeNumber', targetKey: 'employeeNumber', as: 'employee' });
  Attendance.belongsTo(Company, { foreignKey: 'companyId', targetKey: 'companyId', as: 'company' });

  // Leave
  Leave.belongsTo(Employee, { foreignKey: 'employeeNumber', targetKey: 'employeeNumber', as: 'employee' });
  Leave.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', targetKey: 'leaveTypeId', as: 'leaveType' });
  Leave.belongsTo(Department, { foreignKey: 'departmentId', targetKey: 'departmentId', as: 'department' });

  // Leave Allocation
  LeaveAllocation.belongsTo(Employee, { foreignKey: 'employeeNumber', targetKey: 'employeeNumber', as: 'employee' });
  LeaveAllocation.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', targetKey: 'leaveTypeId', as: 'leaveType' });

  // Punch (if employee deleted, punch also deleted)
  Punch.belongsTo(Employee, { 
    foreignKey: 'biometricNumber', 
    targetKey: 'biometricNumber', 
    as: 'employee', 
    onDelete: 'CASCADE', 
    onUpdate: 'CASCADE' 
  });

  // Correct device relationship (assuming Punch.deviceIp → BiometricDevice.deviceIp)
  Punch.belongsTo(BiometricDevice, { 
    foreignKey: 'deviceIp', 
    targetKey: 'deviceIp', 
    as: 'biometricDevice',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });

  Punch.belongsTo(Company, { foreignKey: 'companyId', targetKey: 'companyId', as: 'company' });

  // Holiday
  Holiday.belongsTo(HolidayPlan, { 
    foreignKey: 'holidayPlanId', 
    targetKey: 'holidayPlanId', 
    as: 'holidayPlan', 
    onDelete: 'CASCADE' 
  });
  Holiday.belongsTo(Company, { foreignKey: 'companyId', targetKey: 'companyId', as: 'company' });

  // User
  User.belongsTo(Department, { foreignKey: 'departmentId', targetKey: 'departmentId', as: 'department' });
  User.belongsTo(Company, { foreignKey: 'companyId', targetKey: 'companyId', as: 'company' });

  /** ================= HAS MANY (One → Many) ================= **/

  // Company
  Company.hasMany(Employee, { foreignKey: 'companyId', sourceKey: 'companyId', as: 'employees' });
  Company.hasMany(Department, { foreignKey: 'companyId', sourceKey: 'companyId', as: 'departments' });
  Company.hasMany(Designation, { foreignKey: 'companyId', sourceKey: 'companyId', as: 'designations' });
  Company.hasMany(EmployeeGrade, { foreignKey: 'companyId', sourceKey: 'companyId', as: 'employeeGrades' });
  Company.hasMany(EmployeeType, { foreignKey: 'companyId', sourceKey: 'companyId', as: 'employeeTypes' });
  Company.hasMany(Shift, { foreignKey: 'companyId', sourceKey: 'companyId', as: 'shifts' });
  Company.hasMany(BiometricDevice, { foreignKey: 'companyId', sourceKey: 'companyId', as: 'biometricDevices' });
  Company.hasMany(Attendance, { foreignKey: 'companyId', sourceKey: 'companyId', as: 'attendances' });
  Company.hasMany(Holiday, { foreignKey: 'companyId', sourceKey: 'companyId', as: 'holidays' });
  Company.hasMany(Punch, { foreignKey: 'companyId', sourceKey: 'companyId', as: 'punches' });
  Company.hasMany(User, { foreignKey: 'companyId', sourceKey: 'companyId', as: 'users' });
  Company.hasMany(Permission, { foreignKey: 'companyId', sourceKey: 'companyId', as: 'permissions' });

  // Department
  Department.hasMany(Employee, { foreignKey: 'departmentId', sourceKey: 'departmentId', as: 'employees' });
  Department.hasMany(User, { foreignKey: 'departmentId', sourceKey: 'departmentId', as: 'users' });
  Department.hasMany(Leave, { foreignKey: 'departmentId', sourceKey: 'departmentId', as: 'leaves' });

  // Other Employee-scoped
  Designation.hasMany(Employee, { foreignKey: 'designationId', sourceKey: 'designationId', as: 'employees' });
  EmployeeType.hasMany(Employee, { foreignKey: 'employeeTypeId', sourceKey: 'employeeTypeId', as: 'employees' });
  EmployeeGrade.hasMany(Employee, { foreignKey: 'employeeGradeId', sourceKey: 'employeeGradeId', as: 'employees' });
  Shift.hasMany(Employee, { foreignKey: 'shiftId', sourceKey: 'shiftId', as: 'employees' });
  Religion.hasMany(Employee, { foreignKey: 'religionId', sourceKey: 'religionId', as: 'employees' });
  Caste.hasMany(Employee, { foreignKey: 'casteId', sourceKey: 'casteId', as: 'employees' });
  Bus.hasMany(Employee, { foreignKey: 'busId', sourceKey: 'busId', as: 'employees' });

  // Self-referential
  Employee.hasMany(Employee, { foreignKey: 'reportsTo', sourceKey: 'employeeId', as: 'reportingEmployees' });

  // Employee one-to-many
  Employee.hasMany(Attendance, { foreignKey: 'employeeNumber', sourceKey: 'employeeNumber', as: 'attendances' });
  Employee.hasMany(Leave, { foreignKey: 'employeeNumber', sourceKey: 'employeeNumber', as: 'leaves' });
  Employee.hasMany(LeaveAllocation, { foreignKey: 'employeeNumber', sourceKey: 'employeeNumber', as: 'leaveAllocations' });
  Employee.hasMany(Punch, { 
    foreignKey: 'biometricNumber', 
    sourceKey: 'biometricNumber', 
    as: 'punches', 
    onDelete: 'CASCADE', 
    onUpdate: 'CASCADE' 
  });

  // LeaveType
  LeaveType.hasMany(Leave, { foreignKey: 'leaveTypeId', sourceKey: 'leaveTypeId', as: 'leaves' });
  LeaveType.hasMany(LeaveAllocation, { foreignKey: 'leaveTypeId', sourceKey: 'leaveTypeId', as: 'leaveAllocations' });

  // HolidayPlan
  HolidayPlan.hasMany(Holiday, { foreignKey: 'holidayPlanId', sourceKey: 'holidayPlanId', as: 'holidays', onDelete: 'CASCADE' });

  // BiometricDevice
  BiometricDevice.hasMany(Punch, { foreignKey: 'deviceIp', sourceKey: 'deviceIp', as: 'punches' });

  // Permission
  Permission.belongsTo(Employee, { foreignKey: 'employeeNumber', targetKey: 'employeeNumber', as: 'employee' });
  Employee.hasMany(Permission, { foreignKey: 'employeeNumber', sourceKey: 'employeeNumber', as: 'permissions' });
};

module.exports = defineAssociations;
