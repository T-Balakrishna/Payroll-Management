import React, { useState, useEffect } from "react";
import axios from "axios";
import { CalendarDays, Pencil, Trash, Plus, X } from "lucide-react";

// Modal Form Component
function AddOrEdit({ onSave, onCancel, editData, employees, shifts, departments }) {
  const [employeeNumber, setEmployeeNumber] = useState(editData?.employeeNumber || "");
  const [departmentId, setDepartmentId] = useState(editData?.departmentId || "");
  const [shiftId, setShiftId] = useState(editData?.shiftId || "");
  const [isDefault, setIsDefault] = useState(editData?.isDefault || false);
  const [status, setStatus] = useState(editData?.status || "active");

  // Filter employees based on selected department
  const filteredEmployees = employees.filter(emp => emp.departmentId === parseInt(departmentId));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!employeeNumber || !departmentId || !shiftId) {
      return alert("Please fill all required fields");
    }

    const adminName = sessionStorage.getItem("userNumber");

    const data = {
      employeeNumber,
      departmentId,
      shiftId,
      isDefault,
      status,
      createdBy: editData ? editData.createdBy : adminName,
      updatedBy: adminName,
    };

    onSave(data, editData?.allocationId);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="relative max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <X size={22} />
        </button>

        <div className="flex justify-center mb-6">
          <div className="bg-green-100 p-4 rounded-full">
            <CalendarDays className="text-green-600" size={40} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
          {editData ? "Edit Shift Allocation" : "Add New Shift Allocation"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Department */}
          <div>
            <label className="block font-medium text-gray-700 mb-2">Department</label>
            <select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setEmployeeNumber(""); // reset employee when department changes
              }}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="">-- Select Department --</option>
              {departments.map(d => (
                <option key={d.departmentId} value={d.departmentId}>
                  {d.departmentName}
                </option>
              ))}
            </select>
          </div>

          {/* Employee */}
          <div>
            <label className="block font-medium text-gray-700 mb-2">Employee</label>
            <select
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="">-- Select Employee --</option>
              {filteredEmployees.map(emp => (
                <option key={emp.employeeNumber} value={emp.employeeNumber}>
                  {emp.employeeName} ({emp.employeeNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Shift */}
          <div>
            <label className="block font-medium text-gray-700 mb-2">Shift</label>
            <select
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="">-- Select Shift --</option>
              {shifts.map(s => (
                <option key={s.shiftId} value={s.shiftId}>
                  {s.shiftName}
                </option>
              ))}
            </select>
          </div>

          {/* General Shift */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={() => setIsDefault(!isDefault)}
            />
            <label htmlFor="isDefault" className="text-gray-700 font-medium">
              General Shift (8 hrs)?
            </label>
          </div>

          {/* Status */}
          <div>
            <label className="block font-medium text-gray-700 mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg shadow-md transition"
            >
              {editData ? "Update Changes" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main Component
function ShiftAllocationMaster() {
  const [allocations, setAllocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  // Fetch all data from backend
  const fetchData = async () => {
    try {
      const [allocRes, empRes, deptRes, shiftRes] = await Promise.all([
        axios.get("http://localhost:5000/api/shiftAllocations"),
        axios.get("http://localhost:5000/api/employees"),
        axios.get("http://localhost:5000/api/departments"),
        axios.get("http://localhost:5000/api/shifts"),
      ]);
      setAllocations(allocRes.data);
      setEmployees(empRes.data);
      setDepartments(deptRes.data);
      setShifts(shiftRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = allocations.filter(
    a =>
      a.employee?.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
      a.department?.departmentName?.toLowerCase().includes(search.toLowerCase()) ||
      a.shift?.shiftName?.toLowerCase().includes(search.toLowerCase()) ||
      a.status?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (data, allocationId) => {
    try {
      if (allocationId) {
        await axios.put(`http://localhost:5000/api/shiftAllocations/${allocationId}`, data);
      } else {
        await axios.post("http://localhost:5000/api/shiftAllocations", data);
      }
      fetchData();
      setShowForm(false);
      setEditData(null);
    } catch (err) {
      console.error("Error saving allocation:", err);
    }
  };

  const handleEdit = (allocation) => {
    setEditData(allocation);
    setShowForm(true);
  };

  const handleDelete = async (allocationId) => {
    if (!window.confirm("Are you sure you want to delete this allocation?")) return;
    try {
      const updatedBy = sessionStorage.getItem("userNumber");
      await axios.delete(`http://localhost:5000/api/shiftAllocations/${allocationId}`, {
        data: { updatedBy },
      });
      fetchData();
    } catch (err) {
      console.error("Error deleting allocation:", err);
    }
  };

  return (
    <div className="min-h-screen p-6 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <input
          type="text"
          placeholder="Search allocations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 bg-white text-black rounded-lg px-4 py-2 w-1/3 outline-none"
        />
        <button
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-md"
          onClick={() => {
            setShowForm(true);
            setEditData(null);
          }}
        >
          <Plus size={18} /> Add Allocation
        </button>
      </div>

      <div className="overflow-y-auto border border-gray-200 rounded-lg shadow-sm" style={{ maxHeight: "320px" }}>
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0">
            <tr className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
              <th className="py-3 px-4">ID</th>
              <th className="py-3 px-4">Employee</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Shift</th>
              <th className="py-3 px-4">General?</th>
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(a => (
              <tr key={a.allocationId} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{a.allocationId}</td>
                <td className="py-2 px-4">{a.employee?.employeeName || a.employeeNumber}</td>
                <td className="py-2 px-4">{a.department?.departmentName||"-"}</td>
                <td className="py-2 px-4">{a.shift?.shiftName}</td>
                <td className="py-2 px-4">{a.isDefault ? "Yes" : "No"}</td>
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md"
                    onClick={() => handleEdit(a)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md"
                    onClick={() => handleDelete(a.allocationId)}
                  >
                    <Trash size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-4 text-gray-500">
                  No allocations found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <AddOrEdit
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditData(null);
          }}
          editData={editData}
          employees={employees}
          departments={departments}
          shifts={shifts}
        />
      )}
    </div>
  );
}

export default ShiftAllocationMaster;