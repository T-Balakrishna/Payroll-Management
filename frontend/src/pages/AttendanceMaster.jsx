import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import API from "../api";
import { useAuth } from "../auth/AuthContext";
import MasterTable from "../components/common/MasterTable";
import Select from "../components/ui/Select";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

const normalizeRole = (role) => String(role || "").replace(/\s+/g, "").toLowerCase();
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : "-");

export default function AttendanceMaster({ userRole, selectedCompanyId }) {
  const { user } = useAuth();
  const isSuperAdmin = normalizeRole(userRole || user?.role) === "superadmin";

  const [attendances, setAttendances] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    companyId: selectedCompanyId || "",
    status: "",
    dateFrom: "",
    dateTo: "",
    q: "",
  });

  const effectiveCompanyId = isSuperAdmin
    ? (filters.companyId || selectedCompanyId || "")
    : (selectedCompanyId || user?.companyId || user?.company?.companyId || "");

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

  const fetchAttendance = useCallback(async () => {
    if (!effectiveCompanyId) {
      setAttendances([]);
      return;
    }

    setLoading(true);
    try {
      const params = {
        companyId: effectiveCompanyId,
        status: filters.status || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        q: filters.q?.trim() || undefined,
      };

      const res = await API.get("/attendances", { params });
      setAttendances(res.data || []);
    } catch (err) {
      console.error("Error fetching attendance:", err);
      toast.error(err.response?.data?.error || "Could not load attendance");
    } finally {
      setLoading(false);
    }
  }, [effectiveCompanyId, filters.dateFrom, filters.dateTo, filters.q, filters.status]);

  useEffect(() => {
    const id = setTimeout(() => {
      fetchAttendance();
    }, 0);
    return () => clearTimeout(id);
  }, [fetchAttendance]);

  const resetFilters = () => {
    setFilters((prev) => ({
      companyId: prev.companyId || selectedCompanyId || "",
      status: "",
      dateFrom: "",
      dateTo: "",
      q: "",
    }));
  };

  const statusSummary = useMemo(() => {
    return attendances.reduce((acc, row) => {
      const key = row.attendanceStatus || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [attendances]);

  return (
    <div className="h-full flex flex-col px-6 gap-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
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
            label="Status"
            value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            options={[
              { value: "Present", label: "Present" },
              { value: "Absent", label: "Absent" },
              { value: "Half-Day", label: "Half-Day" },
              { value: "Late", label: "Late" },
              { value: "Early Exit", label: "Early Exit" },
              { value: "Leave", label: "Leave" },
              { value: "Holiday", label: "Holiday" },
              { value: "Week Off", label: "Week Off" },
              { value: "Permission", label: "Permission" },
            ]}
            placeholder="All Status"
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
            label="Staff Search"
            value={filters.q}
            onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
            placeholder="Staff no / name"
          />
        </div>

        <div className="flex justify-between items-center mt-4 gap-3">
          <div className="text-xs text-slate-600">
            Total Records: <span className="font-semibold">{attendances.length}</span>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={resetFilters}>
              Reset
            </Button>
            <Button onClick={fetchAttendance}>Apply Filters</Button>
          </div>
        </div>

        {Object.keys(statusSummary).length > 0 && (
          <div className="mt-3 text-xs text-slate-600">
            {Object.entries(statusSummary)
              .map(([status, count]) => `${status}: ${count}`)
              .join(" | ")}
          </div>
        )}
      </div>

      {!effectiveCompanyId && (
        <div className="border border-amber-200 bg-amber-50 text-amber-800 rounded-lg p-4 text-sm">
          {isSuperAdmin
            ? "Select a company to view attendance."
            : "Company scope not available for this user."}
        </div>
      )}

      <MasterTable
        columns={[
          "Date",
          "Staff No",
          "Staff Name",
          "Status",
          "First Check-In",
          "Last Check-Out",
          "Working Hrs",
          "Late",
          "Early Exit",
        ]}
        loading={loading}
      >
        {attendances.map((row) => {
          const fullName = [
            row.employee?.firstName || "",
            row.employee?.middleName || "",
            row.employee?.lastName || "",
          ]
            .join(" ")
            .trim();

          return (
            <tr key={row.attendanceId} className="border-t hover:bg-gray-50">
              <td className="py-3 px-4">{row.attendanceDate || "-"}</td>
              <td className="py-3 px-4">{row.employee?.staffNumber || "-"}</td>
              <td className="py-3 px-4">{fullName || "-"}</td>
              <td className="py-3 px-4">{row.attendanceStatus || "-"}</td>
              <td className="py-3 px-4">{formatDateTime(row.firstCheckIn)}</td>
              <td className="py-3 px-4">{formatDateTime(row.lastCheckOut)}</td>
              <td className="py-3 px-4">{row.workingHours ?? "-"}</td>
              <td className="py-3 px-4">{row.isLate ? "Yes" : "No"}</td>
              <td className="py-3 px-4">{row.isEarlyExit ? "Yes" : "No"}</td>
            </tr>
          );
        })}
      </MasterTable>
    </div>
  );
}
