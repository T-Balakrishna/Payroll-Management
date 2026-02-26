import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { HandCoins, Pencil } from "lucide-react";
import API from "../api";
import { useAuth } from "../auth/AuthContext";
import MasterTable from "../components/common/MasterTable";
import Select from "../components/ui/Select";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";

const normalizeRole = (role) => String(role || "").replace(/\s+/g, "").toLowerCase();
const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const STAFF_ROLE_KEYS = new Set(["teachingstaff", "nonteachingstaff"]);
const normalizeRoleName = (value) => String(value || "").toLowerCase().replace(/[\s-]/g, "");
const todayDateString = () => new Date().toISOString().slice(0, 10);
const monthRangeFromDate = (value) => {
  const base = new Date(value || new Date());
  if (Number.isNaN(base.getTime())) {
    const today = todayDateString();
    return { start: today, end: today };
  }
  const year = base.getFullYear();
  const month = base.getMonth();
  const start = new Date(year, month, 1).toISOString().slice(0, 10);
  const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  return { start, end };
};

const parseCsvLine = (line) => {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values.map((v) => v.replace(/^"(.*)"$/, "$1").trim());
};

const parseCsvText = (text) => {
  const lines = String(text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((acc, key, idx) => {
      acc[key] = values[idx] ?? "";
      return acc;
    }, {});
  });
};

const parseJsonObject = (value) => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
};

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
  const [deductionAssignedMap, setDeductionAssignedMap] = useState({});
  const [inputMap, setInputMap] = useState({});
  const [amountBasisMap, setAmountBasisMap] = useState({});
  const [savingAllFixed, setSavingAllFixed] = useState(false);
  const [loadingAssignment, setLoadingAssignment] = useState(false);
  const [autoSyncingFormulas, setAutoSyncingFormulas] = useState(false);
  const [formulaDate, setFormulaDate] = useState(todayDateString);
  const [formulaDebugContext, setFormulaDebugContext] = useState(null);
  const fileInputRef = useRef(null);

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
      const allEmployees = Array.isArray(res.data) ? res.data : [];
      const salaryAssignableEmployees = allEmployees.filter((emp) => {
        const employeeRole = normalizeRoleName(emp?.role?.roleName);
        const userRole = normalizeRoleName(emp?.user?.role?.roleName);
        const effectiveRole = employeeRole || userRole;
        return STAFF_ROLE_KEYS.has(effectiveRole);
      });
      setEmployees(salaryAssignableEmployees);
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
    setDeductionAssignedMap({});
    setFormulaDebugContext(null);

    try {
      setAutoSyncingFormulas(true);
      const { start: payPeriodStart, end: payPeriodEnd } = monthRangeFromDate(formulaDate);
      const syncRes = await API.post("/employeeSalaryMasters/sync-formula-components", {
        staffId: employee.staffId,
        companyId,
        formulaDate,
        payPeriodStart,
        payPeriodEnd,
        updatedBy: currentUserId,
        createdBy: currentUserId,
      });
      setFormulaDebugContext(syncRes?.data?.formulaContext || null);

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
      const deductionMap = {};
      const components = Array.isArray(currentMaster?.components) ? currentMaster.components : [];
      components.forEach((c) => {
        if (c.componentType === "Earning") {
          map[c.componentId] = c;
        } else if (c.componentType === "Deduction") {
          deductionMap[c.componentId] = c;
        }
      });
      setAssignedMap(map);
      setDeductionAssignedMap(deductionMap);

      setInputMap((prev) => {
        const next = { ...prev };
        Object.keys(map).forEach((componentId) => {
          next[componentId] = String(map[componentId]?.fixedAmount ?? "");
        });
        return next;
      });

      setAmountBasisMap((prev) => {
        const next = { ...prev };
        Object.keys(map).forEach((componentId) => {
          const meta = parseJsonObject(map[componentId]?.remarks);
          const basis = String(meta.amountBasis || "").toLowerCase() === "daily" ? "daily" : "monthly";
          next[componentId] = basis;
        });
        return next;
      });
    } catch (error) {
      toast.error("Failed to load employee salary assignment");
    } finally {
      setAutoSyncingFormulas(false);
      setLoadingAssignment(false);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, [companyId]);

  useEffect(() => {
    fetchEmployees();
  }, [companyId, filters.departmentId, filters.designationId, filters.employeeGradeId, filters.status]);

  useEffect(() => {
    if (!selectedEmployee?.staffId) return;
    loadEmployeeAssignment(selectedEmployee);
  }, [formulaDate]);

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

  const grossSalary = useMemo(() => {
    const fromMaster =
      activeSalaryMaster?.grossSalary ??
      activeSalaryMaster?.totalEarnings;
    if (Number.isFinite(Number(fromMaster))) return Number(fromMaster);
    return Object.values(assignedMap).reduce(
      (sum, item) => sum + toNumber(item?.calculatedAmount ?? item?.fixedAmount),
      0
    );
  }, [activeSalaryMaster, assignedMap]);

  const totalDeductions = useMemo(() => {
    const fromMaster = activeSalaryMaster?.totalDeductions;
    if (Number.isFinite(Number(fromMaster))) return Number(fromMaster);
    return Object.values(deductionAssignedMap).reduce(
      (sum, item) => sum + toNumber(item?.calculatedAmount),
      0
    );
  }, [activeSalaryMaster, deductionAssignedMap]);

  const netSalary = useMemo(() => {
    const fromMaster = activeSalaryMaster?.netSalary;
    if (Number.isFinite(Number(fromMaster))) return Number(fromMaster);
    return grossSalary - totalDeductions;
  }, [activeSalaryMaster, grossSalary, totalDeductions]);

  const fixedEarningComponents = useMemo(
    () => earningComponents.filter((c) => String(c.calculationType || "").toLowerCase() !== "formula"),
    [earningComponents]
  );

  const saveAllFixedComponents = async () => {
    if (!selectedEmployee?.staffId) return toast.error("Select an employee");

    try {
      setSavingAllFixed(true);
      const payloads = fixedEarningComponents.map((component) => {
        const rawValue = String(inputMap[component.salaryComponentId] ?? "").trim();
        const amount = rawValue === "" ? 0 : Number.parseFloat(rawValue);
        const safeAmount = Number.isFinite(amount) && amount >= 0 ? amount : 0;
        return {
          staffId: selectedEmployee.staffId,
          companyId,
          componentId: component.salaryComponentId,
          formulaDate,
          fixedAmount: safeAmount,
          amountBasis: String(amountBasisMap[component.salaryComponentId] || "monthly").toLowerCase() === "daily" ? "daily" : "monthly",
          updatedBy: currentUserId,
          createdBy: currentUserId,
        };
      });

      if (payloads.length === 0) {
        toast.info("No fixed components to assign");
        return;
      }

      const results = await Promise.allSettled(
        payloads.map((payload) => API.post("/employeeSalaryMasters/assign-earning-component", payload))
      );
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.length - successCount;
      if (successCount > 0) toast.success(`${successCount} components assigned`);
      if (failCount > 0) toast.warning(`${failCount} components failed to assign`);
      await loadEmployeeAssignment(selectedEmployee);
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Failed to assign components";
      toast.error(String(message));
    } finally {
      setSavingAllFixed(false);
    }
  };

  const closeAssignmentModal = () => {
    setSelectedEmployee(null);
    setActiveSalaryMaster(null);
    setAssignedMap({});
    setDeductionAssignedMap({});
    setAmountBasisMap({});
    setSavingAllFixed(false);
    setLoadingAssignment(false);
    setAutoSyncingFormulas(false);
    setFormulaDate(todayDateString());
    setFormulaDebugContext(null);
  };

  const handleBulkUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!companyId) {
      toast.error("Select a company before bulk upload");
      return;
    }

    try {
      const text = await file.text();
      const rows = parseCsvText(text);
      if (!rows.length) {
        toast.error("CSV file is empty or invalid");
        return;
      }

      const employeeByStaffId = new Map(employees.map((e) => [String(e.staffId), e]));
      const employeeByStaffNumber = new Map(employees.map((e) => [String(e.staffNumber || "").trim().toLowerCase(), e]));
      const componentByCode = new Map(earningComponents.map((c) => [String(c.code || "").trim().toUpperCase(), c]));
      const componentByName = new Map(earningComponents.map((c) => [String(c.name || "").trim().toLowerCase(), c]));

      const payloads = rows.map((row) => {
        const staffIdKey = String(row.staffId || "").trim();
        const staffNumberKey = String(row.staffNumber || "").trim().toLowerCase();
        const componentCodeKey = String(row.componentCode || "").trim().toUpperCase();
        const componentNameKey = String(row.componentName || "").trim().toLowerCase();

        const employee = employeeByStaffNumber.get(staffNumberKey) || employeeByStaffId.get(staffIdKey);
        const component = componentByCode.get(componentCodeKey) || componentByName.get(componentNameKey);
        if (!employee || !component) return null;

        const isFormula = String(component.calculationType || "").toLowerCase() === "formula";
        const fixedAmountRaw = String(row.fixedAmount ?? "").trim();
        const parsedFixedAmount = fixedAmountRaw === "" ? 0 : Number.parseFloat(fixedAmountRaw);
        const fixedAmount = Number.isFinite(parsedFixedAmount) && parsedFixedAmount >= 0 ? parsedFixedAmount : null;
        if (!isFormula && fixedAmount === null) return null;
        const amountBasis = String(row.amountBasis || "monthly").trim().toLowerCase() === "daily" ? "daily" : "monthly";

        return {
          staffId: employee.staffId,
          companyId,
          componentId: component.salaryComponentId,
          formulaDate: String(formulaDate || "").trim() || todayDateString(),
          updatedBy: currentUserId,
          createdBy: currentUserId,
          ...(isFormula ? {} : { fixedAmount, amountBasis }),
        };
      }).filter(Boolean);

      if (!payloads.length) {
        toast.error("CSV must contain valid staffNumber, componentCode/componentName and fixedAmount (for fixed components). amountBasis is optional (monthly/daily).");
        return;
      }

      const results = await Promise.allSettled(
        payloads.map((payload) => API.post("/employeeSalaryMasters/assign-earning-component", payload))
      );
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        toast.success(`Uploaded: ${successCount} assignments`);
      }
      if (failCount > 0) {
        toast.warning(`Completed with errors: ${failCount} failed`);
      }
      if (selectedEmployee?.staffId) {
        await loadEmployeeAssignment(selectedEmployee);
      }
    } catch (error) {
      toast.error("Bulk upload failed");
    }
  };

  const downloadSampleTemplate = () => {
    const headers = ["staffNumber", "componentCode", "componentName", "fixedAmount", "amountBasis"];
    const sampleRows = [
      ["EMP0001", "BASIC", "", "18000", "monthly"],
      ["EMP0002", "HRA", "", "600", "daily"],
      ["EMP0003", "ATT_INC", "", "", "monthly"],
    ];

    const csv = [headers.join(","), ...sampleRows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "salary_assignment_bulk_upload_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col gap-4 px-6">
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
        <div className="flex items-end gap-2 md:col-span-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleBulkUpload}
          />
          <Button type="button" onClick={() => fileInputRef.current?.click()}>
            Upload CSV
          </Button>
          <Button type="button" variant="secondary" onClick={downloadSampleTemplate}>
            Download Sample
          </Button>
        </div>
      </div>

      {!hasCompanyScope && (
        <div className="border border-amber-200 bg-amber-50 text-amber-800 rounded-lg p-4 text-sm">
          Select a company before using salary assignment.
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-4 border-b">
          <Input
            label="Search Employee"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name / staff ID / staff number"
          />
        </div>

        <MasterTable columns={["Staff ID", "Employee", "Department", "Designation", "Actions"]}>
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
                <td className="py-3 px-4">
                  <button
                    type="button"
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md transition-colors"
                    title="Edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadEmployeeAssignment(emp);
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
          {filteredEmployees.length === 0 && (
            <tr>
              <td className="py-4 px-4 text-center text-gray-500" colSpan={5}>
                No employees found
              </td>
            </tr>
          )}
        </MasterTable>
      </div>

      <Modal
        isOpen={Boolean(selectedEmployee)}
        onClose={closeAssignmentModal}
        title={selectedEmployee ? `Assign Salary - ${`${selectedEmployee.firstName || ""} ${selectedEmployee.lastName || ""}`.trim()}` : "Assign Salary"}
        icon={HandCoins}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          {selectedEmployee && (
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
              <div className="mt-3 max-w-xs">
                <Input
                  label="Formula Date"
                  type="date"
                  value={formulaDate}
                  onChange={(e) => setFormulaDate(e.target.value)}
                />
              </div>
              {formulaDebugContext && (
                <div className="mt-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                  Formula Context: period {formulaDebugContext.payPeriodStart || "-"} to {formulaDebugContext.payPeriodEnd || "-"}, designation {formulaDebugContext.designation || "-"}, lopLeave {formulaDebugContext.lopLeave ?? 0}
                </div>
              )}
            </div>
          )}

          {loadingAssignment && <p className="text-sm text-gray-500">Loading assignment...</p>}

          {!loadingAssignment && selectedEmployee && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Earning Components</h3>
              {earningComponents.map((component) => (
                <div key={component.salaryComponentId} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{component.name}</p>
                      <p className="text-xs text-gray-500">{component.code}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Calculation: {component.calculationType === "Formula" ? "Formula" : "Fixed value per employee"}
                      </p>
                      {component.calculationType === "Formula" && (
                        <p className="text-xs text-gray-600 break-words mt-1">Formula: {component.formula || "No formula"}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Current: {assignedMap[component.salaryComponentId]?.calculatedAmount ?? assignedMap[component.salaryComponentId]?.fixedAmount ?? "-"}
                    </p>
                  </div>

                  <div className="flex items-end gap-2">
                    {component.calculationType !== "Formula" ? (
                      <>
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
                        <div className="w-44">
                          <label className="block text-xs text-gray-600 mb-1">Basis</label>
                          <select
                            value={amountBasisMap[component.salaryComponentId] || "monthly"}
                            onChange={(e) =>
                              setAmountBasisMap((prev) => ({
                                ...prev,
                                [component.salaryComponentId]: e.target.value === "daily" ? "daily" : "monthly",
                              }))
                            }
                            className="w-full border border-gray-300 rounded px-2 py-2 text-sm"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="daily">Daily</option>
                          </select>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                        Already Assigned
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {earningComponents.length === 0 && (
                <p className="text-sm text-gray-500">No earning components found for this company.</p>
              )}
              {fixedEarningComponents.length > 0 && (
                <div className="flex justify-end pt-1">
                  <Button type="button" onClick={saveAllFixedComponents} disabled={savingAllFixed}>
                    {savingAllFixed ? "Saving..." : "Assign"}
                  </Button>
                </div>
              )}

              <h3 className="text-sm font-semibold text-gray-700 pt-2">Deduction Components (Auto calculated by formula)</h3>
              {deductionComponents.map((component) => (
                <div key={component.salaryComponentId} className="border rounded-lg p-3 bg-gray-50">
                  <p className="font-medium text-gray-900">{component.name} ({component.code})</p>
                  <p className="text-sm text-gray-700 mt-1">
                    Calculated: {deductionAssignedMap[component.salaryComponentId]?.calculatedAmount ?? "-"}
                  </p>
                  <p className="text-xs text-gray-600 break-words mt-1">Formula: {component.formula || "No formula"}</p>
                </div>
              ))}

              <div className="border rounded-lg p-3 bg-blue-50 text-sm text-blue-900">
                <p>Gross Salary: {grossSalary}</p>
                <p>Total Deductions: {totalDeductions}</p>
                <p>Net Salary: {netSalary}</p>
                <p className="text-xs mt-1">Formula-based earning and deduction components are auto-assigned and auto-calculated.</p>
                {autoSyncingFormulas && <p className="text-xs mt-1">Syncing formula components...</p>}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
