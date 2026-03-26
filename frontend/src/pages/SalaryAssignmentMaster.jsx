import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { HandCoins, Pencil } from "lucide-react";
import Swal from "sweetalert2";
import API from "../api";
import { useAuth } from "../auth/AuthContext";
import MasterTable from "../components/common/MasterTable";
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
const defaultFilters = {
  departmentIds: [],
  designationIds: [],
  employeeGradeIds: [],
  statuses: ["Active"],
};
const toggleValue = (values, value) => {
  const key = String(value);
  return values.includes(key) ? values.filter((v) => v !== key) : [...values, key];
};
const buildFilterParams = (companyId, filters) => {
  const params = { companyId };

  if (Array.isArray(filters?.statuses) && filters.statuses.length > 0) {
    params.status = filters.statuses.map((value) => String(value).trim()).filter(Boolean);
  }
  if (Array.isArray(filters?.departmentIds) && filters.departmentIds.length > 0) {
    params.departmentId = filters.departmentIds.map((value) => String(value).trim()).filter(Boolean);
  }
  if (Array.isArray(filters?.designationIds) && filters.designationIds.length > 0) {
    params.designationId = filters.designationIds.map((value) => String(value).trim()).filter(Boolean);
  }
  if (Array.isArray(filters?.employeeGradeIds) && filters.employeeGradeIds.length > 0) {
    params.employeeGradeId = filters.employeeGradeIds.map((value) => String(value).trim()).filter(Boolean);
  }

  return params;
};

const FilterDropdown = ({
  label,
  isOpen,
  onToggleOpen,
  options,
  selectedValues,
  onToggleValue,
  getOptionKey,
  getOptionLabel,
  maxHeightClass = "max-h-48",
  placeholder = "Select",
  showSingleLabel = true,
  renderTop = null,
}) => {
  const selectedCount = selectedValues.length;
  const totalCount = options.length;
  const summary =
    selectedCount === 0
      ? placeholder
      : selectedCount === 1 && showSingleLabel
      ? getOptionLabel(options.find((opt) => String(getOptionKey(opt)) === String(selectedValues[0])) || {})
      : `${selectedCount} selected`;

  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
      <button
        type="button"
        onClick={onToggleOpen}
        className="w-full flex items-center justify-between border-2 border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white"
      >
        <span>{summary}</span>
        <span className="text-slate-400">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className={`absolute z-20 mt-2 w-full rounded-lg border border-slate-200 bg-white shadow-lg ${maxHeightClass} overflow-y-auto p-3`}>
          {renderTop}
          {options.length === 0 && (
            <div className="text-sm text-slate-500">No options</div>
          )}
          {options.map((option) => {
            const key = getOptionKey(option);
            const labelText = getOptionLabel(option);
            const checked = selectedValues.includes(String(key));
            return (
              <label key={key} className="flex items-center gap-2 text-sm text-slate-700 py-1">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                  checked={checked}
                  onChange={() => onToggleValue(String(key))}
                />
                <span>{labelText}</span>
              </label>
            );
          })}
          {options.length > 0 && (
            <div className="mt-2 text-xs text-slate-500">
              {selectedCount === 0 ? `${totalCount} options` : `${selectedCount} of ${totalCount} selected`}
            </div>
          )}
        </div>
      )}
    </div>
  );
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

  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [openDepartmentFilter, setOpenDepartmentFilter] = useState(false);
  const [openDesignationFilter, setOpenDesignationFilter] = useState(false);
  const [openGradeFilter, setOpenGradeFilter] = useState(false);
  const [openStatusFilter, setOpenStatusFilter] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [bulkComponentId, setBulkComponentId] = useState("");
  const [bulkFixedAmount, setBulkFixedAmount] = useState("");
  const [bulkAmountBasis, setBulkAmountBasis] = useState("monthly");
  const [bulkEffectiveFrom, setBulkEffectiveFrom] = useState(todayDateString);
  const [bulkEffectiveTo, setBulkEffectiveTo] = useState("");

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
  const [assignmentEffectiveFrom, setAssignmentEffectiveFrom] = useState(todayDateString);
  const [assignmentEffectiveTo, setAssignmentEffectiveTo] = useState("");

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

  const fetchEmployees = async (nextFilters = appliedFilters) => {
    if (!companyId) return;

    try {
      const params = buildFilterParams(companyId, nextFilters);
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
    setInputMap({});
    setAmountBasisMap({});
    setFormulaDebugContext(null);
    setAssignmentEffectiveFrom(formulaDate);
    setAssignmentEffectiveTo("");

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
      const selectedDate = String(formulaDate || todayDateString());
      const scopedComponents = components.filter((c) => {
        if (String(c.status || "Active").toLowerCase() !== "active") return false;
        const from = String(c.effectiveFrom || "");
        const to = c.effectiveTo ? String(c.effectiveTo) : "";
        if (from && from > selectedDate) return false;
        if (to && to < selectedDate) return false;
        return true;
      });
      const sortedComponents = [...scopedComponents].sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });
      sortedComponents.forEach((c) => {
        if (c.componentType === "Earning") {
          if (!map[c.componentId]) map[c.componentId] = c;
        } else if (c.componentType === "Deduction") {
          if (!deductionMap[c.componentId]) deductionMap[c.componentId] = c;
        }
      });
      setAssignedMap(map);
      setDeductionAssignedMap(deductionMap);

      setInputMap(() => {
        const next = {};
        [...Object.values(map), ...Object.values(deductionMap)]
          .filter((item) => String(item?.valueType || "").toLowerCase() === "fixed")
          .forEach((item) => {
            next[item.componentId] = String(item?.fixedAmount ?? "");
          });
        return next;
      });

      setAmountBasisMap(() => {
        const next = {};
        [...Object.values(map), ...Object.values(deductionMap)]
          .filter((item) => String(item?.valueType || "").toLowerCase() === "fixed")
          .forEach((item) => {
            const meta = parseJsonObject(item?.remarks);
            const basis = String(meta.amountBasis || "").toLowerCase() === "daily" ? "daily" : "monthly";
            next[item.componentId] = basis;
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
    setEmployees([]);
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setSelectedEmployeeIds([]);
    setSelectedEmployee(null);
    setActiveSalaryMaster(null);
  }, [companyId]);

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

  const allVisibleSelected = useMemo(
    () => filteredEmployees.length > 0 && filteredEmployees.every((emp) => selectedEmployeeIds.includes(emp.staffId)),
    [filteredEmployees, selectedEmployeeIds]
  );

  const handleApplyFilters = async () => {
    setAppliedFilters(filters);
    setSelectedEmployeeIds([]);
    setSelectedEmployee(null);
    setActiveSalaryMaster(null);
    setOpenDepartmentFilter(false);
    setOpenDesignationFilter(false);
    setOpenGradeFilter(false);
    setOpenStatusFilter(false);
    await fetchEmployees(filters);
  };

  const toggleEmployeeSelection = (staffId) => {
    setSelectedEmployeeIds((prev) => (
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    ));
  };

  const handleSelectAllVisible = () => {
    const allIds = filteredEmployees.map((emp) => emp.staffId);
    setSelectedEmployeeIds(allIds);
  };

  const handleClearAllVisible = () => {
    setSelectedEmployeeIds([]);
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setEmployees([]);
    setSelectedEmployeeIds([]);
    setSelectedEmployee(null);
    setActiveSalaryMaster(null);
    setOpenDepartmentFilter(false);
    setOpenDesignationFilter(false);
    setOpenGradeFilter(false);
    setOpenStatusFilter(false);
  };

  const handleBulkAssign = async () => {
    if (!bulkComponentId) {
      toast.error("Select a component");
      return;
    }
    if (!bulkEffectiveFrom) {
      toast.error("Select effective from date");
      return;
    }
    if (selectedEmployeeIds.length === 0) {
      toast.error("Select employees to assign");
      return;
    }

    const component = earningComponents.find(
      (c) => String(c.salaryComponentId) === String(bulkComponentId)
    );
    if (!component) {
      toast.error("Invalid component");
      return;
    }
    if (String(component.calculationType || "").toLowerCase() === "formula") {
      toast.error("Formula components are auto-calculated. Choose a fixed component.");
      return;
    }
    if (String(bulkFixedAmount).trim() === "") {
      toast.error("Enter an amount");
      return;
    }

    const payloads = selectedEmployeeIds.map((staffId) => ({
      staffId,
      companyId,
      componentId: component.salaryComponentId,
      fixedAmount: bulkFixedAmount,
      amountBasis: bulkAmountBasis,
      effectiveFrom: bulkEffectiveFrom,
      effectiveTo: bulkEffectiveTo || null,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    }));

    const results = await Promise.allSettled(
      payloads.map((payload) => API.post("/employeeSalaryMasters/assign-earning-component", payload))
    );
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failCount = results.length - successCount;
    if (successCount > 0) {
      await Swal.fire({
        icon: "success",
        title: "Assignment completed",
        text: `Assigned to ${successCount} employee(s).`,
      });
    }
    if (failCount > 0) toast.warning(`${failCount} assignment(s) failed`);
  };

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
  const fixedDeductionComponents = useMemo(
    () => deductionComponents.filter((c) => String(c.calculationType || "").toLowerCase() !== "formula"),
    [deductionComponents]
  );
  const formulaDeductionComponents = useMemo(
    () => deductionComponents.filter((c) => String(c.calculationType || "").toLowerCase() === "formula"),
    [deductionComponents]
  );
  const fixedAssignableComponents = useMemo(
    () => [...fixedEarningComponents, ...fixedDeductionComponents],
    [fixedDeductionComponents, fixedEarningComponents]
  );

  const saveAllFixedComponents = async () => {
    if (!selectedEmployee?.staffId) return toast.error("Select an employee");

    try {
      if (!assignmentEffectiveFrom) {
        toast.error("Select component effective from date");
        return;
      }
      setSavingAllFixed(true);
      const payloads = fixedAssignableComponents.map((component) => {
        const rawValue = String(inputMap[component.salaryComponentId] ?? "").trim();
        if (rawValue === "") {
          return null;
        }
        const amount = Number.parseFloat(rawValue);
        if (!Number.isFinite(amount) || amount < 0) {
          return null;
        }
        return {
          staffId: selectedEmployee.staffId,
          companyId,
          componentId: component.salaryComponentId,
          formulaDate,
          fixedAmount: amount,
          amountBasis: String(amountBasisMap[component.salaryComponentId] || "monthly").toLowerCase() === "daily" ? "daily" : "monthly",
          effectiveFrom: assignmentEffectiveFrom,
          effectiveTo: assignmentEffectiveTo || null,
          updatedBy: currentUserId,
          createdBy: currentUserId,
        };
      }).filter(Boolean);

      if (payloads.length === 0) {
        toast.info("Enter at least one fixed component amount");
        return;
      }

      const results = await Promise.allSettled(
        payloads.map((payload) => API.post("/employeeSalaryMasters/assign-earning-component", payload))
      );
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.length - successCount;
      if (successCount > 0) {
        await Swal.fire({
          icon: "success",
          title: "Assignment completed",
          text: `${successCount} component(s) assigned.`,
        });
      }
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
    setInputMap({});
    setAmountBasisMap({});
    setSavingAllFixed(false);
    setLoadingAssignment(false);
    setAutoSyncingFormulas(false);
    setFormulaDate(todayDateString());
    setFormulaDebugContext(null);
    setAssignmentEffectiveFrom(todayDateString());
    setAssignmentEffectiveTo("");
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
        <div>
          <FilterDropdown
            label="Department"
            isOpen={openDepartmentFilter}
            onToggleOpen={() => setOpenDepartmentFilter((prev) => !prev)}
            options={departments}
            selectedValues={filters.departmentIds}
            onToggleValue={(value) =>
              setFilters((prev) => ({
                ...prev,
                departmentIds: toggleValue(prev.departmentIds, String(value)),
              }))
            }
            getOptionKey={(option) => String(option.departmentId)}
            getOptionLabel={(option) => option.departmentName}
            placeholder="Select Department"
            maxHeightClass="max-h-56"
            renderTop={
              departments.length > 0 ? (
                <label className="flex items-center gap-2 text-sm text-slate-700 pb-2 border-b border-slate-100 mb-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                    checked={filters.departmentIds.length === departments.length}
                    onChange={() =>
                      setFilters((prev) => ({
                        ...prev,
                        departmentIds:
                          prev.departmentIds.length === departments.length
                            ? []
                            : departments.map((d) => String(d.departmentId)),
                      }))
                    }
                  />
                  <span>Select All Departments</span>
                </label>
              ) : null
            }
          />
        </div>
        <div>
          <FilterDropdown
            label="Designation"
            isOpen={openDesignationFilter}
            onToggleOpen={() => setOpenDesignationFilter((prev) => !prev)}
            options={designations}
            selectedValues={filters.designationIds}
            onToggleValue={(value) =>
              setFilters((prev) => ({
                ...prev,
                designationIds: toggleValue(prev.designationIds, String(value)),
              }))
            }
            getOptionKey={(option) => String(option.designationId)}
            getOptionLabel={(option) => option.designationName}
            placeholder="Select Designation"
            maxHeightClass="max-h-56"
            renderTop={
              designations.length > 0 ? (
                <label className="flex items-center gap-2 text-sm text-slate-700 pb-2 border-b border-slate-100 mb-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                    checked={filters.designationIds.length === designations.length}
                    onChange={() =>
                      setFilters((prev) => ({
                        ...prev,
                        designationIds:
                          prev.designationIds.length === designations.length
                            ? []
                            : designations.map((d) => String(d.designationId)),
                      }))
                    }
                  />
                  <span>Select All Designations</span>
                </label>
              ) : null
            }
          />
        </div>
        <div>
          <FilterDropdown
            label="Grade"
            isOpen={openGradeFilter}
            onToggleOpen={() => setOpenGradeFilter((prev) => !prev)}
            options={grades}
            selectedValues={filters.employeeGradeIds}
            onToggleValue={(value) =>
              setFilters((prev) => ({
                ...prev,
                employeeGradeIds: toggleValue(prev.employeeGradeIds, String(value)),
              }))
            }
            getOptionKey={(option) => String(option.employeeGradeId)}
            getOptionLabel={(option) => option.employeeGradeName}
            placeholder="Select Grade"
            maxHeightClass="max-h-56"
            renderTop={
              grades.length > 0 ? (
                <label className="flex items-center gap-2 text-sm text-slate-700 pb-2 border-b border-slate-100 mb-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                    checked={filters.employeeGradeIds.length === grades.length}
                    onChange={() =>
                      setFilters((prev) => ({
                        ...prev,
                        employeeGradeIds:
                          prev.employeeGradeIds.length === grades.length
                            ? []
                            : grades.map((g) => String(g.employeeGradeId)),
                      }))
                    }
                  />
                  <span>Select All Grades</span>
                </label>
              ) : null
            }
          />
        </div>
        <div>
          <FilterDropdown
            label="Status"
            isOpen={openStatusFilter}
            onToggleOpen={() => setOpenStatusFilter((prev) => !prev)}
            options={["Active", "Inactive"].map((value) => ({ value, label: value }))}
            selectedValues={filters.statuses}
            onToggleValue={(value) =>
              setFilters((prev) => ({
                ...prev,
                statuses: toggleValue(prev.statuses, value),
              }))
            }
            getOptionKey={(option) => option.value}
            getOptionLabel={(option) => option.label}
            placeholder="Select Status"
            renderTop={
              true ? (
                <label className="flex items-center gap-2 text-sm text-slate-700 pb-2 border-b border-slate-100 mb-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                    checked={filters.statuses.length === 2}
                    onChange={() =>
                      setFilters((prev) => ({
                        ...prev,
                        statuses: prev.statuses.length === 2 ? [] : ["Active", "Inactive"],
                      }))
                    }
                  />
                  <span>Select All Statuses</span>
                </label>
              ) : null
            }
          />
        </div>
        <div className="flex items-end gap-2 md:col-span-4">
          <Button type="button" variant="secondary" onClick={handleResetFilters}>
            Reset
          </Button>
          <Button type="button" onClick={handleApplyFilters}>
            Apply Filters
          </Button>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Component</label>
            <select
              value={bulkComponentId}
              onChange={(e) => setBulkComponentId(e.target.value)}
              className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">Select Component</option>
              {earningComponents
                .filter((c) => String(c.calculationType || "").toLowerCase() !== "formula")
                .map((c) => (
                  <option key={c.salaryComponentId} value={c.salaryComponentId}>
                    {c.name} ({c.code})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <Input
              label="Amount"
              type="number"
              min={0}
              step="0.01"
              value={bulkFixedAmount}
              onChange={(e) => setBulkFixedAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Basis</label>
            <select
              value={bulkAmountBasis}
              onChange={(e) => setBulkAmountBasis(e.target.value === "daily" ? "daily" : "monthly")}
              className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="monthly">Monthly</option>
              <option value="daily">Daily</option>
            </select>
          </div>
          <div>
            <Input
              label="Effective From"
              type="date"
              value={bulkEffectiveFrom}
              onChange={(e) => setBulkEffectiveFrom(e.target.value)}
            />
          </div>
          <div>
            <Input
              label="Effective To"
              type="date"
              value={bulkEffectiveTo}
              onChange={(e) => setBulkEffectiveTo(e.target.value)}
            />
          </div>
          <div className="md:col-span-6 flex flex-wrap items-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSelectAllVisible}
              className="w-full sm:w-auto whitespace-nowrap"
            >
              Select All
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClearAllVisible}
              className="w-full sm:w-auto whitespace-nowrap"
            >
              Clear
            </Button>
            <Button
              type="button"
              onClick={handleBulkAssign}
              className="w-full sm:w-auto whitespace-nowrap"
            >
              Assign to Selected
            </Button>
          </div>
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

        <MasterTable columns={[
          (
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
              checked={allVisibleSelected}
              onChange={(e) => {
                if (e.target.checked) {
                  handleSelectAllVisible();
                } else {
                  handleClearAllVisible();
                }
              }}
              aria-label="Select all"
            />
          ),
          "Staff ID",
          "Employee",
          "Department",
          "Designation",
          "Actions",
        ]}>
          {filteredEmployees.map((emp) => {
            const isSelected = String(selectedEmployee?.staffId || "") === String(emp.staffId);
            const isChecked = selectedEmployeeIds.includes(emp.staffId);
            return (
              <tr
                key={emp.staffId}
                className={`border-t cursor-pointer ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                onClick={() => loadEmployeeAssignment(emp)}
              >
                <td className="py-3 px-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                    checked={isChecked}
                    onChange={() => toggleEmployeeSelection(emp.staffId)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Select employee"
                  />
                </td>
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
              <td className="py-4 px-4 text-center text-gray-500" colSpan={6}>
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
        <div className="space-y-4 pb-20">
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
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Component Effective From"
                  type="date"
                  value={assignmentEffectiveFrom}
                  onChange={(e) => setAssignmentEffectiveFrom(e.target.value)}
                />
                <Input
                  label="Component Effective To"
                  type="date"
                  value={assignmentEffectiveTo}
                  onChange={(e) => setAssignmentEffectiveTo(e.target.value)}
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
              <h3 className="text-sm font-semibold text-gray-700 pt-2">Deduction Components</h3>
              {fixedDeductionComponents.map((component) => (
                <div key={component.salaryComponentId} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{component.name}</p>
                      <p className="text-xs text-gray-500">{component.code}</p>
                      <p className="text-xs text-gray-500 mt-1">Calculation: Fixed value per employee</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Current: {deductionAssignedMap[component.salaryComponentId]?.calculatedAmount ?? deductionAssignedMap[component.salaryComponentId]?.fixedAmount ?? "-"}
                    </p>
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
                  </div>
                </div>
              ))}
              {formulaDeductionComponents.map((component) => (
                <div key={component.salaryComponentId} className="border rounded-lg p-3 bg-gray-50">
                  <p className="font-medium text-gray-900">{component.name} ({component.code})</p>
                  <p className="text-sm text-gray-700 mt-1">
                    Calculated: {deductionAssignedMap[component.salaryComponentId]?.calculatedAmount ?? "-"}
                  </p>
                  <p className="text-xs text-gray-600 break-words mt-1">Formula: {component.formula || "No formula"}</p>
                </div>
              ))}
              {deductionComponents.length === 0 && (
                <p className="text-sm text-gray-500">No deduction components found for this company.</p>
              )}

              <div className="border rounded-lg p-3 bg-blue-50 text-sm text-blue-900">
                <p>Gross Salary: {grossSalary}</p>
                <p>Total Deductions: {totalDeductions}</p>
                <p>Net Salary: {netSalary}</p>
                <p className="text-xs mt-1">Formula-based components are auto-assigned and auto-calculated. Fixed components are saved per employee.</p>
                {autoSyncingFormulas && <p className="text-xs mt-1">Syncing formula components...</p>}
              </div>
            </div>
          )}
        </div>
        <div className="sticky bottom-0 -mx-8 px-8 py-3 bg-white border-t border-gray-200 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={closeAssignmentModal}>
            Close
          </Button>
          {fixedAssignableComponents.length > 0 && (
            <Button type="button" onClick={saveAllFixedComponents} disabled={savingAllFixed}>
              {savingAllFixed ? "Saving..." : "Assign"}
            </Button>
          )}
        </div>
      </Modal>
    </div>
  );
}
