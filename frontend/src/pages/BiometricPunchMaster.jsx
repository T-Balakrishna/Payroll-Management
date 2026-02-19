import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import API from "../api";
import { useAuth } from "../auth/AuthContext";
import MasterTable from "../components/common/MasterTable";
import Select from "../components/ui/Select";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

const normalizeRole = (role) => String(role || "").replace(/\s+/g, "").toLowerCase();

export default function BiometricPunchMaster({ userRole, selectedCompanyId }) {
  const { user } = useAuth();
  const isSuperAdmin = normalizeRole(userRole || user?.role) === "superadmin";

  const [punches, setPunches] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    companyId: selectedCompanyId || "",
    departmentId: "",
    employeeGradeId: "",
    roleType: "",
    biometricDeviceId: "",
    punchType: "",
    isManual: "",
    isLate: "",
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

  const fetchPunches = useCallback(async () => {
    if (!effectiveCompanyId) {
      setPunches([]);
      return;
    }

    setLoading(true);
    try {
      const params = {
        ...filters,
        companyId: effectiveCompanyId,
      };

      Object.keys(params).forEach((k) => {
        if (params[k] === "" || params[k] === null || params[k] === undefined) {
          delete params[k];
        }
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

  useEffect(() => {
    const id = setTimeout(() => {
      fetchPunches();
    }, 0);
    return () => clearTimeout(id);
  }, [fetchPunches]);

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
      departmentId: "",
      employeeGradeId: "",
      roleType: "",
      biometricDeviceId: "",
      punchType: "",
      isManual: "",
      isLate: "",
      dateFrom: "",
      dateTo: "",
      q: "",
    }));
  };

  return (
    <div className="h-full flex flex-col px-6 gap-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {isSuperAdmin && (
            <Select
              label="Company"
              value={filters.companyId}
              onChange={(e) => setFilters((p) => ({ ...p, companyId: e.target.value }))}
              options={companies.map((c) => ({ value: c.companyId, label: c.companyName }))}
              placeholder="Select Company"
              allowPlaceholderSelection
            />
          )}

          <Select
            label="Department"
            value={filters.departmentId}
            onChange={(e) => setFilters((p) => ({ ...p, departmentId: e.target.value }))}
            options={departments.map((d) => ({ value: d.departmentId, label: d.departmentName }))}
            placeholder="All Departments"
            allowPlaceholderSelection
          />

          <Select
            label="Grade"
            value={filters.employeeGradeId}
            onChange={(e) => setFilters((p) => ({ ...p, employeeGradeId: e.target.value }))}
            options={grades.map((g) => ({ value: g.employeeGradeId, label: g.employeeGradeName }))}
            placeholder="All Grades"
            allowPlaceholderSelection
          />

          <Select
            label="Role Type"
            value={filters.roleType}
            onChange={(e) => setFilters((p) => ({ ...p, roleType: e.target.value }))}
            options={[
              { value: "Teaching", label: "Teaching" },
              { value: "Non-Teaching", label: "Non-Teaching" },
            ]}
            placeholder="All Roles"
            allowPlaceholderSelection
          />

          <Select
            label="Device"
            value={filters.biometricDeviceId}
            onChange={(e) => setFilters((p) => ({ ...p, biometricDeviceId: e.target.value }))}
            options={devices.map((d) => ({ value: d.deviceId, label: d.name }))}
            placeholder="All Devices"
            allowPlaceholderSelection
          />

          <Select
            label="Punch Type"
            value={filters.punchType}
            onChange={(e) => setFilters((p) => ({ ...p, punchType: e.target.value }))}
            options={[
              { value: "IN", label: "IN" },
              { value: "OUT", label: "OUT" },
              { value: "Unknown", label: "Unknown" },
            ]}
            placeholder="All Types"
            allowPlaceholderSelection
          />

          <Select
            label="Manual/Auto"
            value={filters.isManual}
            onChange={(e) => setFilters((p) => ({ ...p, isManual: e.target.value }))}
            options={[
              { value: "true", label: "Manual" },
              { value: "false", label: "Auto" },
            ]}
            placeholder="All"
            allowPlaceholderSelection
          />

          <Select
            label="Late/On Time"
            value={filters.isLate}
            onChange={(e) => setFilters((p) => ({ ...p, isLate: e.target.value }))}
            options={[
              { value: "true", label: "Late" },
              { value: "false", label: "On Time" },
            ]}
            placeholder="All"
            allowPlaceholderSelection
          />

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
          <Button onClick={fetchPunches}>Apply Filters</Button>
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
          "Type",
          "Late",
          "Manual",
        ]}
        loading={loading}
      >
        {punches.map((p) => {
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
                {p.punchTimestamp ? new Date(p.punchTimestamp).toLocaleString() : "-"}
              </td>
              <td className="py-3 px-4">{p.punchType || "-"}</td>
              <td className="py-3 px-4">{p.isLate ? "Yes" : "No"}</td>
              <td className="py-3 px-4">{p.isManual ? "Yes" : "No"}</td>
            </tr>
          );
        })}
      </MasterTable>
    </div>
  );
}
