import { useEffect, useMemo, useState } from "react";
import { Calendar, FileText, Loader2, Plus, Save, User, Briefcase, AlertCircle, TrendingDown } from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import API from "../api";
import { useAuth } from "../auth/AuthContext";

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

const parseDocumentPaths = (raw) =>
  String(raw || "").split("\n").map((v) => v.trim()).filter(Boolean);

const initialFormState = {
  leaveTypeId: "", startDate: "", endDate: "", leaveCategory: "Full Day",
  halfDayType: "", reason: "", contactDuringLeave: "", addressDuringLeave: "",
  hasDocuments: false, documentPathsInput: "", notes: "",
};

const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm";
const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

export default function TakeLeavePage({ empId, companyId }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submittingType, setSubmittingType] = useState("");
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [totalLeavesAvailed, setTotalLeavesAvailed] = useState(0);
  const [formData, setFormData] = useState(initialFormState);
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [autoDraftLoaded, setAutoDraftLoaded] = useState(false);

  const resolvedStaffId = useMemo(
    () => empId || user?.staffId || user?.employeeId || null,
    [empId, user?.staffId, user?.employeeId]
  );
  const resolvedCompanyId = useMemo(
    () => companyId || user?.companyId || null,
    [companyId, user?.companyId]
  );
  const totalDays = useMemo(() => calculateTotalDays(formData), [formData]);

  useEffect(() => {
    setAutoDraftLoaded(false);
    setCurrentDraftId(null);
  }, [resolvedStaffId, resolvedCompanyId]);

  const mapDraftToForm = (row) => ({
    leaveTypeId: row?.leaveTypeId ? String(row.leaveTypeId) : "",
    startDate: row?.startDate || "",
    endDate: row?.endDate || "",
    leaveCategory: row?.leaveCategory || "Full Day",
    halfDayType: row?.halfDayType || "",
    reason: row?.reason || "",
    contactDuringLeave: row?.contactDuringLeave || "",
    addressDuringLeave: row?.addressDuringLeave || "",
    hasDocuments: Boolean(row?.hasDocuments),
    documentPathsInput: Array.isArray(row?.documentPaths) ? row.documentPaths.join("\n") : "",
    notes: row?.notes || "",
  });

  const loadLeaveData = async () => {
    if (!resolvedStaffId || !resolvedCompanyId) return;
    setLoading(true);
    try {
      const [typesRes, allocationsRes] = await Promise.all([
        API.get("/leaveTypes"),
        API.get("/leaveAllocations", {
          params: { companyId: resolvedCompanyId, staffId: resolvedStaffId, status: "Active" },
        }),
      ]);
      const filteredTypes = (typesRes.data || []).filter(
        (t) =>
          Number(t.companyId) === Number(resolvedCompanyId) &&
          String(t.status || "Active").toLowerCase() === "active"
      );
      setLeaveTypes(filteredTypes);
      const allocations = (allocationsRes.data || []).filter(
        (a) =>
          Number(a.staffId) === Number(resolvedStaffId) &&
          Number(a.companyId) === Number(resolvedCompanyId)
      );

      const today = new Date();
      const currentYear = today.getFullYear();
      const currentYearAvailed = allocations
        .filter((a) => {
          const from = a.effectiveFrom ? new Date(`${a.effectiveFrom}T00:00:00`) : null;
          const to = a.effectiveTo ? new Date(`${a.effectiveTo}T23:59:59`) : null;
          if (from && to && !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
            return today >= from && today <= to;
          }
          const allocatedDate = a.allocatedDate ? new Date(`${a.allocatedDate}T00:00:00`) : null;
          return allocatedDate && allocatedDate.getFullYear() === currentYear;
        })
        .reduce((sum, a) => sum + Number(a.usedLeaves || 0), 0);
      setTotalLeavesAvailed(Number(currentYearAvailed.toFixed(2)));

      const balances = filteredTypes.map((t) => {
        const matched = allocations.find((a) => Number(a.leaveTypeId) === Number(t.leaveTypeId));
        const allocated = Number(matched?.allocatedLeaves || 0);
        const carried = Number(matched?.carryForwardFromPrevious || 0);
        const accrued = Number(matched?.totalAccruedTillDate || 0);
        const used = Number(matched?.usedLeaves || 0);
        const available = Math.max(0, carried + accrued - used);
        return {
          leaveTypeId: t.leaveTypeId, name: t.name,
          allocated, used, available: Number(available.toFixed(2)),
        };
      });
      setLeaveBalances(balances);
    } catch (error) {
      showErrorAlert(getApiErrorMessage(error, "Failed to load leave data"));
      setLeaveTypes([]);
      setLeaveBalances([]);
      setTotalLeavesAvailed(0);
    } finally {
      setLoading(false);
    }
  };

  const loadDrafts = async () => {
    if (!resolvedStaffId || !resolvedCompanyId) return;
    try {
      const res = await API.get("/leaveRequests", {
        params: { companyId: resolvedCompanyId, staffId: resolvedStaffId, status: "Draft" },
      });
      const rows = res.data || [];
      if (!autoDraftLoaded && rows.length > 0) {
        const latest = rows[0];
        const mapped = mapDraftToForm(latest);
        setCurrentDraftId(latest.leaveRequestId);
        setFormData(mapped);
        setAutoDraftLoaded(true);
        toast.info("Latest draft loaded");
      } else if (!autoDraftLoaded && rows.length === 0) {
        setAutoDraftLoaded(true);
      }
    } catch (error) {
      showErrorAlert(getApiErrorMessage(error, "Failed to load drafts"));
    }
  };

  useEffect(() => {
    loadLeaveData();
    loadDrafts();
  }, [resolvedStaffId, resolvedCompanyId]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const showErrorAlert = async (message) => {
    await Swal.fire({
      title: "Unable to Submit",
      text: message,
      icon: "error",
      background: "#ffffff",
      color: "#1e293b",
      confirmButtonColor: "#ef4444",
    });
  };

  const getApiErrorMessage = (error, fallback = "Something went wrong") => {
    const data = error?.response?.data;
    const possibleMessages = [
      data?.error, data?.message,
      Array.isArray(data?.errors) ? data.errors.join(", ") : null,
      error?.message,
    ];
    const selected = possibleMessages.find(
      (value) => typeof value === "string" && value.trim().length > 0
    );
    return selected || fallback;
  };

  const validateForm = (targetStatus) => {
    if (!resolvedStaffId || !resolvedCompanyId) return { ok: false, message: "Employee/company context not available" };
    if (!formData.leaveTypeId || !formData.startDate || !formData.endDate || !formData.reason.trim()) return { ok: false, message: "Please fill all mandatory fields" };
    if (new Date(formData.endDate) < new Date(formData.startDate)) return { ok: false, message: "End date cannot be earlier than start date" };
    if (formData.leaveCategory === "Half Day" && !formData.halfDayType) return { ok: false, message: "Half day type is required" };
    if (totalDays <= 0) return { ok: false, message: "Total days must be greater than zero" };
    if (formData.hasDocuments && parseDocumentPaths(formData.documentPathsInput).length === 0) return { ok: false, message: "Add at least one document path when documents are enabled" };
    const selectedLeaveBalance = leaveBalances.find((b) => Number(b.leaveTypeId) === Number(formData.leaveTypeId));
    if (!selectedLeaveBalance) return { ok: false, message: "Selected leave type balance is not available" };
    if (Number(totalDays) > Number(selectedLeaveBalance.available || 0)) return { ok: false, message: "Not enough leave balance" };
    if (targetStatus === "Pending" && !formData.reason.trim()) return { ok: false, message: "Reason is required to submit a request" };
    return { ok: true, message: "" };
  };

  const submitRequest = async (targetStatus, options = {}) => {
    const { skipConfirm = false, skipSuccessPopup = false } = options;
    const validation = validateForm(targetStatus);
    if (!validation.ok) {
      await showErrorAlert(validation.message || "Invalid leave request");
      return false;
    }

    const isSubmit = targetStatus === "Pending";
    if (!skipConfirm) {
      const confirm = await Swal.fire({
        title: isSubmit ? "Submit Leave Request?" : "Save as Draft?",
        html: isSubmit
          ? `<p style="color:#64748b;font-size:14px;">Your request for <strong style="color:#1e293b">${totalDays} day(s)</strong> will be sent for approval.</p>`
          : `<p style="color:#64748b;font-size:14px;">Your leave request will be saved as a draft.</p>`,
        icon: isSubmit ? "question" : "info",
        showCancelButton: true,
        confirmButtonText: isSubmit ? "Yes, submit" : "Save draft",
        cancelButtonText: "Cancel",
        background: "#ffffff",
        color: "#1e293b",
        confirmButtonColor: isSubmit ? "#6366f1" : "#f59e0b",
        cancelButtonColor: "#e2e8f0",
      });
      if (!confirm.isConfirmed) return false;
    }

    const documentPaths = formData.hasDocuments ? parseDocumentPaths(formData.documentPathsInput) : [];
    const payload = {
      staffId: Number(resolvedStaffId), leaveTypeId: Number(formData.leaveTypeId),
      companyId: Number(resolvedCompanyId), startDate: formData.startDate, endDate: formData.endDate,
      totalDays, leaveCategory: formData.leaveCategory,
      halfDayType: formData.leaveCategory === "Half Day" ? formData.halfDayType : null,
      reason: formData.reason.trim(), hasDocuments: formData.hasDocuments, documentPaths,
      contactDuringLeave: formData.contactDuringLeave.trim() || null,
      addressDuringLeave: formData.addressDuringLeave.trim() || null,
      notes: formData.notes.trim() || null, status: targetStatus,
      currentApprovalLevel: targetStatus === "Pending" ? 1 : 0, maxApprovalLevel: 1,
      appliedDate: targetStatus === "Pending" ? new Date() : null,
      createdBy: user?.id || null, updatedBy: user?.id || null,
      actionBy: Number(resolvedStaffId),
    };

    setSubmittingType(targetStatus);
    try {
      let savedId = currentDraftId;
      if (currentDraftId) {
        await API.put(`/leaveRequests/${currentDraftId}`, payload);
      } else {
        const { data } = await API.post("/leaveRequests", payload);
        savedId = data?.leaveRequestId || null;
      }

      if (!skipSuccessPopup) {
        await Swal.fire({
          title: isSubmit ? "Request Submitted!" : "Draft Saved!",
          text: isSubmit ? "Your leave request has been submitted for approval." : "Your draft has been saved.",
          icon: "success",
          background: "#ffffff",
          color: "#1e293b",
          confirmButtonColor: "#6366f1",
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false,
        });
      }

      toast.success(isSubmit ? "Leave request submitted" : "Draft saved");
      if (targetStatus === "Pending") {
        setFormData(initialFormState);
        setCurrentDraftId(null);
      } else {
        setCurrentDraftId(savedId || null);
      }
      await loadLeaveData();
      await loadDrafts();
      return true;
    } catch (error) {
      const apiMessage = getApiErrorMessage(error, "Failed to save leave request");
      const finalMessage = /insufficient|exceed|balance/i.test(String(apiMessage)) ? "Not enough leave balance" : apiMessage;
      await showErrorAlert(finalMessage);
      return false;
    } finally {
      setSubmittingType("");
    }
  };

  const cardAccents = [
    { border: "border-blue-200", bg: "hover:bg-blue-50", num: "text-blue-600", top: "bg-gradient-to-r from-blue-400 to-sky-400", bar: "bg-blue-100" },
    { border: "border-indigo-200", bg: "hover:bg-indigo-50", num: "text-indigo-600", top: "bg-gradient-to-r from-indigo-400 to-violet-400", bar: "bg-indigo-100" },
    { border: "border-amber-200", bg: "hover:bg-amber-50", num: "text-amber-600", top: "bg-gradient-to-r from-amber-400 to-orange-400", bar: "bg-amber-100" },
    { border: "border-emerald-200", bg: "hover:bg-emerald-50", num: "text-emerald-600", top: "bg-gradient-to-r from-emerald-400 to-teal-400", bar: "bg-emerald-100" },
    { border: "border-rose-200", bg: "hover:bg-rose-50", num: "text-rose-600", top: "bg-gradient-to-r from-rose-400 to-pink-400", bar: "bg-rose-100" },
  ];

  return (
    <div className="min-h-full bg-gray-50 p-6 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leave Request</h1>
            <p className="text-xs text-gray-500 mt-0.5">Fill all required details and submit for approval</p>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-4 h-4 text-gray-400" />
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Available Leave Balances</h2>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> Loading balances...
            </div>
          ) : leaveBalances.length === 0 ? (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              No leave allocations found for this employee.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {leaveBalances.map((b, i) => {
                const accent = cardAccents[i % cardAccents.length];
                const usedPct = b.allocated > 0 ? Math.min(100, (b.used / b.allocated) * 100) : 0;
                return (
                  <div
                    key={b.leaveTypeId}
                    className={`relative rounded-xl border bg-white overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${accent.border} ${accent.bg}`}
                  >
                    <div className={`h-1 w-full ${accent.top}`} />
                    <div className="p-4">
                      <p className="text-sm font-bold text-gray-800 mb-3">{b.name}</p>
                      <div className="flex items-baseline gap-1.5 mb-3">
                        <span className={`text-4xl font-bold ${accent.num}`}>{b.available}</span>
                        <span className="text-xs text-gray-400 font-medium">days left</span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full ${accent.bar} mb-2`}>
                        <div className={`h-full rounded-full ${accent.top}`} style={{ width: `${usedPct}%` }} />
                      </div>
                      <div className="flex gap-4">
                        <span className="text-xs text-gray-400">Used: <span className="text-gray-600 font-semibold">{b.used}</span></span>
                        <span className="text-xs text-gray-400">Allocated: <span className="text-gray-600 font-semibold">{b.allocated}</span></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => { e.preventDefault(); submitRequest("Pending"); }}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-gray-800">Request Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Staff ID */}
            <div>
              <label className={labelCls}>
                <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> Staff ID</span>
              </label>
              <input value={resolvedStaffId || ""} readOnly className={inputCls} />
            </div>

            {/* Leave Type */}
            <div>
              <label className={labelCls}>Leave Type <span className="text-red-500">*</span></label>
              <select name="leaveTypeId" value={formData.leaveTypeId} onChange={onChange} required className={inputCls}>
                <option value="">Select leave type</option>
                {leaveTypes.map((t) => (
                  <option key={t.leaveTypeId} value={t.leaveTypeId}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Leave Category */}
            <div>
              <label className={labelCls}>Leave Category <span className="text-red-500">*</span></label>
              <select name="leaveCategory" value={formData.leaveCategory} onChange={onChange} className={inputCls}>
                <option value="Full Day">Full Day</option>
                <option value="Half Day">Half Day</option>
                <option value="Short Leave">Short Leave</option>
              </select>
            </div>

            {/* Half Day Type */}
            <div>
              <label className={labelCls}>Half Day Type</label>
              <select name="halfDayType" value={formData.halfDayType} onChange={onChange} disabled={formData.leaveCategory !== "Half Day"} className={inputCls}>
                <option value="">Select half day type</option>
                <option value="First Half">First Half</option>
                <option value="Second Half">Second Half</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className={labelCls}>
                <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Start Date <span className="text-red-500">*</span></span>
              </label>
              <input type="date" name="startDate" value={formData.startDate} onChange={onChange} required className={inputCls} />
            </div>

            {/* End Date */}
            <div>
              <label className={labelCls}>
                <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> End Date <span className="text-red-500">*</span></span>
              </label>
              <input type="date" name="endDate" value={formData.endDate} onChange={onChange} required className={inputCls} />
            </div>

            {/* Contact */}
            <div>
              <label className={labelCls}>Contact During Leave</label>
              <input name="contactDuringLeave" value={formData.contactDuringLeave} onChange={onChange} placeholder="Phone number" className={inputCls} />
            </div>

            {/* Documents checkbox */}
            <div className="flex items-end">
              <label className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-all shadow-sm">
                <input type="checkbox" name="hasDocuments" checked={formData.hasDocuments} onChange={onChange} className="w-4 h-4 rounded accent-indigo-500" />
                <span className="text-sm text-gray-600 font-medium">Supporting documents attached</span>
              </label>
            </div>

            {/* Reason */}
            <div className="md:col-span-2">
              <label className={labelCls}>Reason <span className="text-red-500">*</span></label>
              <textarea name="reason" value={formData.reason} onChange={onChange} rows={3} required placeholder="Enter your leave reason..." className={`${inputCls} resize-y min-h-[90px]`} />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className={labelCls}>Address During Leave</label>
              <textarea name="addressDuringLeave" value={formData.addressDuringLeave} onChange={onChange} rows={2} placeholder="Where can we reach you during leave?" className={`${inputCls} resize-y`} />
            </div>

            {/* Document Paths */}
            {formData.hasDocuments && (
              <div className="md:col-span-2">
                <label className={labelCls}>Document Paths <span className="text-red-500">*</span></label>
                <textarea name="documentPathsInput" value={formData.documentPathsInput} onChange={onChange} rows={3} placeholder={"One file path per line\nuploads/leave/medical-cert-1.pdf"} className={`${inputCls} resize-y`} />
                <p className="text-xs text-gray-400 mt-1.5 pl-1">Enter one file path per line</p>
              </div>
            )}

            {/* Notes */}
            <div className="md:col-span-2">
              <label className={labelCls}>Internal Notes</label>
              <textarea name="notes" value={formData.notes} onChange={onChange} rows={2} placeholder="Optional internal note..." className={`${inputCls} resize-y`} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-5 border-t border-gray-100">

            {/* Day counter */}
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-indigo-200 bg-indigo-50">
              <TrendingDown className="w-5 h-5 text-indigo-500" />
              <div>
                <span className="text-3xl font-bold text-indigo-600 leading-none">{totalLeavesAvailed}</span>
                <span className="text-xs text-gray-500 ml-2">total leaves availed (current year)</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => submitRequest("Draft")}
                disabled={Boolean(submittingType)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-gray-500 hover:text-amber-600 font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {submittingType === "Draft" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Draft
              </button>

              <button
                type="submit"
                disabled={Boolean(submittingType)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-sm shadow-md shadow-indigo-200 hover:shadow-indigo-300 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {submittingType === "Pending" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Submit Request
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}