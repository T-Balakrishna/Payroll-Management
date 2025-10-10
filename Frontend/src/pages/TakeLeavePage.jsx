import React, { useState, useEffect } from "react";
import { FileText, User, Calendar, Plus } from "lucide-react";
import axios from "axios";
import dayjs from "dayjs";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

const TakeLeavePage = ({ empId, companyId, departmentId }) => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [allocation, setAllocation] = useState(null);
  const [requestedDays, setRequestedDays] = useState(0);
  const [formData, setFormData] = useState({
    employeeNumber: empId || "",
    leaveTypeId: "",
    reason: "",
    fromDate: "",
    toDate: ""
  });

  // Fetch leave types filtered by companyId
  useEffect(() => {
    const fetchLeaveTypes = async () => {
      try {
        const url = companyId
          ? `http://localhost:5000/api/leavetypes?companyId=${companyId}`
          : "http://localhost:5000/api/leavetypes";
        const res = await axios.get(url);
        setLeaveTypes(res.data || []);
      } catch (err) {
        console.error("❌ Error fetching leave types:", err.response?.data?.error || err.message);
        setLeaveTypes([]);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to fetch leave types. Please try again.",
        });
      }
    };
    fetchLeaveTypes();
  }, [companyId]);

  // Calculate leave period based on month
  const getLeavePeriod = (date) => {
    if (!date) return "";
    const year = dayjs(date).year();
    const month = dayjs(date).month() + 1; // 0-based
    return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  };

  // Fetch allocation whenever leaveType or dates change
  useEffect(() => {
    const fetchAllocation = async () => {
      if (!formData.leaveTypeId || !formData.fromDate) return;
      try {
        const period = getLeavePeriod(formData.fromDate);
        const res = await axios.get("http://localhost:5000/api/leaveAllocations", {
          params: {
            employeeNumber: empId,
            leaveTypeId: formData.leaveTypeId,
            leavePeriod: period
          }
        });
        console.log("Allocation data:", res.data);
        setAllocation(res.data[0] || null);
      } catch (err) {
        console.error("❌ Error fetching allocation:", err.response?.data?.error || err.message);
        setAllocation(null);
      }
    };
    fetchAllocation();
  }, [formData.leaveTypeId, formData.fromDate, formData.toDate, empId]);

  // Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Calculate requested days
  const calculateDays = (fromDate, toDate) => {
    if (!fromDate || !toDate) return 0;
    const start = dayjs(fromDate);
    const end = dayjs(toDate);
    const diff = end.diff(start, "day") + 1;
    return diff > 0 ? diff : 0;
  };

  // Update requestedDays whenever from/to dates change
  useEffect(() => {
    setRequestedDays(calculateDays(formData.fromDate, formData.toDate));
  }, [formData.fromDate, formData.toDate]);

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { leaveTypeId, fromDate, toDate, reason } = formData;

    // Validate dates
    if (dayjs(toDate).isBefore(dayjs(fromDate))) {
      return Swal.fire({
        icon: "error",
        title: "Invalid Dates",
        text: "To Date cannot be earlier than From Date"
      });
    }

    // Validate leave balance
    if (!allocation || requestedDays > allocation.balance) {
      return Swal.fire({
        icon: "warning",
        title: "Insufficient Balance",
        text: "Not enough leave balance available."
      });
    }

    try {
      await axios.post("http://localhost:5000/api/leaves", {
        employeeNumber: empId,
        leaveTypeId,
        startDate: fromDate,
        endDate: toDate,
        reason,
        departmentId, // Added
        companyId,
        status: "Pending",
        createdBy: empId
      });

      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Leave request submitted successfully!"
      });
      setFormData({ ...formData, leaveTypeId: "", reason: "", fromDate: "", toDate: "" });
      setRequestedDays(0);
      setAllocation(null);
    } catch (err) {
      console.error("❌ Error submitting leave request:", err.response?.data?.error || err.message);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to submit leave request. Try again."
      });
    }
  };

  return (
    <div className="h-full bg-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Apply for Leave</h1>
            <p className="text-gray-600">Submit your leave request</p>
          </div>
        </div>

        {/* Leave Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-8">
          <div className="space-y-6">
            {/* Employee Number */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 text-blue-600" /> Employee Number
              </label>
              <input
                type="text"
                value={formData.employeeNumber}
                readOnly
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600"
              />
            </div>

            {/* Leave Type */}
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
                <option value="">-- Select Leave Type --</option>
                {leaveTypes.map(type => (
                  <option key={type.leaveTypeId} value={type.leaveTypeId}>
                    {type.leaveTypeName}
                  </option>
                ))}
              </select>

              {/* Available Leaves */}
              {allocation && (
                <p className={`mt-2 font-semibold ${requestedDays > allocation.balance ? 'text-red-600' : 'text-blue-700'}`}>
                  Available Leaves: {allocation.balance}
                  {requestedDays > allocation.balance && ' ⚠ Requested exceeds balance'}
                </p>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 text-blue-600" /> Reason for Leave
              </label>
              <input
                type="text"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                required
                placeholder="Enter your reason for leave"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 text-blue-600" /> From Date
                </label>
                <input
                  type="date"
                  name="fromDate"
                  value={formData.fromDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 text-blue-600" /> To Date
                </label>
                <input
                  type="date"
                  name="toDate"
                  value={formData.toDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Submit Leave Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TakeLeavePage;
