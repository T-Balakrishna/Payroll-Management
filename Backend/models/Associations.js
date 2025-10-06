const defineAssociations = (models) => {
  const { Attendance, Company, Employee, BiometricDevice, Bus, Caste, Department, Designation, EmployeeGrade, Shift, Religion, EmployeeType, Holiday, HolidayPlan, Leave, LeaveType, LeaveAllocation, Punch } = models;

  // Existing belongsTo associations
  Attendance.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
  Attendance.belongsTo(Employee, { foreignKey: 'employeeNumber', targetKey: 'employeeNumber', as: 'employee' });
  Employee.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
  Employee.belongsTo(Designation, { foreignKey: 'designationId', as: 'designation' });
  Employee.belongsTo(EmployeeType, { foreignKey: 'employeeTypeId', as: 'employeeType' });
  Employee.belongsTo(EmployeeGrade, { foreignKey: 'employeeGradeId', as: 'grade' });
  Employee.belongsTo(Shift, { foreignKey: 'shiftId', as: 'shift' });
  Employee.belongsTo(Religion, { foreignKey: 'religionId', as: 'religion' });
  Employee.belongsTo(Caste, { foreignKey: 'casteId', as: 'caste' });
  Employee.belongsTo(Employee, { foreignKey: 'reportsTo', as: 'manager' });
  Employee.belongsTo(Bus, { foreignKey: 'busId', as: 'bus' });
  Employee.belongsTo(Attendance, { foreignKey: 'employeeNumber', targetKey: 'employeeNumber', as: 'attendances' });
  Holiday.belongsTo(HolidayPlan, { foreignKey: 'holidayPlanId', as: 'holidayPlan', onDelete: 'CASCADE' });
  Leave.belongsTo(Employee, { foreignKey: 'employeeNumber', targetKey: 'employeeNumber', as: 'employee' });
  Leave.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', as: 'leaveType' });
  LeaveAllocation.belongsTo(Employee, { foreignKey: 'employeeNumber', targetKey: 'employeeNumber', as: 'employee' });
  LeaveAllocation.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', as: 'leaveType' });

  // Add missing hasMany associations (inverse sides)
  Department.hasMany(Employee, { foreignKey: 'departmentId', as: 'employees' });
  Designation.hasMany(Employee, { foreignKey: 'designationId', as: 'employees' });
  EmployeeType.hasMany(Employee, { foreignKey: 'employeeTypeId', as: 'employees' });
  EmployeeGrade.hasMany(Employee, { foreignKey: 'employeeGradeId', as: 'employees' });
  Shift.hasMany(Employee, { foreignKey: 'shiftId', as: 'employees' });
  Religion.hasMany(Employee, { foreignKey: 'religionId', as: 'employees' });
  Caste.hasMany(Employee, { foreignKey: 'casteId', as: 'employees' });
  Bus.hasMany(Employee, { foreignKey: 'busId', as: 'employees' });
  Employee.hasMany(Employee, { foreignKey: 'reportsTo', as: 'reportingEmployees' }); // Self-referential inverse
  Attendance.hasMany(Employee, { foreignKey: 'employeeNumber', sourceKey: 'employeeNumber', as: 'employees' });
  HolidayPlan.hasMany(Holiday, { foreignKey: 'holidayPlanId', as: 'holidays', onDelete: 'CASCADE' });
  Employee.hasMany(Leave, { foreignKey: 'employeeNumber', sourceKey: 'employeeNumber', as: 'leaves' });
  LeaveType.hasMany(Leave, { foreignKey: 'leaveTypeId', as: 'leaves' });
  Employee.hasMany(LeaveAllocation, { foreignKey: 'employeeNumber', sourceKey: 'employeeNumber', as: 'leaveAllocations' });
  LeaveType.hasMany(LeaveAllocation, { foreignKey: 'leaveTypeId', as: 'leaveAllocations' });
  Employee.hasMany(Punch, { foreignKey: 'employeeNumber', sourceKey: 'employeeNumber', as: 'punches' });
  BiometricDevice.hasMany(Punch, { foreignKey: 'deviceIp', as: 'punches' });

  // Existing belongsTo for Punch and others
  Punch.belongsTo(Employee, { foreignKey: 'employeeNumber', targetKey: 'employeeNumber', as: 'employee' });
  Punch.belongsTo(BiometricDevice, { foreignKey: 'deviceIp', as: 'biometricDevice' });
};

module.exports = defineAssociations;