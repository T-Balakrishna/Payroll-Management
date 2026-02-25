import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronDown, Pencil, Save, Search, Trash2, Users, X } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import API from "../api";
import { useAuth } from "../auth/AuthContext";

const normalizeRole = (role) => String(role || "").replace(/\s+/g, "").toLowerCase();
const normalizeLookupKey = (value) => String(value || "").trim().toLowerCase();
const HIDDEN_ROLE_KEYS = new Set(["admin", "superadmin"]);
const getEmployeeUserNumber = (emp) =>
  normalizeLookupKey(emp?.staffNumber || emp?.user?.userNumber || emp?.userNumber || "");

const getEmployeeCompanyId = (employee) =>
  employee?.companyId ??
  employee?.company?.companyId ??
  employee?.department?.companyId ??
  employee?.Department?.companyId ??
  null;

const getEmployeeDepartmentId = (employee) =>
  employee?.departmentId ?? employee?.department?.departmentId ?? employee?.Department?.departmentId ?? null;

const getEmployeeName = (employee) =>
  [employee?.firstName, employee?.lastName].filter(Boolean).join(" ") || employee?.staffNumber || "Unnamed";

const getShiftName = (shiftTypeId, shiftTypes) =>
  shiftTypes.find((s) => String(s.shiftTypeId) === String(shiftTypeId))?.name || "--No Shift--";

const getPersistedShiftTypeId = (staffId, existingAssignments, employees) => {
  const fromAssignment = existingAssignments[String(staffId)]?.shiftTypeId;
  if (fromAssignment) return Number(fromAssignment);

  const employee = employees.find((e) => String(e.staffId) === String(staffId));
  return employee?.shiftTypeId ? Number(employee.shiftTypeId) : "";
};

const getExperienceYears = (dateOfJoining) => {
  const raw = String(dateOfJoining || "").trim();
  if (!raw) return null;
  const doj = new Date(raw);
  if (Number.isNaN(doj.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - doj.getFullYear();
  const m = now.getMonth() - doj.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < doj.getDate())) years -= 1;
  return Math.max(0, years);
};

const matchesExperienceBand = (years, band) => {
  if (!band) return true;
  if (years === null) return false;
  if (band === "lt1") return years < 1;
  if (band === "1to3") return years >= 1 && years <= 3;
  if (band === "3to5") return years >= 3 && years <= 5;
  if (band === "5plus") return years >= 5;
  return true;
};

export default function ShiftAssignmentMaster({ userRole, selectedCompanyId, selectedCompanyName }) {
  const { user } = useAuth();
  const isSuperAdmin = normalizeRole(userRole || user?.role) === "superadmin";
  const currentUserId = user?.userId ?? user?.id ?? null;

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shiftTypes, setShiftTypes] = useState([]);
  const [grades, setGrades] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedEmps, setSelectedEmps] = useState([]);
  const [allocatedShifts, setAllocatedShifts] = useState({});
  const [existingAssignments, setExistingAssignments] = useState({});
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [bulkShiftTypeId, setBulkShiftTypeId] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("");
  const [status] = useState("Active");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    setSelectedDepts([]);
    setSelectedEmps([]);
    setAllocatedShifts({});
    setExistingAssignments({});
    setBulkShiftTypeId("");
    setRoleFilter("");
    setGradeFilter("");
    setDesignationFilter("");
    setExperienceFilter("");
    setSearch("");
  }, [selectedCompanyId]);

  const fetchLookups = useCallback(async () => {
    const [deptResult, employeeResult, shiftTypeResult, gradeResult, designationResult, roleResult, userResult] = await Promise.allSettled([
      API.get("/departments", {
        params: selectedCompanyId ? { companyId: selectedCompanyId } : {},
      }),
      API.get("/employees"),
      API.get("/shiftTypes", {
        params: selectedCompanyId ? { companyId: selectedCompanyId } : {},
      }),
      API.get("/employeeGrades", {
        params: selectedCompanyId ? { companyId: selectedCompanyId } : {},
      }),
      API.get("/designations", {
        params: selectedCompanyId ? { companyId: selectedCompanyId } : {},
      }),
      API.get("/roles"),
      API.get("/users"),
    ]);

    if (deptResult.status === "fulfilled") setDepartments(deptResult.value.data || []);
    if (employeeResult.status === "fulfilled") {
      setEmployees(employeeResult.value.data || []);
    } else {
      console.error("Error fetching employees:", employeeResult.reason);
      toast.error("Could not load employees");
      setEmployees([]);
    }
    if (shiftTypeResult.status === "fulfilled") {
      const data = shiftTypeResult.value.data || [];
      const filtered = selectedCompanyId
        ? data.filter((s) => String(s.companyId) === String(selectedCompanyId))
        : data;
      setShiftTypes(filtered);
    }
    if (gradeResult.status === "fulfilled") {
      setGrades(gradeResult.value.data || []);
    }
    if (designationResult.status === "fulfilled") {
      setDesignations(designationResult.value.data || []);
    }
    if (roleResult.status === "fulfilled") {
      setRoles(roleResult.value.data || []);
    }
    if (userResult.status === "fulfilled") {
      setUsers(userResult.value.data || []);
    }
  }, [selectedCompanyId]);

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await API.get("/shiftAssignments", {
        params: {
          ...(selectedCompanyId ? { companyId: selectedCompanyId } : {}),
        },
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setAssignments(data);
    } catch (err) {
      console.error("Error fetching shift assignments:", err);
      toast.error("Could not load shift assignments");
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  useEffect(() => {
    const next = {};
    assignments.forEach((a) => {
      next[String(a.staffId)] = a;
    });
    setExistingAssignments(next);
  }, [assignments]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDeptDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const availableEmployees = useMemo(() => {
    const byCompany = selectedCompanyId
      ? employees.filter((emp) => {
          const employeeCompanyId = getEmployeeCompanyId(emp);
          if (!employeeCompanyId) return true;
          return String(employeeCompanyId) === String(selectedCompanyId);
        })
      : employees;

    const activeOnly = byCompany.filter((emp) => {
      const statusValue = String(emp.status || emp.employmentStatus || "").toLowerCase();
      return !statusValue || statusValue === "active";
    });

    const selectedDeptSet = new Set(selectedDepts.map((id) => String(id)));
    const byDept =
      selectedDeptSet.size > 0
        ? activeOnly.filter((emp) => selectedDeptSet.has(String(getEmployeeDepartmentId(emp))))
        : activeOnly;

    return byDept;
  }, [employees, selectedCompanyId, selectedDepts]);

  const roleNameById = useMemo(
    () => new Map((roles || []).map((r) => [String(r.roleId || ""), String(r.roleName || "")])),
    [roles]
  );

  const roleMap = useMemo(() => {
    const entries = [];
    users.forEach((u) => {
      const roleName = String(u.role?.roleName || roleNameById.get(String(u.roleId || "")) || "").trim();
      if (!roleName) return;
      if (HIDDEN_ROLE_KEYS.has(normalizeRole(roleName))) return;
      const key = normalizeLookupKey(u.userNumber);
      if (!key) return;
      entries.push([key, roleName]);
    });
    return new Map(entries);
  }, [users, roleNameById]);

  const getEmployeeRoleName = useCallback(
    (emp) => {
      const directRole = String(emp?.user?.role?.roleName || roleNameById.get(String(emp?.user?.roleId || "")) || "").trim();
      if (directRole && !HIDDEN_ROLE_KEYS.has(normalizeRole(directRole))) return directRole;
      const fromMap = roleMap.get(getEmployeeUserNumber(emp)) || "";
      if (fromMap && !HIDDEN_ROLE_KEYS.has(normalizeRole(fromMap))) return fromMap;
      return "";
    },
    [roleMap, roleNameById]
  );

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return availableEmployees.filter((emp) => {
      const roleName = getEmployeeRoleName(emp);
      const experienceYears = getExperienceYears(emp.dateOfJoining);
      const gradeOk = !gradeFilter || String(emp.employeeGradeId || "") === String(gradeFilter);
      const designationOk =
        !designationFilter || String(emp.designationId || "") === String(designationFilter);
      const roleOk = !roleFilter || roleName === roleFilter;
      const experienceOk = matchesExperienceBand(experienceYears, experienceFilter);
      if (!gradeOk || !designationOk || !roleOk || !experienceOk) return false;
      if (!q) return true;
      const name = getEmployeeName(emp).toLowerCase();
      const number = String(emp.staffNumber || emp.staffId || "").toLowerCase();
      return name.includes(q) || number.includes(q);
    });
  }, [availableEmployees, designationFilter, experienceFilter, getEmployeeRoleName, gradeFilter, roleFilter, search]);

  const roleOptions = useMemo(() => {
    const fromRoles = (roles || [])
      .filter((r) => String(r.status || "").toLowerCase() !== "inactive")
      .map((r) => String(r.roleName || "").trim())
      .filter((name) => name && !HIDDEN_ROLE_KEYS.has(normalizeRole(name)));
    if (fromRoles.length > 0) {
      return [...new Set(fromRoles)].sort((a, b) => a.localeCompare(b));
    }

    const values = new Set();
    availableEmployees.forEach((emp) => {
      const roleName = getEmployeeRoleName(emp);
      if (roleName) values.add(roleName);
    });
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [availableEmployees, getEmployeeRoleName, roles]);

  const sortedEmployees = useMemo(() => {
    return [...filteredEmployees].sort((a, b) => {
      const aSel = selectedEmps.includes(a.staffId);
      const bSel = selectedEmps.includes(b.staffId);
      return Number(bSel) - Number(aSel);
    });
  }, [filteredEmployees, selectedEmps]);

  const toggleDept = (deptId) => {
    setSelectedDepts((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const toggleEmp = (staffId) => {
    if (selectedEmps.includes(staffId)) {
      setSelectedEmps((prev) => prev.filter((id) => id !== staffId));
      setAllocatedShifts((prev) => {
        const copy = { ...prev };
        delete copy[staffId];
        return copy;
      });
      return;
    }

    setSelectedEmps((prev) => [...prev, staffId]);
    setAllocatedShifts((prev) => ({
      ...prev,
      [staffId]: getPersistedShiftTypeId(staffId, existingAssignments, employees),
    }));
  };

  const applyBulkShifts = () => {
    if (!bulkShiftTypeId) return;
    if (selectedEmps.length === 0) return;
    const updates = {};
    selectedEmps.forEach((staffId) => {
      updates[staffId] = bulkShiftTypeId ? Number(bulkShiftTypeId) : "";
    });
    setAllocatedShifts((prev) => ({ ...prev, ...updates }));
  };

  const upsertAssignment = async (staffId) => {
    const shiftTypeId = allocatedShifts[staffId];
    if (!shiftTypeId) throw new Error("Shift type is required");

    const employee = employees.find((e) => String(e.staffId) === String(staffId));
    const effectiveCompanyId = Number(selectedCompanyId || getEmployeeCompanyId(employee) || 0);
    if (!effectiveCompanyId) throw new Error("Company is required for assignment");

    const existing = existingAssignments[String(staffId)];
    const payload = {
      staffId: Number(staffId),
      shiftTypeId: Number(shiftTypeId),
      isRecurring: false,
      startDate: null,
      endDate: null,
      recurringPattern: null,
      recurringDays: null,
      status: status || "Active",
      notes: notes.trim() || null,
      companyId: effectiveCompanyId,
      createdBy: existing?.createdBy || currentUserId,
      updatedBy: currentUserId,
    };

    if (existing?.shiftAssignmentId) {
      await API.put(`/shiftAssignments/${existing.shiftAssignmentId}`, payload);
      return;
    }
    await API.post("/shiftAssignments", payload);
  };

  const handleIndividualSave = async (staffId) => {
    if (isSuperAdmin && !selectedCompanyId) {
      Swal.fire("Warning", "Please select a company first", "warning");
      return;
    }

    try {
      await upsertAssignment(staffId);
      await fetchAssignments();
      Swal.fire("Saved", "Shift assignment saved", "success");
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Failed to save assignment";
      Swal.fire("Error", String(msg), "error");
    }
  };

  const handleSaveAll = async () => {
    if (isSuperAdmin && !selectedCompanyId) {
      Swal.fire("Warning", "Please select a company first", "warning");
      return;
    }
    if (selectedEmps.length === 0) {
      Swal.fire("Warning", "Please select employees", "warning");
      return;
    }

    const validStaffIds = selectedEmps.filter((staffId) => Boolean(allocatedShifts[staffId]));
    if (validStaffIds.length === 0) {
      Swal.fire("Warning", "No valid shift allocations to save", "warning");
      return;
    }

    const results = await Promise.allSettled(validStaffIds.map((staffId) => upsertAssignment(staffId)));
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failCount = results.length - successCount;

    await fetchAssignments();

    if (failCount === 0) {
      Swal.fire("Saved", `Shift assignments saved for ${successCount} employee(s)`, "success");
      return;
    }

    Swal.fire("Partial Success", `Saved: ${successCount}, Failed: ${failCount}`, "warning");
  };

  const handleRemoveSelection = (staffId) => {
    setSelectedEmps((prev) => prev.filter((id) => id !== staffId));
    setAllocatedShifts((prev) => {
      const copy = { ...prev };
      delete copy[staffId];
      return copy;
    });
  };

  const visibleDepartments = useMemo(() => {
    return selectedCompanyId
      ? departments.filter((d) => String(d.companyId) === String(selectedCompanyId))
      : departments;
  }, [departments, selectedCompanyId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-[96rem] mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Notes (Optional)</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes for selected allocations"
                className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none bg-white"
              >
                <option value="">All Roles</option>
                {roleOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Grade</label>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none bg-white"
              >
                <option value="">All Grades</option>
                {grades.map((g) => (
                  <option key={g.employeeGradeId} value={g.employeeGradeId}>
                    {g.employeeGradeName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Designation</label>
              <select
                value={designationFilter}
                onChange={(e) => setDesignationFilter(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none bg-white"
              >
                <option value="">All Designations</option>
                {designations.map((d) => (
                  <option key={d.designationId} value={d.designationId}>
                    {d.designationName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Experience</label>
              <select
                value={experienceFilter}
                onChange={(e) => setExperienceFilter(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none bg-white"
              >
                <option value="">All Experience</option>
                <option value="lt1">Below 1 Year</option>
                <option value="1to3">1 to 3 Years</option>
                <option value="3to5">3 to 5 Years</option>
                <option value="5plus">5+ Years</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <Users size={18} />
              Select Departments
            </label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                className="w-full bg-white border-2 border-slate-200 rounded-lg p-3 cursor-pointer flex justify-between items-center hover:border-indigo-400 transition-colors"
                onClick={() => setShowDeptDropdown((prev) => !prev)}
              >
                <span className="text-slate-700 font-medium">
                  {selectedDepts.length > 0
                    ? `${selectedDepts.length} department${selectedDepts.length > 1 ? "s" : ""} selected`
                    : "Choose departments to view employees"}
                </span>
                <ChevronDown
                  className={`text-slate-400 transition-transform ${showDeptDropdown ? "rotate-180" : ""}`}
                  size={20}
                />
              </button>

              {showDeptDropdown && (
                <div className="absolute bg-white border-2 border-slate-200 rounded-lg mt-2 w-full max-h-64 overflow-y-auto z-20 shadow-xl">
                  <div className="sticky top-0 bg-slate-50 p-3 border-b-2 border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                        checked={
                          selectedDepts.length === visibleDepartments.length && visibleDepartments.length > 0
                        }
                        onChange={() =>
                          setSelectedDepts(
                            selectedDepts.length === visibleDepartments.length
                              ? []
                              : visibleDepartments.map((d) => d.departmentId)
                          )
                        }
                      />
                      <span className="font-semibold text-slate-700">Select All Departments</span>
                    </label>
                  </div>
                  {visibleDepartments.map((dept) => (
                    <div key={dept.departmentId} className="p-3 hover:bg-slate-50 transition-colors">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                          checked={selectedDepts.includes(dept.departmentId)}
                          onChange={() => toggleDept(dept.departmentId)}
                        />
                        <span className="text-slate-700">{dept.departmentName}</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedDepts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedDepts.map((deptId) => {
                  const dept = visibleDepartments.find((d) => Number(d.departmentId) === Number(deptId));
                  return (
                    <span
                      key={deptId}
                      className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {dept?.departmentName}
                      <button
                        type="button"
                        onClick={() => toggleDept(deptId)}
                        className="hover:bg-indigo-200 rounded-full p-0.5"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name or staff number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-400 focus:outline-none transition-colors"
                />
              </div>

              {selectedEmps.length > 0 && (
                <div className="flex gap-3 items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">Bulk Assign:</span>
                  <select
                    value={bulkShiftTypeId}
                    onChange={(e) => setBulkShiftTypeId(e.target.value)}
                    className="border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none bg-white"
                  >
                    <option value="">Select Shift Type</option>
                    {shiftTypes.map((shift) => (
                      <option key={shift.shiftTypeId} value={shift.shiftTypeId}>
                        {shift.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={applyBulkShifts}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
                  >
                    Apply to All
                  </button>
                </div>
              )}
            </div>

            {selectedEmps.length > 0 && (
              <div className="mt-3 text-sm text-slate-600 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100">
                <span className="font-semibold">{selectedEmps.length}</span> employee
                {selectedEmps.length > 1 ? "s" : ""} selected
              </div>
            )}
          </div>

          <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <div className="max-h-[70vh] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="p-4 text-left border-b-2 border-slate-200">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                          checked={selectedEmps.length === sortedEmployees.length && sortedEmployees.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const allIds = sortedEmployees.map((emp) => emp.staffId);
                              setSelectedEmps(allIds);
                              const mapped = {};
                              allIds.forEach((staffId) => {
                                mapped[staffId] = getPersistedShiftTypeId(
                                  staffId,
                                  existingAssignments,
                                  employees
                                );
                              });
                              setAllocatedShifts(mapped);
                              return;
                            }
                            setSelectedEmps([]);
                            setAllocatedShifts({});
                          }}
                        />
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-200">
                        Employee
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-200">
                        Staff Number
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-200">
                        Shift Type
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-200">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {sortedEmployees.map((emp) => {
                      const staffId = emp.staffId;
                      const isSelected = selectedEmps.includes(staffId);
                      const currentShiftId =
                        allocatedShifts[staffId] ||
                        getPersistedShiftTypeId(staffId, existingAssignments, employees) ||
                        "";

                      return (
                        <tr
                          key={staffId}
                          className={`hover:bg-slate-50 transition-colors ${isSelected ? "bg-indigo-50" : ""}`}
                        >
                          <td className="p-4">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                              checked={isSelected}
                              onChange={() => toggleEmp(staffId)}
                            />
                          </td>
                          <td className="p-4 text-slate-700 font-medium">{getEmployeeName(emp)}</td>
                          <td className="p-4 text-slate-600">{emp.staffNumber || `EMP-${staffId}`}</td>
                          <td className="p-4">
                            <select
                              value={currentShiftId}
                              onChange={(e) =>
                                setAllocatedShifts((prev) => ({
                                  ...prev,
                                  [staffId]: e.target.value ? Number(e.target.value) : "",
                                }))
                              }
                              disabled={!isSelected}
                              className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                            >
                              <option value="">--Select Shift Type--</option>
                              {shiftTypes.map((s) => (
                                <option key={s.shiftTypeId} value={s.shiftTypeId}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                            {!isSelected && currentShiftId && (
                              <span className="text-xs text-slate-500 block mt-1">
                                Current: {getShiftName(currentShiftId, shiftTypes)}
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                onClick={() => {
                                  if (!isSelected) toggleEmp(staffId);
                                }}
                                disabled={isSelected}
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                                onClick={() => handleRemoveSelection(staffId)}
                                title="Remove"
                              >
                                <Trash2 size={16} />
                              </button>
                              {isSelected && currentShiftId && (
                                <button
                                  type="button"
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors"
                                  onClick={() => handleIndividualSave(staffId)}
                                  title="Save Individual"
                                >
                                  <Save size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {sortedEmployees.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center p-8 text-slate-500">
                          <div className="flex flex-col items-center gap-2">
                            <Users size={48} className="text-slate-300" />
                            <p className="font-medium">
                              {search
                                ? "No employees found matching your search."
                                : "No employees found. Select departments first."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {selectedEmps.length > 0 && (
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-slate-600">
                Ready to save allocations for {selectedEmps.length} employee
                {selectedEmps.length > 1 ? "s" : ""}
              </div>
              <button
                type="button"
                onClick={handleSaveAll}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold shadow-sm hover:shadow transition-all flex items-center gap-2"
              >
                <Save size={20} />
                Save All Allocations
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
