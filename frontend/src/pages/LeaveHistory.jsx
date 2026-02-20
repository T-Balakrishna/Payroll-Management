import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "react-toastify";
import API from "../api";

export default function LeaveHistory({
  role,
  companyId,
  departmentId,
  selectedCompanyId,
  selectedCompanyName,
}) {
  const effectiveRole = role || "";
  const baseCompanyId = selectedCompanyId || companyId || null;
  const baseDepartmentId = departmentId || null;

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(baseCompanyId ? String(baseCompanyId) : "");
  const [selectedDepartment, setSelectedDepartment] = useState(
    baseDepartmentId ? String(baseDepartmentId) : ""
  );

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

  const loadMasters = async () => {
    try {
      const [companiesRes, departmentsRes] = await Promise.all([
        API.get("/companies"),
        API.get("/departments"),
      ]);
      setCompanies(companiesRes.data || []);
      setDepartments(departmentsRes.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to load filters");
    }
  };

  const loadHistory = async () => {
    if (!resolvedCompany) return;
    setLoading(true);
    try {
      const params = { companyId: resolvedCompany };
      if (resolvedDepartment) params.departmentId = resolvedDepartment;
      const res = await API.get("/leaveRequestHistories", { params });
      setRows(res.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to load leave history");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasters();
  }, []);

  useEffect(() => {
    if (!canChooseCompany && baseCompanyId) setSelectedCompany(String(baseCompanyId));
  }, [baseCompanyId, canChooseCompany]);

  useEffect(() => {
    if (canChooseDepartment && baseDepartmentId && !selectedDepartment) {
      setSelectedDepartment(String(baseDepartmentId));
    }
  }, [baseDepartmentId, canChooseDepartment, selectedDepartment]);

  useEffect(() => {
    loadHistory();
  }, [resolvedCompany, resolvedDepartment]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Leave Request History</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Company</label>
            <select
              value={resolvedCompany}
              onChange={(e) => canChooseCompany && setSelectedCompany(e.target.value)}
              disabled={!canChooseCompany}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100"
            >
              <option value="">{canChooseCompany ? "Select company" : selectedCompanyName || "Company"}</option>
              {companies.map((c) => (
                <option key={c.companyId} value={c.companyId}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Department</label>
            <select
              value={resolvedDepartment}
              onChange={(e) => canChooseDepartment && setSelectedDepartment(e.target.value)}
              disabled={!canChooseDepartment}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100"
            >
              <option value="">All departments</option>
              {scopedDepartments.map((d) => (
                <option key={d.departmentId} value={d.departmentId}>
                  {d.departmentName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={loadHistory}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Search className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">History ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Request ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Staff</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Status Change</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Comments</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Action Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                    </span>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No leave request history rows found
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.leaveRequestHistoryId} className="border-t border-gray-100">
                    <td className="px-4 py-3">{row.leaveRequestHistoryId}</td>
                    <td className="px-4 py-3">{row.leaveRequestId}</td>
                    <td className="px-4 py-3">
                      {row.request?.employee
                        ? `${row.request.employee.firstName || ""} ${row.request.employee.lastName || ""}`.trim() ||
                          row.request.employee.staffNumber
                        : row.actionBy}
                    </td>
                    <td className="px-4 py-3">{row.action}</td>
                    <td className="px-4 py-3">
                      {(row.oldStatus || "-") + " -> " + (row.newStatus || "-")}
                    </td>
                    <td className="px-4 py-3">{row.comments || "-"}</td>
                    <td className="px-4 py-3">
                      {row.actionDate ? new Date(row.actionDate).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
