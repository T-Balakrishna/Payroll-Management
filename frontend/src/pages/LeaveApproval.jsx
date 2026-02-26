import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import API from "../api";
import MasterHeader from "../components/common/MasterHeader";
import MasterTable from "../components/common/MasterTable";

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
  const [selectedCompany, setSelectedCompany] = useState(baseCompanyId ? String(baseCompanyId) : "");
  const [selectedDepartment, setSelectedDepartment] = useState(
    baseDepartmentId ? String(baseDepartmentId) : ""
  );
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [search, setSearch] = useState("");

  const canChooseCompany = String(effectiveRole).toLowerCase() === "super admin";
  const canChooseDepartment = ["admin", "departmentadmin"].includes(
    String(effectiveRole).toLowerCase()
  );

  const resolvedCompany = canChooseCompany ? selectedCompany : String(baseCompanyId || "");
  const resolvedDepartment = canChooseDepartment
    ? selectedDepartment
    : String(baseDepartmentId || "");

  const scopedDepartments = useMemo(() => {
    if (!resolvedCompany) return departments;
    return departments.filter((d) => Number(d.companyId) === Number(resolvedCompany));
  }, [departments, resolvedCompany]);

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

  const loadRequests = async () => {
    if (!resolvedCompany) return;
    setLoading(true);
    try {
      const params = { companyId: resolvedCompany };
      if (resolvedDepartment) params.departmentId = resolvedDepartment;
      if (statusFilter) params.status = statusFilter;

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
      setSelectedCompany(String(baseCompanyId));
    }
  }, [baseCompanyId, canChooseCompany]);

  useEffect(() => {
    if (canChooseDepartment && baseDepartmentId && !selectedDepartment) {
      setSelectedDepartment(String(baseDepartmentId));
    }
  }, [baseDepartmentId, canChooseDepartment, selectedDepartment]);

  useEffect(() => {
    loadRequests();
  }, [resolvedCompany, resolvedDepartment, statusFilter]);

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
        onAddNew={loadRequests}
        onRefresh={loadRequests}
        placeholder="Search by request id, staff, leave type or status..."
        buttonText="Apply Filters"
        actions={
          <>
            <select
              value={resolvedCompany}
              onChange={(e) => canChooseCompany && setSelectedCompany(e.target.value)}
              disabled={!canChooseCompany}
              className="h-10 min-w-44 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{canChooseCompany ? "Select company" : selectedCompanyName || "Company"}</option>
              {companies.map((c) => (
                <option key={c.companyId} value={c.companyId}>
                  {c.companyName}
                </option>
              ))}
            </select>

            <select
              value={resolvedDepartment}
              onChange={(e) => canChooseDepartment && setSelectedDepartment(e.target.value)}
              disabled={!canChooseDepartment}
              className="h-10 min-w-44 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All departments</option>
              {scopedDepartments.map((d) => (
                <option key={d.departmentId} value={d.departmentId}>
                  {d.departmentName}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 min-w-36 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="">All</option>
            </select>
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
