import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import API from "../api";
import { useAuth } from "../auth/AuthContext";
import MasterTable from "../components/common/MasterTable";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

const normalizeRole = (role) => String(role || "").replace(/\s+/g, "").toLowerCase();
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : "-");
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

export default function AttendanceMaster({ userRole, selectedCompanyId }) {
  const { user } = useAuth();
  const isSuperAdmin = normalizeRole(userRole || user?.role) === "superadmin";
  const isAdmin = normalizeRole(userRole || user?.role) === "admin";
  const canEditStatus = isSuperAdmin || isAdmin;

  const [attendances, setAttendances] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [statusDrafts, setStatusDrafts] = useState({});
  const [savingAttendanceId, setSavingAttendanceId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openStatusFilter, setOpenStatusFilter] = useState(false);
  const [filters, setFilters] = useState({
    companyId: selectedCompanyId || "",
    status: [],
    dateFrom: "",
    dateTo: "",
    q: "",
  });

  const statusOptions = [
    "Present",
    "Absent",
    "Half-Day",
    "Late",
    "Early Exit",
    "Leave",
    "Holiday",
    "Week Off",
    "Permission",
  ];

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

  useEffect(() => {
    if (!effectiveCompanyId) {
      setLeaveTypes([]);
      setHolidays([]);
      return;
    }

    const loadStatusDependencies = async () => {
      try {
        const [leaveTypeRes, holidayRes] = await Promise.all([
          API.get("/leaveTypes", { params: { companyId: effectiveCompanyId } }),
          API.get("/holidays", { params: { companyId: effectiveCompanyId } }),
        ]);

        const activeLeaveTypes = (leaveTypeRes.data || []).filter(
          (lt) => String(lt.status || "Active").toLowerCase() === "active"
        );
        const activeHolidays = (holidayRes.data || []).filter(
          (h) => String(h.status || "Active").toLowerCase() === "active"
        );

        setLeaveTypes(activeLeaveTypes);
        setHolidays(activeHolidays);
      } catch (err) {
        console.error("Error loading leave types/holidays:", err);
      }
    };

    loadStatusDependencies();
  }, [effectiveCompanyId]);

  const fetchAttendance = useCallback(async (nextFilters = filters) => {
    if (!effectiveCompanyId) {
      setAttendances([]);
      return;
    }

    setLoading(true);
    try {
      const params = buildQueryParams({
        companyId: effectiveCompanyId,
        status: nextFilters.status,
        dateFrom: nextFilters.dateFrom || undefined,
        dateTo: nextFilters.dateTo || undefined,
        q: nextFilters.q?.trim() || undefined,
      });

      const res = await API.get("/attendances", { params });
      setAttendances(res.data || []);
    } catch (err) {
      console.error("Error fetching attendance:", err);
      toast.error(err.response?.data?.error || "Could not load attendance");
    } finally {
      setLoading(false);
    }
  }, [effectiveCompanyId, filters]);

  useEffect(() => {
    const next = {};
    attendances.forEach((row) => {
      next[row.attendanceId] = row.attendanceStatus || "";
    });
    setStatusDrafts(next);
  }, [attendances]);

  const resetFilters = () => {
    setFilters((prev) => ({
      companyId: prev.companyId || selectedCompanyId || "",
      status: [],
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

  const getStatusOptionsForDate = useCallback(
    (attendanceDate) => {
      const base = [
        { value: "Present", label: "Present" },
        { value: "Absent", label: "Absent" },
        { value: "Half-Day", label: "Half-Day" },
      ];

      const leaveOptions = leaveTypes.map((lt) => {
        const leaveName = String(lt.name || lt.leaveTypeName || "").trim();
        return {
          value: `Leave - ${leaveName}`,
          label: `Leave - ${leaveName}`,
        };
      });

      const holidaysForDate = holidays.filter((holiday) => {
        const holidayDate = String(holiday.holidayDate || "");
        return Boolean(attendanceDate && holidayDate && holidayDate === attendanceDate);
      });

      if (holidaysForDate.length > 0) {
        const holidayNames = holidaysForDate
          .map((h) => String(h.description || "").trim())
          .filter(Boolean)
          .join(", ");
        const hasWeekOffHoliday = holidaysForDate.some(
          (h) => String(h.type || "").trim().toLowerCase() === "week off"
        );
        base.push({
          value: "Holiday",
          label: holidayNames ? `Holiday (${holidayNames})` : "Holiday",
        });
        if (hasWeekOffHoliday) {
          base.push({ value: "Week Off", label: "Week Off" });
        }
      }

      return [...base, ...leaveOptions];
    },
    [holidays, leaveTypes]
  );

  const saveAttendanceStatus = async (row) => {
    if (!canEditStatus) return;
    const nextStatus = String(statusDrafts[row.attendanceId] || "").trim();
    if (!nextStatus) {
      toast.error("Select attendance status");
      return;
    }

    try {
      setSavingAttendanceId(row.attendanceId);
      await API.put(`/attendances/${row.attendanceId}`, {
        attendanceStatus: nextStatus,
        updatedBy: user?.userId ?? user?.id ?? null,
      });
      toast.success("Attendance status updated");
      await fetchAttendance();
    } catch (err) {
      const message = err.response?.data?.error || "Failed to update attendance status";
      toast.error(String(message));
    } finally {
      setSavingAttendanceId(null);
    }
  };

  return (
    <div className="h-full flex flex-col px-6 gap-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {isSuperAdmin && (
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
              <div className="flex flex-wrap gap-3">
                {companies.map((company) => (
                  <label key={company.companyId} className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                      checked={String(filters.companyId) === String(company.companyId)}
                      onChange={() =>
                        setFilters((prev) => ({
                          ...prev,
                          companyId:
                            String(prev.companyId) === String(company.companyId)
                              ? ""
                              : String(company.companyId),
                        }))
                      }
                    />
                    <span>{company.companyName}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="lg:col-span-2">
            <FilterDropdown
              label="Status"
              isOpen={openStatusFilter}
              onToggleOpen={() => setOpenStatusFilter((prev) => !prev)}
              options={statusOptions}
              selectedValues={filters.status}
              onToggleValue={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  status: toggleValue(prev.status, value),
                }))
              }
              getOptionKey={(option) => option}
              getOptionLabel={(option) => option}
              placeholder="Select Status"
              maxHeightClass="max-h-56"
              renderTop={
                statusOptions.length > 0 ? (
                  <label className="flex items-center gap-2 text-sm text-slate-700 pb-2 border-b border-slate-100 mb-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                      checked={filters.status.length === statusOptions.length}
                      onChange={() =>
                        setFilters((prev) => ({
                          ...prev,
                          status:
                            prev.status.length === statusOptions.length
                              ? []
                              : [...statusOptions],
                        }))
                      }
                    />
                    <span>Select All Statuses</span>
                  </label>
                ) : null
              }
            />
          </div>
          <br></br>
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
            <Button onClick={() => fetchAttendance(filters)}>Apply Filters</Button>
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
          "Attendance Status",
          "First Check-In",
          "Last Check-Out",
          "Working Hrs",
          "Late",
          "Early Exit",
          ...(canEditStatus ? ["Action"] : []),
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
              <td className="py-3 px-4">
                {canEditStatus ? (
                  <select
                    value={statusDrafts[row.attendanceId] ?? row.attendanceStatus ?? ""}
                    onChange={(e) =>
                      setStatusDrafts((prev) => ({
                        ...prev,
                        [row.attendanceId]: e.target.value,
                      }))
                    }
                    className="w-full max-w-xs border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    {getStatusOptionsForDate(row.attendanceDate).map((opt) => (
                      <option key={`${row.attendanceId}-${opt.value}`} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  row.attendanceStatus || "-"
                )}
              </td>
              <td className="py-3 px-4">{formatDateTime(row.firstCheckIn)}</td>
              <td className="py-3 px-4">{formatDateTime(row.lastCheckOut)}</td>
              <td className="py-3 px-4">{row.workingHours ?? "-"}</td>
              <td className="py-3 px-4">{row.isLate ? "Yes" : "No"}</td>
              <td className="py-3 px-4">{row.isEarlyExit ? "Yes" : "No"}</td>
              {canEditStatus && (
                <td className="py-3 px-4">
                  <Button
                    type="button"
                    onClick={() => saveAttendanceStatus(row)}
                    disabled={
                      savingAttendanceId === row.attendanceId ||
                      String(statusDrafts[row.attendanceId] ?? "").trim() === String(row.attendanceStatus || "").trim()
                    }
                  >
                    {savingAttendanceId === row.attendanceId ? "Saving..." : "Save"}
                  </Button>
                </td>
              )}
            </tr>
          );
        })}
      </MasterTable>
    </div>
  );
}
