import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import API from "../api";
import { useAuth } from "../auth/AuthContext";
import MasterTable from "../components/common/MasterTable";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

const normalizeRole = (role) => String(role || "").replace(/\s+/g, "").toLowerCase();

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : "-");

const toHours = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
};

const getEmployeeName = (employee) =>
  [employee?.firstName, employee?.middleName, employee?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim() || "-";

export default function OvertimeManagement({ userRole, selectedCompanyId }) {
  const { user } = useAuth();
  const normalizedRole = normalizeRole(userRole || user?.role);
  const canEdit = ["admin", "superadmin"].includes(normalizedRole);

  const [rows, setRows] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    companyId: selectedCompanyId || "",
    overtimeStatus: "Pending",
    dateFrom: "",
    dateTo: "",
    q: "",
  });

  const isSuperAdmin = normalizedRole === "superadmin";
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

  const fetchOvertime = useCallback(async () => {
    if (!effectiveCompanyId) {
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      const params = {
        companyId: effectiveCompanyId,
        overtimeOnly: true,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        q: filters.q?.trim() || undefined,
      };

      if (filters.overtimeStatus !== "All") {
        params.overtimeStatus = filters.overtimeStatus;
      }

      const res = await API.get("/attendances", { params });
      setRows(res.data || []);
    } catch (err) {
      console.error("Error fetching overtime:", err);
      toast.error(err.response?.data?.error || "Could not load overtime records");
    } finally {
      setLoading(false);
    }
  }, [effectiveCompanyId, filters]);

  useEffect(() => {
    fetchOvertime();
  }, [fetchOvertime]);

  useEffect(() => {
    const next = {};
    rows.forEach((row) => {
      next[row.attendanceId] = {
        overtimeStatus: row.overtimeStatus || "None",
        overtimeApprovedHours: row.overtimeApprovedHours ?? row.overtimeRequestedHours ?? 0,
        overtimeRemarks: row.overtimeRemarks || "",
      };
    });
    setDrafts(next);
  }, [rows]);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const status = row.overtimeStatus || "None";
        acc.count += 1;
        acc.requested += Number(row.overtimeRequestedHours || row.overtimeHours || 0);
        acc.approved += Number(row.overtimeApprovedHours || 0);
        acc.byStatus[status] = (acc.byStatus[status] || 0) + 1;
        return acc;
      },
      { count: 0, requested: 0, approved: 0, byStatus: {} }
    );
  }, [rows]);

  const updateDraft = (attendanceId, key, value) => {
    setDrafts((prev) => ({
      ...prev,
      [attendanceId]: {
        ...(prev[attendanceId] || {}),
        [key]: value,
      },
    }));
  };

  const saveOvertime = async (row) => {
    if (!canEdit) return;

    const draft = drafts[row.attendanceId] || {};
    const requestedHours = Number(row.overtimeRequestedHours || row.overtimeHours || 0);
    const approvedHours = Number(draft.overtimeApprovedHours || 0);
    const nextStatus = draft.overtimeStatus || "Pending";

    if (nextStatus === "Approved" && approvedHours <= 0) {
      toast.error("Approved OT hours must be greater than 0");
      return;
    }

    if (nextStatus === "Approved" && approvedHours > requestedHours) {
      toast.error("Approved OT hours cannot exceed requested hours");
      return;
    }

    try {
      setSavingId(row.attendanceId);
      await API.put(`/attendances/${row.attendanceId}`, {
        overtimeStatus: nextStatus,
        overtimeApprovedHours: nextStatus === "Approved" ? approvedHours : 0,
        overtimeRemarks: draft.overtimeRemarks || null,
        updatedBy: user?.userId ?? user?.id ?? null,
      });
      toast.success("Overtime updated");
      await fetchOvertime();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update overtime");
    } finally {
      setSavingId(null);
    }
  };

  const resetFilters = () => {
    setFilters((prev) => ({
      companyId: prev.companyId || selectedCompanyId || "",
      overtimeStatus: "Pending",
      dateFrom: "",
      dateTo: "",
      q: "",
    }));
  };

  return (
    <div className="h-full flex flex-col px-6 gap-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {isSuperAdmin && (
            <div>
              <label className="block font-medium text-gray-700 mb-2">Company</label>
              <select
                value={filters.companyId}
                onChange={(e) => setFilters((prev) => ({ ...prev, companyId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Select Company</option>
                {companies.map((company) => (
                  <option key={company.companyId} value={company.companyId}>
                    {company.companyName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-medium text-gray-700 mb-2">OT Status</label>
            <select
              value={filters.overtimeStatus}
              onChange={(e) => setFilters((prev) => ({ ...prev, overtimeStatus: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="All">All</option>
            </select>
          </div>

          <Input
            label="Date From"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
          />

          <Input
            label="Date To"
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
          />

          <Input
            label="Staff Search"
            value={filters.q}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
            placeholder="Staff no / name"
          />
        </div>

        <div className="flex flex-wrap justify-between items-center mt-4 gap-3">
          <div className="text-xs text-slate-600">
            Records: <span className="font-semibold">{summary.count}</span>
            <span className="mx-2">|</span>
            Requested: <span className="font-semibold">{toHours(summary.requested)}</span>
            <span className="mx-2">|</span>
            Approved: <span className="font-semibold">{toHours(summary.approved)}</span>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={resetFilters}>
              Reset
            </Button>
            <Button onClick={fetchOvertime}>Refresh</Button>
          </div>
        </div>

        {Object.keys(summary.byStatus).length > 0 && (
          <div className="mt-3 text-xs text-slate-600">
            {Object.entries(summary.byStatus)
              .map(([status, count]) => `${status}: ${count}`)
              .join(" | ")}
          </div>
        )}
      </div>

      {!effectiveCompanyId && (
        <div className="border border-amber-200 bg-amber-50 text-amber-800 rounded-lg p-4 text-sm">
          {isSuperAdmin ? "Select a company to view overtime." : "Company scope not available for this user."}
        </div>
      )}

      <MasterTable
        columns={[
          "Date",
          "Staff No",
          "Staff Name",
          "Shift End",
          "Check-Out",
          "Requested OT",
          "Approved OT",
          "Status",
          "Remarks",
          "Reviewed By",
          ...(canEdit ? ["Action"] : []),
        ]}
        loading={loading}
        emptyMessage="No overtime records found"
        defaultRowsPerPage={10}
      >
        {rows.map((row) => {
          const draft = drafts[row.attendanceId] || {};
          const requestedHours = Number(row.overtimeRequestedHours || row.overtimeHours || 0);

          return (
            <tr key={row.attendanceId} className="border-t hover:bg-gray-50">
              <td className="py-3 px-4 whitespace-nowrap">{row.attendanceDate || "-"}</td>
              <td className="py-3 px-4 whitespace-nowrap">{row.employee?.staffNumber || "-"}</td>
              <td className="py-3 px-4 whitespace-nowrap">{getEmployeeName(row.employee)}</td>
              <td className="py-3 px-4 whitespace-nowrap">{row.scheduledEndTime || "-"}</td>
              <td className="py-3 px-4 whitespace-nowrap">{formatDateTime(row.lastCheckOut)}</td>
              <td className="py-3 px-4 whitespace-nowrap">{toHours(requestedHours)}</td>
              <td className="py-3 px-4 min-w-32">
                {canEdit ? (
                  <input
                    type="number"
                    min="0"
                    max={requestedHours}
                    step="0.25"
                    value={draft.overtimeApprovedHours ?? 0}
                    onChange={(e) => updateDraft(row.attendanceId, "overtimeApprovedHours", e.target.value)}
                    disabled={draft.overtimeStatus !== "Approved"}
                    className="w-28 border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100"
                  />
                ) : (
                  toHours(row.overtimeApprovedHours)
                )}
              </td>
              <td className="py-3 px-4 min-w-36">
                {canEdit ? (
                  <select
                    value={draft.overtimeStatus || "Pending"}
                    onChange={(e) => updateDraft(row.attendanceId, "overtimeStatus", e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                ) : (
                  row.overtimeStatus || "-"
                )}
              </td>
              <td className="py-3 px-4 min-w-56">
                {canEdit ? (
                  <input
                    value={draft.overtimeRemarks || ""}
                    onChange={(e) => updateDraft(row.attendanceId, "overtimeRemarks", e.target.value)}
                    placeholder="Remarks"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                ) : (
                  row.overtimeRemarks || "-"
                )}
              </td>
              <td className="py-3 px-4 whitespace-nowrap">{row.overtimeApprover?.userName || "-"}</td>
              {canEdit && (
                <td className="py-3 px-4">
                  <Button
                    type="button"
                    onClick={() => saveOvertime(row)}
                    disabled={savingId === row.attendanceId}
                    className="px-4 py-2"
                  >
                    {savingId === row.attendanceId ? "Saving..." : "Save"}
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
