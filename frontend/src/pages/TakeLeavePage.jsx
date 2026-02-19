import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, FileText, Plus, User } from 'lucide-react';
import Swal from 'sweetalert2';
import API from '../api';

const initialForm = (empId) => ({
  staffId: empId || '',
  leaveTypeId: '',
  reason: '',
  startDate: '',
  endDate: '',
});

const toNumber = (value) => Number.parseFloat(value || 0);

const calculateRequestedDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return 0;
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
};

const getRemainingBalance = (allocation) => {
  if (!allocation) return 0;

  return (
    toNumber(allocation.carryForwardFromPrevious) +
    toNumber(allocation.totalAccruedTillDate) -
    toNumber(allocation.usedLeaves)
  );
};

export default function TakeLeavePage({ empId, companyId }) {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [allocation, setAllocation] = useState(null);
  const [formData, setFormData] = useState(initialForm(empId));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, staffId: empId || '' }));
  }, [empId]);

  useEffect(() => {
    const loadLeaveTypes = async () => {
      try {
        const params = {
          status: 'Active',
          ...(companyId ? { companyId } : {}),
        };
        const res = await API.get('/leaveTypes', { params });
        setLeaveTypes(res.data || []);
      } catch (err) {
        console.error('Error loading leave types:', err);
        setLeaveTypes([]);
      }
    };

    loadLeaveTypes();
  }, [companyId]);

  useEffect(() => {
    const loadAllocation = async () => {
      if (!formData.staffId || !formData.leaveTypeId) {
        setAllocation(null);
        return;
      }

      try {
        const params = {
          staffId: formData.staffId,
          leaveTypeId: formData.leaveTypeId,
          ...(companyId ? { companyId } : {}),
          status: 'Active',
        };

        const res = await API.get('/leaveAllocations', { params });
        setAllocation((res.data || [])[0] || null);
      } catch (err) {
        console.error('Error loading allocation:', err);
        setAllocation(null);
      }
    };

    loadAllocation();
  }, [companyId, formData.staffId, formData.leaveTypeId]);

  const requestedDays = useMemo(
    () => calculateRequestedDays(formData.startDate, formData.endDate),
    [formData.endDate, formData.startDate]
  );

  const remainingBalance = useMemo(() => getRemainingBalance(allocation), [allocation]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.staffId || !formData.leaveTypeId || !formData.startDate || !formData.endDate || !formData.reason) {
      Swal.fire('Missing fields', 'Please complete all required fields.', 'warning');
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      Swal.fire('Invalid dates', 'End date must be after start date.', 'warning');
      return;
    }

    if (requestedDays <= 0) {
      Swal.fire('Invalid duration', 'Requested days must be greater than zero.', 'warning');
      return;
    }

    if (!allocation) {
      Swal.fire('No allocation', 'No active leave allocation found for selected leave type.', 'warning');
      return;
    }

    if (requestedDays > remainingBalance) {
      Swal.fire('Insufficient balance', 'Requested days exceed available leave balance.', 'warning');
      return;
    }

    const payload = {
      staffId: Number(formData.staffId),
      leaveTypeId: Number(formData.leaveTypeId),
      leaveAllocationId: allocation.leaveAllocationId,
      companyId: Number(companyId || allocation.companyId),
      startDate: formData.startDate,
      endDate: formData.endDate,
      totalDays: requestedDays,
      leaveCategory: 'Full Day',
      reason: formData.reason,
      status: 'Pending',
      currentApprovalLevel: 1,
    };

    setLoading(true);
    try {
      await API.post('/leaveRequests', payload);
      Swal.fire('Submitted', 'Leave request submitted successfully.', 'success');
      setFormData(initialForm(empId));
      setAllocation(null);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to submit leave request';
      Swal.fire('Error', String(msg), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Apply for Leave</h1>
            <p className="text-gray-600">Submit your leave request</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-8 space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 text-blue-600" /> Staff ID
            </label>
            <input
              type="text"
              name="staffId"
              value={formData.staffId}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600"
              readOnly
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 text-blue-600" /> Leave Type
            </label>
            <select
              name="leaveTypeId"
              value={formData.leaveTypeId}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Select leave type</option>
              {leaveTypes.map((type) => (
                <option key={type.leaveTypeId} value={type.leaveTypeId}>
                  {type.name}
                </option>
              ))}
            </select>

            {allocation && (
              <p className={`mt-2 text-sm font-semibold ${requestedDays > remainingBalance ? 'text-red-600' : 'text-blue-700'}`}>
                Available balance: {remainingBalance.toFixed(2)}
              </p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 text-blue-600" /> Reason
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Enter reason for leave"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" /> Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" /> End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <p className="text-sm text-slate-600">Requested days: <span className="font-semibold">{requestedDays}</span></p>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> {loading ? 'Submitting...' : 'Submit Leave Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
