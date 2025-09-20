import React, { useState, useEffect } from "react";
import axios from "axios";
import { Building2, Pencil, Trash, Plus, X } from "lucide-react";

// ✅ Modal Form Component
function AddOrEdit({ onSave, onCancel, editData }) {
  const [shiftName, setShiftName] = useState(editData?.shiftName || "");
  const [shiftInStartTime, setShiftInStartTime] = useState(editData?.shiftInStartTime || "");
  const [shiftInEndTime, setShiftInEndTime] = useState(editData?.shiftInEndTime || "");
  const [shiftOutStartTime, setShiftOutStartTime] = useState(editData?.shiftOutStartTime || "");
  const [shiftMinHours, setShiftMinHours] = useState(editData?.shiftMinHours || "");
  const [shiftNextDay, setShiftNextDay] = useState(editData?.shiftNextDay || false);
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!shiftName || !shiftInStartTime || !shiftInEndTime || !shiftOutStartTime || !shiftMinHours) {
      return alert("Please fill all fields");
    }

    // Duration validation
    const [fromH, fromM] = shiftInStartTime.split(":").map(Number);
    const [toH, toM] = shiftOutStartTime.split(":").map(Number);
    let durationMinutes = (toH * 60 + toM) - (fromH * 60 + fromM);
    if (shiftNextDay && durationMinutes < 0) {
      durationMinutes += 24 * 60;
    }
    const durationHours = durationMinutes / 60;
    if (Number(shiftMinHours) > durationHours) {
      return alert(`Minimum hours cannot exceed shift duration (${durationHours.toFixed(2)} hrs)`);
    }
    const adminName = sessionStorage.getItem("userNumber");
    const shiftData = {
      shiftName,
      shiftInStartTime,
      shiftInEndTime,
      shiftOutStartTime,
      shiftMinHours,
      shiftNextDay,
      createdBy: editData ? editData.createdBy : adminName,
      updatedBy: adminName,
    };
    onSave(shiftData, editData?.shiftId);
  };
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="relative max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
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
            <Building2 className="text-blue-600" size={40} />
          </div>
        </div>


        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
          {editData ? "Edit Shift" : "Add New Shift"}
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-medium text-gray-700 mb-2">Shift Name</label>
            <input
              type="text"
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              placeholder="Enter shift name"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-gray-700 mb-2">In Start</label>
              <input
                type="time"
                value={shiftInStartTime}
                onChange={(e) => setShiftInStartTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-2">In End</label>
              <input
                type="time"
                value={shiftInEndTime}
                onChange={(e) => setShiftInEndTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>


          <div>
            <label className="block font-medium text-gray-700 mb-2">Out Start</label>
            <input
              type="time"
              value={shiftOutStartTime}
              onChange={(e) => setShiftOutStartTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>


          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="nextDay"
              checked={shiftNextDay}
              onChange={() => setShiftNextDay(!shiftNextDay)}
            />
            <label htmlFor="nextDay" className="text-gray-700 font-medium">
              Ends Next Day
            </label>
          </div>


          <div>
            <label className="block font-medium text-gray-700 mb-2">Minimum Hours</label>
            <input
              type="number"
              value={shiftMinHours}
              onChange={(e) => setShiftMinHours(e.target.value)}
              placeholder="Enter minimum hours"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />
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
function ShiftMaster() {
  const [shifts, setShifts] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);


  const fetchShifts = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/shifts");
      setShifts(res.data);
    } catch (err) {
      console.error("Error fetching shifts:", err);
    }
  };


  useEffect(() => {
    fetchShifts();
  }, []);


  const filteredData = shifts.filter(
    (s) =>
      s.shiftName?.toLowerCase().includes(search.toLowerCase()) ||
      s.shiftInStartTime?.includes(search) ||
      s.shiftInEndTime?.includes(search) ||
      s.shiftOutStartTime?.includes(search) ||
      s.shiftMinHours?.toString().includes(search)
  );


  const handleSave = async (shiftData, shiftId) => {
    try {
      if (shiftId) {
        await axios.put(`http://localhost:5000/api/shifts/${shiftId}`, shiftData);
      } else {
        await axios.post("http://localhost:5000/api/shifts", shiftData);
      }
      fetchShifts();
      setShowForm(false);
      setEditData(null);
    } catch (err) {
      console.error("Error saving shift:", err);
    }
  };


  const handleEdit = (shift) => {
    setEditData(shift);
    setShowForm(true);
  };


  const handleDelete = async (shiftId) => {
    if (!window.confirm("Are you sure you want to delete this shift?")) return;
    try {
      const updatedBy = sessionStorage.getItem("userNumber");
      await axios.delete(`http://localhost:5000/api/shifts/${shiftId}`, {
        data: { updatedBy },
      });
      fetchShifts();
    } catch (err) {
      console.error("Error deleting shift:", err);
    }
  };


  return (
    <div className="h-full p-6 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <input
          type="text"
          placeholder="Search shifts..."
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
          <Plus size={18} /> Add Shift
        </button>
      </div>


      {/* Table */}
      <div className="overflow-y-auto border border-gray-200 rounded-lg shadow-sm" style={{ maxHeight: "320px" }}>
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0">
            <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <th className="py-3 px-4">ID</th>
              <th className="py-3 px-4">Shift Name</th>
              <th className="py-3 px-4">In Start</th>
              <th className="py-3 px-4">In End</th>
              <th className="py-3 px-4">Out Start</th>
              <th className="py-3 px-4">Min Hours</th>
              <th className="py-3 px-4">Next Day</th>
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((s) => (
              <tr key={s.shiftId} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{s.shiftId}</td>
                <td className="py-2 px-4">{s.shiftName}</td>
                <td className="py-2 px-4">{s.shiftInStartTime}</td>
                <td className="py-2 px-4">{s.shiftInEndTime}</td>
                <td className="py-2 px-4">{s.shiftOutStartTime}</td>
                <td className="py-2 px-4">{s.shiftMinHours}</td>
                <td className="py-2 px-4">{s.shiftNextDay ? "Yes" : "No"}</td>
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md"
                    onClick={() => handleEdit(s)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md"
                    onClick={() => handleDelete(s.shiftId)}
                  >
                    <Trash size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="9" className="text-center py-4 text-gray-500">
                  No shifts found
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


export default ShiftMaster;
