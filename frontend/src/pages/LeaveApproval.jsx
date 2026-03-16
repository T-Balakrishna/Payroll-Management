import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import API from "../api";
import MasterHeader from "../components/common/MasterHeader";
import MasterTable from "../components/common/MasterTable";

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

export default function LeaveApproval({
  role,
  companyId,
  departmentId,
  selectedCompanyId,
  selectedCompanyName,
  userId,
}) {
  const effectiveRole = role || "";
  const baseCompanyId = selectedCompanyId || companyId || null;
  const baseDepartmentId = departmentId || null;

  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState(
    baseCompanyId ? [String(baseCompanyId)] : []
  );
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState(
    baseDepartmentId ? [String(baseDepartmentId)] : []
  );
  const [statusFilters, setStatusFilters] = useState(["Pending"]);
  const [appliedFilters, setAppliedFilters] = useState({
    companyIds: baseCompanyId ? [String(baseCompanyId)] : [],
    departmentIds: baseDepartmentId ? [String(baseDepartmentId)] : [],
    statuses: ["Pending"],
  });
  const [search, setSearch] = useState("");

  const canChooseCompany = String(effectiveRole).toLowerCase() === "super admin";
  const canChooseDepartment = ["admin", "departmentadmin"].includes(
    String(effectiveRole).toLowerCase()
  );

  const resolvedCompanyIds = canChooseCompany
    ? selectedCompanyIds
    : baseCompanyId
    ? [String(baseCompanyId)]
    : [];
  const resolvedDepartmentIds = canChooseDepartment
    ? selectedDepartmentIds
    : baseDepartmentId
    ? [String(baseDepartmentId)]
    : [];

  const scopedDepartments = useMemo(() => {
    if (resolvedCompanyIds.length === 0) return departments;
    const scopeSet = new Set(resolvedCompanyIds.map(String));
    return departments.filter((d) => scopeSet.has(String(d.companyId)));
  }, [departments, resolvedCompanyIds]);

  const getApiErrorMessage = (error, fallback = "Something went wrong") => {
    const data = error?.response?.data;
    const candidates = [
      data?.error,
      data?.message,
      Array.isArray(data?.errors) ? data.errors.join(", ") : null,
      error?.message,
    ];
    const msg = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
    return msg || fallback;
  };

  const showErrorAlert = async (message) => {
    await Swal.fire({
      title: "Action Failed",
      text: message,
      icon: "error",
      background: "#0f172a",
      color: "#f1f5f9",
      confirmButtonColor: "#ef4444",
    });
  };

  const loadMasters = async () => {
    try {
      const [companiesRes, departmentsRes] = await Promise.all([
        API.get("/companies"),
        API.get("/departments"),
      ]);
      setCompanies(companiesRes.data || []);
      setDepartments(departmentsRes.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to load filter data");
    }
  };

  const loadRequests = async (nextFilters = appliedFilters) => {
    if (nextFilters.companyIds.length === 0) return;
    setLoading(true);
    try {
      const params = buildQueryParams({
        companyId: nextFilters.companyIds,
        departmentId: nextFilters.departmentIds,
        status: nextFilters.statuses,
      });
      const res = await API.get("/leaveRequests", { params });
      setRequests(res.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to load leave requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasters();
  }, []);

  useEffect(() => {
    if (!canChooseCompany && baseCompanyId) {
      setSelectedCompanyIds([String(baseCompanyId)]);
    }
  }, [baseCompanyId, canChooseCompany]);

  useEffect(() => {
    if (canChooseDepartment && baseDepartmentId && selectedDepartmentIds.length === 0) {
      setSelectedDepartmentIds([String(baseDepartmentId)]);
    }
  }, [baseDepartmentId, canChooseDepartment, selectedDepartmentIds.length]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;

    return requests.filter((row) => {
      const staffText = row.employee
        ? `${row.employee.firstName || ""} ${row.employee.lastName || ""}`.trim() ||
          row.employee.staffNumber
        : String(row.staffId || "");
      const leaveTypeText =
        row.leaveType?.name || row.leaveType?.leaveTypeName || String(row.leaveTypeId || "");
      const dateRangeText = `${row.startDate || ""} ${row.endDate || ""}`.trim();

      return [
        row.leaveRequestId,
        staffText,
        row.employee?.staffNumber,
        leaveTypeText,
        dateRangeText,
        row.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [requests, search]);

  const handleApplyFilters = async () => {
    const nextFilters = {
      companyIds: resolvedCompanyIds,
      departmentIds: resolvedDepartmentIds,
      statuses: statusFilters,
    };
    setAppliedFilters(nextFilters);
    await loadRequests(nextFilters);
  };

  const handleResetFilters = () => {
    setSelectedCompanyIds(baseCompanyId ? [String(baseCompanyId)] : []);
    setSelectedDepartmentIds(baseDepartmentId ? [String(baseDepartmentId)] : []);
    setStatusFilters(["Pending"]);
  };

  const updateStatus = async (row, newStatus) => {
    setSavingId(row.leaveRequestId);
    try {
      await API.put(`/leaveRequests/${row.leaveRequestId}`, {
        status: newStatus,
        updatedBy: userId || null,
        actionBy: row.staffId,
      });
      toast.success(`Request ${newStatus}`);
      await loadRequests();
    } catch (error) {
      const apiMessage = getApiErrorMessage(
        error,
        `Failed to ${newStatus.toLowerCase()} request`
      );
      const finalMessage =
        newStatus === "Approved" && /insufficient|exceed|balance|not enough/i.test(apiMessage)
          ? "Cannot approve this leave: Not enough leave balance"
          : apiMessage;
      await showErrorAlert(finalMessage);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col px-6">
      <MasterHeader
        search={search}
        setSearch={setSearch}
        onAddNew={handleApplyFilters}
        onRefresh={handleApplyFilters}
        placeholder="Search by request id, staff, leave type or status..."
        buttonText="Apply Filters"
        actions={
          <>
            {canChooseCompany && (
              <div className="flex flex-wrap items-center gap-2">
                {companies.map((c) => (
                  <label key={c.companyId} className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                      checked={selectedCompanyIds.includes(String(c.companyId))}
                      onChange={() => {
                        setSelectedCompanyIds((prev) => toggleValue(prev, String(c.companyId)));
                        setSelectedDepartmentIds([]);
                      }}
                    />
                    <span>{c.companyName}</span>
                  </label>
                ))}
              </div>
            )}

            {canChooseDepartment && (
              <div className="flex flex-wrap items-center gap-2">
                {scopedDepartments.map((d) => (
                  <label key={d.departmentId} className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                      checked={selectedDepartmentIds.includes(String(d.departmentId))}
                      onChange={() => setSelectedDepartmentIds((prev) => toggleValue(prev, String(d.departmentId)))}
                    />
                    <span>{d.departmentName}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {["Pending", "Approved", "Rejected"].map((status) => (
                <label key={status} className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                    checked={statusFilters.includes(status)}
                    onChange={() => setStatusFilters((prev) => toggleValue(prev, status))}
                  />
                  <span>{status}</span>
                </label>
              ))}
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
              >
                Reset
              </button>
            </div>
          </>
        }
      />

      <MasterTable
        columns={["Request ID", "Staff", "Leave Type", "Date Range", "Days", "Status", "Actions"]}
        loading={loading}
        emptyMessage="No leave requests found for current filters"
      >
        {filteredRequests.map((row) => (
          <tr key={row.leaveRequestId} className="border-t border-gray-100">
            <td className="py-3 px-4">{row.leaveRequestId}</td>
            <td className="py-3 px-4">
              {row.employee
                ? `${row.employee.firstName || ""} ${row.employee.lastName || ""}`.trim() ||
                  row.employee.staffNumber
                : row.staffId}
            </td>
            <td className="py-3 px-4">
              {row.leaveType?.name || row.leaveType?.leaveTypeName || row.leaveTypeId}
            </td>
            <td className="py-3 px-4">{row.startDate} to {row.endDate}</td>
            <td className="py-3 px-4">{row.totalDays}</td>
            <td className="py-3 px-4">{row.status}</td>
            <td className="py-3 px-4">
              {row.status === "Pending" ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateStatus(row, "Approved")}
                    disabled={savingId === row.leaveRequestId}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(row, "Rejected")}
                    disabled={savingId === row.leaveRequestId}
                    className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </div>
              ) : (
                <span className="text-gray-500">-</span>
              )}
            </td>
          </tr>
        ))}
      </MasterTable>
    </div>
  );
}
