import React, { useState } from "react";
import { FileText, User, Calendar, Plus } from "lucide-react";

const TakeLeavePage = ({ empId }) => {
  const [formData, setFormData] = useState({
    empId: empId || "EMP001",
    reason: "",
    fromDate: "",
    toDate: ""
  });

  const remainingLeaves = 12;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Leave Request Submitted:", formData);
    alert("Leave request submitted successfully!");
    // Reset form
    setFormData({
      ...formData,
      reason: "",
      fromDate: "",
      toDate: ""
    });
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

        {/* Remaining Leaves Card */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-6 mb-8 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Available Leaves</h3>
              <p className="text-blue-700">You have remaining leaves for this year</p>
            </div>
            <div className="text-4xl font-bold text-blue-600">{remainingLeaves}</div>
          </div>
        </div>

        {/* Leave Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-8">
          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 text-blue-600" />
                Employee ID
              </label>
              <input
                type="text"
                value={formData.empId}
                readOnly
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Reason for Leave
              </label>
              <input
                type="text"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                required
                placeholder="Enter your reason for leave"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  From Date
                </label>
                <input
                  type="date"
                  name="fromDate"
                  value={formData.fromDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  To Date
                </label>
                <input
                  type="date"
                  name="toDate"
                  value={formData.toDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Submit Leave Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TakeLeavePage;