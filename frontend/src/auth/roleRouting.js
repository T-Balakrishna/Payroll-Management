const normalizeRoleKey = (value) => String(value || "").toLowerCase().replace(/[\s_-]/g, "");

const ADMIN_ROLE_KEYS = new Set(["admin", "superadmin", "departmentadmin"]);
const EMPLOYEE_ROLE_KEYS = new Set([
  "user",
  "staff",
  "employee",
  "teachingstaff",
  "nonteachingstaff",
  "student",
]);

const getDashboardRouteForRole = (role) => {
  const roleKey = normalizeRoleKey(role);
  if (ADMIN_ROLE_KEYS.has(roleKey)) return "/adminDashboard";
  if (EMPLOYEE_ROLE_KEYS.has(roleKey)) return "/employeeDashboard";
  return null;
};

export { normalizeRoleKey, ADMIN_ROLE_KEYS, EMPLOYEE_ROLE_KEYS, getDashboardRouteForRole };
