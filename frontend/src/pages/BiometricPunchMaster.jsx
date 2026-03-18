import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import API from "../api";
import { useAuth } from "../auth/AuthContext";
import MasterTable from "../components/common/MasterTable";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

const normalizeRole = (role) => String(role || "").replace(/\s+/g, "").toLowerCase();
const formatPunchTime = (value) => {
  if (!value) return "-";
  const str = String(value).trim();
  if (!str) return "-";
  return str.replace("T", " ").replace("Z", "");
};
const toggleValue = (values, value) => {
  const key = String(value);
  return values.includes(key) ? values.filter((v) => v !== key) : [...values, key];
};
const buildQueryParams = (params) => {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value
        .map((v) => String(v))
        .filter((v) => v !== "")
        .forEach((v) => search.append(key, v));
      return;
    }
    const text = String(value).trim();
    if (!text) return;
    search.append(key, text);
  });
  return search;
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

export default function BiometricPunchMaster({ userRole, selectedCompanyId }) {
  const { user } = useAuth();
  const isSuperAdmin = normalizeRole(userRole || user?.role) === "superadmin";

  const [punches, setPunches] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openCompanyFilter, setOpenCompanyFilter] = useState(false);
  const [openDepartmentFilter, setOpenDepartmentFilter] = useState(false);
  const [openGradeFilter, setOpenGradeFilter] = useState(false);
  const [openRoleTypeFilter, setOpenRoleTypeFilter] = useState(false);
  const [openDeviceFilter, setOpenDeviceFilter] = useState(false);

  const [filters, setFilters] = useState({
    companyId: selectedCompanyId || "",
    departmentIds: [],
    employeeGradeIds: [],
    roleTypes: [],
    biometricDeviceIds: [],
    dateFrom: "",
    dateTo: "",
    q: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    companyId: selectedCompanyId || "",
    departmentIds: [],
    employeeGradeIds: [],
    roleTypes: [],
    biometricDeviceIds: [],
    dateFrom: "",
    dateTo: "",
    q: "",
  });

  const effectiveCompanyId = isSuperAdmin
    ? filters.companyId || selectedCompanyId || ""
    : selectedCompanyId || user?.companyId || user?.company?.companyId || "";

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      companyId: selectedCompanyId || prev.companyId || "",
    }));
  }, [selectedCompanyId]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const loadCompanies = async () => {
      try {
        const res = await API.get("/companies");
        setCompanies(res.data || []);
      } catch (err) {
        console.error("Error loading companies:", err);
      }
    };
    loadCompanies();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!effectiveCompanyId) {
      setDepartments([]);
      setGrades([]);
      setDevices([]);
      return;
    }

    const loadReference = async () => {
      try {
        const [deptRes, gradeRes, deviceRes] = await Promise.all([
          API.get("/departments", { params: { companyId: effectiveCompanyId } }),
          API.get("/employeeGrades", { params: { companyId: effectiveCompanyId } }),
          API.get("/biometricDevices", { params: { companyId: effectiveCompanyId } }),
        ]);

        setDepartments(deptRes.data || []);
        setGrades(gradeRes.data || []);
        setDevices(deviceRes.data || []);
      } catch (err) {
        console.error("Error loading filter data:", err);
      }
    };

    loadReference();
  }, [effectiveCompanyId]);

  const fetchPunches = useCallback(async (nextFilters = filters) => {
    if (!effectiveCompanyId) {
      setPunches([]);
      return;
    }

    setLoading(true);
    try {
      const params = buildQueryParams({
        companyId: effectiveCompanyId,
        dateFrom: nextFilters.dateFrom || undefined,
        dateTo: nextFilters.dateTo || undefined,
        q: nextFilters.q?.trim() || undefined,
      });
      const res = await API.get("/biometricPunches", { params });
      setPunches(res.data || []);
    } catch (err) {
      console.error("Error fetching punches:", err);
      toast.error("Could not load biometric punches");
    } finally {
      setLoading(false);
    }
  }, [effectiveCompanyId, filters]);

  const departmentMap = useMemo(
    () => new Map(departments.map((d) => [String(d.departmentId), d.departmentAcr || d.departmentName])),
    [departments]
  );
  const gradeMap = useMemo(
    () => new Map(grades.map((g) => [String(g.employeeGradeId), g.employeeGradeAcr || g.employeeGradeName])),
    [grades]
  );

  const resetFilters = () => {
    setFilters((prev) => ({
      companyId: prev.companyId || selectedCompanyId || "",
      departmentIds: [],
      employeeGradeIds: [],
      roleTypes: [],
      biometricDeviceIds: [],
      dateFrom: "",
      dateTo: "",
      q: "",
    }));
  };

  const filteredPunches = useMemo(() => {
    const departmentSet = new Set(appliedFilters.departmentIds.map(String));
    const gradeSet = new Set(appliedFilters.employeeGradeIds.map(String));
    const roleSet = new Set(appliedFilters.roleTypes.map(String));
    const deviceSet = new Set(appliedFilters.biometricDeviceIds.map(String));

    return punches.filter((row) => {
      if (departmentSet.size > 0 && !departmentSet.has(String(row.employee?.departmentId || ""))) {
        return false;
      }
      if (gradeSet.size > 0 && !gradeSet.has(String(row.employee?.employeeGradeId || ""))) {
        return false;
      }
      if (roleSet.size > 0 && !roleSet.has(String(row.roleType || ""))) {
        return false;
      }
      if (deviceSet.size > 0 && !deviceSet.has(String(row.device?.deviceId || row.biometricDeviceId || ""))) {
        return false;
      }
      return true;
    });
  }, [appliedFilters.biometricDeviceIds, appliedFilters.departmentIds, appliedFilters.employeeGradeIds, appliedFilters.roleTypes, punches]);

  return (
    <div className="h-full flex flex-col px-6 gap-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {isSuperAdmin && (
            <div className="lg:col-span-2">
              <FilterDropdown
                label="Company"
                isOpen={openCompanyFilter}
                onToggleOpen={() => setOpenCompanyFilter((prev) => !prev)}
                options={companies}
                selectedValues={filters.companyId ? [String(filters.companyId)] : []}
                onToggleValue={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    companyId: String(prev.companyId) === String(value) ? "" : String(value),
                  }))
                }
                getOptionKey={(option) => String(option.companyId)}
                getOptionLabel={(option) => option.companyName}
                placeholder="Select Company"
                showSingleLabel
              />
            </div>
          )}

          <div className="lg:col-span-2">
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

          <div className="lg:col-span-2">
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

          <div className="lg:col-span-2">
            <FilterDropdown
              label="Role Type"
              isOpen={openRoleTypeFilter}
              onToggleOpen={() => setOpenRoleTypeFilter((prev) => !prev)}
              options={["Teaching", "Non-Teaching"].map((value) => ({ value, label: value }))}
              selectedValues={filters.roleTypes}
              onToggleValue={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  roleTypes: toggleValue(prev.roleTypes, value),
                }))
              }
              getOptionKey={(option) => option.value}
              getOptionLabel={(option) => option.label}
              placeholder="Select Role Type"
              renderTop={
                true ? (
                  <label className="flex items-center gap-2 text-sm text-slate-700 pb-2 border-b border-slate-100 mb-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                      checked={filters.roleTypes.length === 2}
                      onChange={() =>
                        setFilters((prev) => ({
                          ...prev,
                          roleTypes: prev.roleTypes.length === 2 ? [] : ["Teaching", "Non-Teaching"],
                        }))
                      }
                    />
                    <span>Select All Role Types</span>
                  </label>
                ) : null
              }
            />
          </div>

          <div className="lg:col-span-2">
            <FilterDropdown
              label="Device"
              isOpen={openDeviceFilter}
              onToggleOpen={() => setOpenDeviceFilter((prev) => !prev)}
              options={devices}
              selectedValues={filters.biometricDeviceIds}
              onToggleValue={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  biometricDeviceIds: toggleValue(prev.biometricDeviceIds, String(value)),
                }))
              }
              getOptionKey={(option) => String(option.deviceId)}
              getOptionLabel={(option) => option.name}
              placeholder="Select Device"
              maxHeightClass="max-h-56"
              renderTop={
                devices.length > 0 ? (
                  <label className="flex items-center gap-2 text-sm text-slate-700 pb-2 border-b border-slate-100 mb-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                      checked={filters.biometricDeviceIds.length === devices.length}
                      onChange={() =>
                        setFilters((prev) => ({
                          ...prev,
                          biometricDeviceIds:
                            prev.biometricDeviceIds.length === devices.length
                              ? []
                              : devices.map((d) => String(d.deviceId)),
                        }))
                      }
                    />
                    <span>Select All Devices</span>
                  </label>
                ) : null
              }
            />
          </div>

          <Input
            label="Date From"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))}
          />

          <Input
            label="Date To"
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))}
          />

          <Input
            label="Search"
            value={filters.q}
            onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
            placeholder="Staff no/name/device/biometric no"
          />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" onClick={resetFilters}>
            Reset
          </Button>
          <Button
            onClick={() => {
              setAppliedFilters(filters);
              fetchPunches(filters);
            }}
          >
            Apply Filters
          </Button>
        </div>
      </div>

      {!effectiveCompanyId && (
        <div className="border border-amber-200 bg-amber-50 text-amber-800 rounded-lg p-4 text-sm">
          {isSuperAdmin
            ? "Select a company to view punch logs."
            : "Company scope not available for this user."}
        </div>
      )}

      <MasterTable
        columns={[
          "Staff No",
          "Staff Name",
          "Dept",
          "Grade",
          "Role Type",
          "Device",
          "Punch Time",
        ]}
        loading={loading}
      >
        {filteredPunches.map((p) => {
          const fullName = [
            p.employee?.firstName || "",
            p.employee?.middleName || "",
            p.employee?.lastName || "",
          ]
            .join(" ")
            .trim();

          return (
            <tr key={p.punchId} className="border-t hover:bg-gray-50">
              <td className="py-3 px-4">{p.employee?.staffNumber || "-"}</td>
              <td className="py-3 px-4">{fullName || "-"}</td>
              <td className="py-3 px-4">
                {departmentMap.get(String(p.employee?.departmentId || "")) || "-"}
              </td>
              <td className="py-3 px-4">
                {gradeMap.get(String(p.employee?.employeeGradeId || "")) || "-"}
              </td>
              <td className="py-3 px-4">{p.roleType || "-"}</td>
              <td className="py-3 px-4">{p.device?.name || "-"}</td>
              <td className="py-3 px-4">
                {formatPunchTime(p.punchTimestamp)}
              </td>
            </tr>
          );
        })}
      </MasterTable>
    </div>
  );
}
