import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import API from "../api";
import { useAuth } from "../auth/AuthContext";
import MasterTable from "../components/common/MasterTable";
import Select from "../components/ui/Select";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

const normalizeRole = (role) => String(role || "").replace(/\s+/g, "").toLowerCase();

export default function SalaryAssignmentMaster({ userRole, selectedCompanyId }) {
  const { user } = useAuth();
  const isSuperAdmin = normalizeRole(userRole || user?.role) === "superadmin";

  const companyId = selectedCompanyId || user?.companyId || user?.company?.companyId || "";
  const currentUserId = user?.userId ?? user?.id ?? null;

  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [grades, setGrades] = useState([]);
  const [earningComponents, setEarningComponents] = useState([]);
  const [deductionComponents, setDeductionComponents] = useState([]);

  const [filters, setFilters] = useState({
    departmentId: "",
    designationId: "",
    employeeGradeId: "",
    status: "Active",
  });

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [activeSalaryMaster, setActiveSalaryMaster] = useState(null);
  const [assignedMap, setAssignedMap] = useState({});
  const [inputMap, setInputMap] = useState({});
  const [savingComponentId, setSavingComponentId] = useState(null);
  const [loadingAssignment, setLoadingAssignment] = useState(false);

  const hasCompanyScope = isSuperAdmin || Boolean(companyId);

  const fetchMeta = async () => {
    if (!companyId) return;

    try {
      const [deptRes, desigRes, gradeRes, componentRes] = await Promise.all([
        API.get("/departments", { params: { companyId } }),
        API.get("/designations", { params: { companyId } }),
        API.get("/employeeGrades", { params: { companyId } }),
        API.get("/salaryComponents", { params: { companyId } }),
      ]);

      const activeOnly = (arr) => (Array.isArray(arr) ? arr : []).filter(
        (item) => String(item?.status || "Active").toLowerCase() === "active"
      );

      setDepartments(activeOnly(deptRes.data));
      setDesignations(activeOnly(desigRes.data));
      setGrades(activeOnly(gradeRes.data));

      const components = activeOnly(componentRes.data);
      setEarningComponents(components.filter((c) => c.type === "Earning"));
      setDeductionComponents(components.filter((c) => c.type === "Deduction"));
    } catch (error) {
      toast.error("Failed to load salary assignment metadata");
    }
  };

  const fetchEmployees = async () => {
    if (!companyId) return;

    try {
      const params = {
        companyId,
        status: filters.status,
      };
      if (filters.departmentId) params.departmentId = filters.departmentId;
      if (filters.designationId) params.designationId = filters.designationId;
      if (filters.employeeGradeId) params.employeeGradeId = filters.employeeGradeId;

      const res = await API.get("/employees", { params });
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error("Failed to load employees");
    }
  };

  const loadEmployeeAssignment = async (employee) => {
    if (!employee?.staffId || !companyId) return;

    setLoadingAssignment(true);
    setSelectedEmployee(employee);
    setActiveSalaryMaster(null);
    setAssignedMap({});

    try {
      const res = await API.get("/employeeSalaryMasters", {
        params: {
          staffId: employee.staffId,
          companyId,
          status: "Active",
          includeComponents: true,
        },
      });

      const masters = Array.isArray(res.data) ? res.data : [];
      const currentMaster = masters[0] || null;
      setActiveSalaryMaster(currentMaster);

      const map = {};
      const components = Array.isArray(currentMaster?.components) ? currentMaster.components : [];
      components.forEach((c) => {
        if (c.componentType === "Earning") {
          map[c.componentId] = c;
        }
      });
      setAssignedMap(map);

      setInputMap((prev) => {
        const next = { ...prev };
        Object.keys(map).forEach((componentId) => {
          next[componentId] = String(map[componentId]?.fixedAmount ?? "");
        });
        return next;
      });
    } catch (error) {
      toast.error("Failed to load employee salary assignment");
    } finally {
      setLoadingAssignment(false);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, [companyId]);

  useEffect(() => {
    fetchEmployees();
  }, [companyId, filters.departmentId, filters.designationId, filters.employeeGradeId, filters.status]);

  const filteredEmployees = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return employees;

    return employees.filter((emp) => {
      const name = `${emp.firstName || ""} ${emp.lastName || ""}`.trim().toLowerCase();
      return (
        name.includes(q) ||
        String(emp.staffId || "").toLowerCase().includes(q) ||
        String(emp.staffNumber || "").toLowerCase().includes(q)
      );
    });
  }, [employees, search]);

  const saveComponentAmount = async (component) => {
    if (!selectedEmployee?.staffId) return toast.error("Select an employee");

    const rawValue = String(inputMap[component.salaryComponentId] ?? "").trim();
    if (!rawValue) return toast.error("Enter amount");

    const amount = Number.parseFloat(rawValue);
    if (!Number.isFinite(amount) || amount < 0) {
      return toast.error("Amount must be a non-negative number");
    }

    try {
      setSavingComponentId(component.salaryComponentId);
      await API.post("/employeeSalaryMasters/assign-earning-component", {
        staffId: selectedEmployee.staffId,
        companyId,
        componentId: component.salaryComponentId,
        fixedAmount: amount,
        updatedBy: currentUserId,
        createdBy: currentUserId,
      });

      toast.success(`${component.name} assigned`);
      await loadEmployeeAssignment(selectedEmployee);
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Failed to assign component";
      toast.error(String(message));
    } finally {
      setSavingComponentId(null);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 px-6">
      <div className="bg-white border rounded-lg p-4">
        <Input
          label="Search Employee"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name / staff ID / staff number"
        />
      </div>

      {!hasCompanyScope && (
        <div className="border border-amber-200 bg-amber-50 text-amber-800 rounded-lg p-4 text-sm">
          Select a company before using salary assignment.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white border rounded-lg p-4">
        <Select
          label="Department"
          value={filters.departmentId}
          onChange={(e) => setFilters((prev) => ({ ...prev, departmentId: e.target.value }))}
          options={[{ value: "", label: "All" }, ...departments.map((d) => ({ value: d.departmentId, label: d.departmentName }))]}
        />
        <Select
          label="Designation"
          value={filters.designationId}
          onChange={(e) => setFilters((prev) => ({ ...prev, designationId: e.target.value }))}
          options={[{ value: "", label: "All" }, ...designations.map((d) => ({ value: d.designationId, label: d.designationName }))]}
        />
        <Select
          label="Grade"
          value={filters.employeeGradeId}
          onChange={(e) => setFilters((prev) => ({ ...prev, employeeGradeId: e.target.value }))}
          options={[{ value: "", label: "All" }, ...grades.map((g) => ({ value: g.employeeGradeId, label: g.employeeGradeName }))]}
        />
        <Select
          label="Status"
          value={filters.status}
          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          options={[{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border rounded-lg overflow-hidden">
          <MasterTable columns={["Staff ID", "Employee", "Department", "Designation"]}>
            {filteredEmployees.map((emp) => {
              const isSelected = String(selectedEmployee?.staffId || "") === String(emp.staffId);
              return (
                <tr
                  key={emp.staffId}
                  className={`border-t cursor-pointer ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                  onClick={() => loadEmployeeAssignment(emp)}
                >
                  <td className="py-3 px-4">{emp.staffId}</td>
                  <td className="py-3 px-4">{`${emp.firstName || ""} ${emp.lastName || ""}`.trim()}</td>
                  <td className="py-3 px-4">{emp.department?.departmentName || "-"}</td>
                  <td className="py-3 px-4">{emp.designation?.designationName || "-"}</td>
                </tr>
              );
            })}
            {filteredEmployees.length === 0 && (
              <tr>
                <td className="py-4 px-4 text-center text-gray-500" colSpan={4}>
                  No employees found
                </td>
              </tr>
            )}
          </MasterTable>
        </div>

        <div className="bg-white border rounded-lg p-4 space-y-4">
          {!selectedEmployee && <p className="text-sm text-gray-600">Select an employee to assign earnings.</p>}

          {selectedEmployee && (
            <>
              <div className="border rounded-lg p-3 bg-gray-50">
                <div className="font-semibold text-gray-900">
                  {`${selectedEmployee.firstName || ""} ${selectedEmployee.lastName || ""}`.trim()}
                </div>
                <div className="text-sm text-gray-600">
                  Staff ID: {selectedEmployee.staffId} | Dept: {selectedEmployee.department?.departmentName || "-"} | Desig: {selectedEmployee.designation?.designationName || "-"}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Active Salary Master: {activeSalaryMaster?.employeeSalaryMasterId || "Not created yet"}
                </div>
              </div>

              {loadingAssignment && <p className="text-sm text-gray-500">Loading assignment...</p>}

              {!loadingAssignment && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">Earning Components (Fixed per employee)</h3>
                  {earningComponents.map((component) => (
                    <div key={component.salaryComponentId} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{component.name}</p>
                          <p className="text-xs text-gray-500">{component.code}</p>
                        </div>
                        <p className="text-xs text-gray-500">Current: {assignedMap[component.salaryComponentId]?.fixedAmount ?? "-"}</p>
                      </div>

                      <div className="flex items-end gap-2">
                        <Input
                          label="Amount"
                          type="number"
                          min={0}
                          step="0.01"
                          value={inputMap[component.salaryComponentId] ?? ""}
                          onChange={(e) =>
                            setInputMap((prev) => ({
                              ...prev,
                              [component.salaryComponentId]: e.target.value,
                            }))
                          }
                          placeholder="0.00"
                        />
                        <Button
                          type="button"
                          onClick={() => saveComponentAmount(component)}
                          disabled={savingComponentId === component.salaryComponentId}
                        >
                          {savingComponentId === component.salaryComponentId ? "Saving..." : "Assign"}
                        </Button>
                      </div>
                    </div>
                  ))}

                  {earningComponents.length === 0 && (
                    <p className="text-sm text-gray-500">No earning components found for this company.</p>
                  )}

                  <h3 className="text-sm font-semibold text-gray-700 pt-2">Deduction Components (Formula only)</h3>
                  {deductionComponents.map((component) => (
                    <div key={component.salaryComponentId} className="border rounded-lg p-3 bg-gray-50">
                      <p className="font-medium text-gray-900">{component.name} ({component.code})</p>
                      <p className="text-xs text-gray-600 break-words mt-1">{component.formula || "No formula"}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
