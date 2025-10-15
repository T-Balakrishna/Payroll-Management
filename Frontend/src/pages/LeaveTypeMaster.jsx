import React, { useState, useEffect } from "react";
import axios from "axios";
import { ClipboardList, Pencil, Trash, Plus, X } from "lucide-react";
import { jwtDecode } from "jwt-decode";

let token = sessionStorage.getItem("token");
let decoded = token?jwtDecode(token): "";
let userNumber = decoded?.userNumber || "system";
// ✅ Modal Form Component
function AddOrEdit({ onSave, onCancel, editData }) {
  const [form, setForm] = useState({
    leaveTypeName: editData?.leaveTypeName || "",
    maxAllocationPertype: editData?.maxAllocationPertype || "",
    allowApplicationAfterDays: editData?.allowApplicationAfterDays || "",
    minWorkingDaysForLeave: editData?.minWorkingDaysForLeave || "",
    maxConsecutiveLeaves: editData?.maxConsecutiveLeaves || "",
    isCarryForward: editData?.isCarryForward || false,
    isLeaveWithoutPay: editData?.isLeaveWithoutPay || false,
    isPartiallyPaidLeave: editData?.isPartiallyPaidLeave || false,
    isOptionalLeave: editData?.isOptionalLeave || false,
    allowNegativeBalance: editData?.allowNegativeBalance || false,
    allowOverAllocation: editData?.allowOverAllocation || false,
    includeHolidaysAsLeave: editData?.includeHolidaysAsLeave || false,
    isCompensatory: editData?.isCompensatory || false,
    allowEncashment: editData?.allowEncashment || false,
    isEarnedLeave: editData?.isEarnedLeave || false,
    status: editData?.status || "active",
  });

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  useEffect(() => {
    token = sessionStorage.getItem("token");
    decoded = token ? jwtDecode(token) : "";
    userNumber = decoded?.userNumber;
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.leaveTypeName) return alert("Please enter leave type name");

    const adminName = sessionStorage.getItem("userNumber");
    if(form.maxAllocationPertype<0 || form.allowApplicationAfterDays<0 || form.minWorkingDaysForLeave<0 || form.maxConsecutiveLeaves<0) return alert("Please Enter the valid allocations");
    const data = {
      ...form,
      maxAllocationPertype: form.maxAllocationPertype || null,
      allowApplicationAfterDays: form.allowApplicationAfterDays || null,
      minWorkingDaysForLeave: form.minWorkingDaysForLeave || null,
      maxConsecutiveLeaves: form.maxConsecutiveLeaves || null,
      createdBy: editData ? editData.createdBy : adminName,
      updatedBy: adminName,
    };

    onSave(data, editData?.leaveTypeId);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="relative max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-200 overflow-y-auto max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <X size={22} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <ClipboardList className="text-blue-600" size={40} />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
          {editData ? "Edit Leave Type" : "Add New Leave Type"}
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Leave Type Name */}
          <div>
            <label className="block font-medium text-gray-700 mb-2">
              Leave Type Name
            </label>
            <input
              type="text"
              name="leaveTypeName"
              value={form.leaveTypeName}
              onChange={handleChange}
              placeholder="Enter leave type name"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* Numeric Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm mb-1">
                Max Allocation Per Period
              </label>
              <input
                type="number"
                name="maxAllocationPertype"
                value={form.maxAllocationPertype}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1">
                Allow Application After (Days)
              </label>
              <input
                type="number"
                name="allowApplicationAfterDays"
                value={form.allowApplicationAfterDays}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1">
                Min Working Days For Leave
              </label>
              <input
                type="number"
                name="minWorkingDaysForLeave"
                value={form.minWorkingDaysForLeave}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1">
                Max Consecutive Leaves
              </label>
              <input
                type="number"
                name="maxConsecutiveLeaves"
                value={form.maxConsecutiveLeaves}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Boolean Checkboxes */}
          <div className="grid grid-cols-2 gap-3">
            {[
              "isCarryForward",
              "isLeaveWithoutPay",
              "isPartiallyPaidLeave",
              "isOptionalLeave",
              "allowNegativeBalance",
              "allowOverAllocation",
              "includeHolidaysAsLeave",
              "isCompensatory",
              "allowEncashment",
              "isEarnedLeave",
            ].map((field) => (
              <label key={field} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name={field}
                  checked={form[field]}
                  onChange={handleChange}
                />
                {field}
              </label>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md transition"
            >
              {editData ? "Update Changes" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ✅ Main Component
function LeaveTypeMaster() {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchLeaveTypes = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/leaveTypes");
      setLeaveTypes(res.data);
    } catch (err) {
      console.error("Error fetching leave types:", err);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const filteredData = leaveTypes.filter(
    (l) =>
      l.leaveTypeName?.toLowerCase().includes(search.toLowerCase()) ||
      l.status?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (data, id) => {
    try {
      if (id) {
        await axios.put(`http://localhost:5000/api/leaveTypes/${id}`, data);
      } else {
        await axios.post("http://localhost:5000/api/leaveTypes", data);
      }
      fetchLeaveTypes();
      setShowForm(false);
      setEditData(null);
    } catch (err) {
      console.error("Error saving leave type:", err);
    }
  };

  const handleEdit = (leaveType) => {
    setEditData(leaveType);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this leave type?")) return;
    try {
      const updatedBy = sessionStorage.getItem("userNumber");
      await axios.delete(`http://localhost:5000/api/leaveTypes/${id}`, {
        data: { updatedBy },
      });
      fetchLeaveTypes();
    } catch (err) {
      console.error("Error deleting leave type:", err);
    }
  };

  return (
    <div className="h-full p-6 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <input
          type="text"
          placeholder="Search leave type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 bg-white text-black rounded-lg px-4 py-2 w-1/3 outline-none"
        />
        <button
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md"
          onClick={() => {
            setShowForm(true);
            setEditData(null);
          }}
        >
          <Plus size={18} /> Add Leave Type
        </button>
      </div>

      {/* Table */}
      <div className="overflow-y-auto border border-gray-200 rounded-lg shadow-sm" style={{ maxHeight: "320px" }}>
        <table className="w-full text-left text-sm ">
          <thead className="sticky top-0">
            <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <th className="py-3 px-4">ID</th>
              <th className="py-3 px-4">Leave Type</th>
              <th className="py-3 px-4">Max Allocation</th>
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((l) => (
              <tr key={l.leaveTypeId} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{l.leaveTypeId}</td>
                <td className="py-2 px-4">{l.leaveTypeName}</td>
                <td className="py-2 px-4">{l.maxAllocationPertype ?? "-"}</td>
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md"
                    onClick={() => handleEdit(l)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md"
                    onClick={() => handleDelete(l.leaveTypeId)}
                  >
                    <Trash size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-4 text-gray-500">
                  No leave types found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Show Modal */}
      {showForm && (
        <AddOrEdit
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditData(null);
          }}
          editData={editData}
        />
      )}
    </div>
  );
}

export default LeaveTypeMaster;