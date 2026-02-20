import { useEffect, useMemo, useState } from "react";
import { Calendar, FileText, Loader2, Plus, User } from "lucide-react";
import { toast } from "react-toastify";
import API from "../api";
import { useAuth } from "../auth/AuthContext";

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB");
};

const getStatusClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return "bg-green-50 text-green-700 border-green-200";
  if (s === "rejected") return "bg-red-50 text-red-700 border-red-200";
  if (s === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
};

const calculateTotalDays = ({ startDate, endDate, leaveCategory }) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;

  if (leaveCategory === "Half Day") return 0.5;
  if (leaveCategory === "Short Leave") return 0.25;

  const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 0;
};

export default function TakeLeavePage({ empId, companyId }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [requests, setRequests] = useState([]);

  const [formData, setFormData] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    leaveCategory: "Full Day",
    halfDayType: "",
    reason: "",
  });

  const resolvedStaffId = useMemo(
    () => empId || user?.staffId || user?.employeeId || null,
    [empId, user?.staffId, user?.employeeId]
  );
  const resolvedCompanyId = useMemo(() => companyId || user?.companyId || null, [companyId, user?.companyId]);

  const totalDays = useMemo(() => calculateTotalDays(formData), [formData]);

  const loadLeaveData = async () => {
    if (!resolvedStaffId || !resolvedCompanyId) return;
    setLoading(true);
    try {
      const [typesRes, reqRes] = await Promise.all([API.get("/leaveTypes"), API.get("/leaveRequests")]);

      const filteredTypes = (typesRes.data || []).filter(
        (t) => !resolvedCompanyId || Number(t.companyId) === Number(resolvedCompanyId)
      );
      setLeaveTypes(filteredTypes);

      const filteredRequests = (reqRes.data || [])
        .filter(
          (r) =>
            Number(r.staffId) === Number(resolvedStaffId) &&
            (!resolvedCompanyId || Number(r.companyId) === Number(resolvedCompanyId))
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRequests(filteredRequests);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to load leave data");
      setLeaveTypes([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaveData();
  }, [resolvedStaffId, resolvedCompanyId]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resolvedStaffId || !resolvedCompanyId) {
      toast.error("Employee/company context not available");
      return;
    }
    if (!formData.leaveTypeId || !formData.startDate || !formData.endDate || !formData.reason.trim()) {
      toast.error("Please fill all required fields");
      return;
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast.error("End date cannot be earlier than start date");
      return;
    }
    if (formData.leaveCategory === "Half Day" && !formData.halfDayType) {
      toast.error("Please select half day type");
      return;
    }

    const payload = {
      staffId: resolvedStaffId,
      leaveTypeId: Number(formData.leaveTypeId),
      companyId: resolvedCompanyId,
      startDate: formData.startDate,
      endDate: formData.endDate,
      totalDays,
      leaveCategory: formData.leaveCategory,
      halfDayType: formData.leaveCategory === "Half Day" ? formData.halfDayType : null,
      reason: formData.reason.trim(),
      status: "Pending",
      currentApprovalLevel: 1,
      maxApprovalLevel: 1,
      appliedDate: new Date(),
      createdBy: user?.id || null,
      updatedBy: user?.id || null,
    };

    setSubmitting(true);
    try {
      await API.post("/leaveRequests", payload);
      toast.success("Leave request submitted");
      setFormData({
        leaveTypeId: "",
        startDate: "",
        endDate: "",
        leaveCategory: "Full Day",
        halfDayType: "",
        reason: "",
      });
      await loadLeaveData();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full bg-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Apply Leave</h1>
            <p className="text-gray-600">Submit a leave request using cookie-based login session</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="border border-gray-200 rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" /> Staff ID
              </label>
              <input
                value={resolvedStaffId || ""}
                readOnly
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-700"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Leave Type</label>
              <select
                name="leaveTypeId"
                value={formData.leaveTypeId}
                onChange={onChange}
                required
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select leave type</option>
                {leaveTypes.map((t) => (
                  <option key={t.leaveTypeId} value={t.leaveTypeId}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Leave Category</label>
              <select
                name="leaveCategory"
                value={formData.leaveCategory}
                onChange={onChange}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="Full Day">Full Day</option>
                <option value="Half Day">Half Day</option>
                <option value="Short Leave">Short Leave</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Half Day Type</label>
              <select
                name="halfDayType"
                value={formData.halfDayType}
                onChange={onChange}
                disabled={formData.leaveCategory !== "Half Day"}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 disabled:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select half</option>
                <option value="First Half">First Half</option>
                <option value="Second Half">Second Half</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" /> Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={onChange}
                required
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" /> End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={onChange}
                required
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Reason</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={onChange}
              rows={3}
              required
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Enter leave reason"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Total Days: <span className="font-semibold text-gray-900">{totalDays}</span>
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60 flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Submit Request
            </button>
          </div>
        </form>

        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">My Leave Requests</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="text-left bg-white border-b border-gray-200">
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">From</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">To</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">Days</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">Category</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-gray-600" colSpan={6}>
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading requests...
                      </div>
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-gray-500" colSpan={6}>
                      No leave requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.leaveRequestId} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {r.leaveType?.name || `#${r.leaveTypeId}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">{formatDate(r.startDate)}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{formatDate(r.endDate)}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{r.totalDays}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{r.leaveCategory}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-1 text-xs rounded-full border ${getStatusClass(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
