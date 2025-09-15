import React, { useState, useEffect } from "react";
import axios from "axios";
import { Building2, Pencil, Trash } from "lucide-react";

function AddOrEditShift({ onSave, onCancel, editData }) {
  const [shiftName, setShiftName] = useState(editData?.shiftName || "");
  const [shiftInStartTime, setShiftInStartTime] = useState(editData?.shiftInStartTime || "");
  const [shiftInEndTime, setShiftInEndTime] = useState(editData?.shiftInEndTime || "");
  const [shiftOutStartTime, setShiftOutStartTime] = useState(editData?.shiftOutStartTime || "");
  const [shiftOutEndTime, setShiftOutEndTime] = useState(editData?.shiftOutEndTime || "");
  const [shiftMinHours, setShiftMinHours] = useState(editData?.shiftMinHours || "");
  const [shiftNextDay, setShiftNextDay] = useState(editData?.shiftNextDay || false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!shiftName || !shiftInStartTime || !shiftInEndTime || !shiftOutStartTime || !shiftOutEndTime || !shiftMinHours) {
      return alert("Please fill all fields");
    }

    // --- Calculate duration (In Time only for validation) ---
    const [fromH, fromM] = shiftInStartTime.split(":").map(Number);
    const [toH, toM] = shiftOutEndTime.split(":").map(Number);

    let durationMinutes = (toH * 60 + toM) - (fromH * 60 + fromM);
    if (shiftNextDay) durationMinutes += 24 * 60;

    const durationHours = durationMinutes / 60;
    if (Number(shiftMinHours) > durationHours) {
      return alert(`Minimum hours cannot exceed shift duration (${durationHours.toFixed(2)} hours)`);
    }

    const currentUser = sessionStorage.getItem("userNumber");;

    const shiftData = {
      shiftName,
      shiftInStartTime,
      shiftInEndTime,
      shiftOutStartTime,
      shiftOutEndTime,
      shiftMinHours,
      shiftNextDay,
      createdBy: editData ? editData.createdBy : currentUser,
      updatedBy: currentUser,
    };

    onSave(shiftData, editData?.shiftId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white-900 via-white-800 to-white-900 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-center align-center mb-4">
          <Building2 className="text-black-400" size={40} />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="block font-bold text-black-300 mb-2">Shift Name</label>
            <input
              type="text"
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              placeholder="Enter shift name"
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-black-300 mb-2">From Time</label>
            <input
              type="time"
              value={shiftInStartTime}
              onChange={(e) => setShiftInStartTime(e.target.value)}
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-black-300 mb-2">To Time</label>
            <input
              type="time"
              value={shiftInEndTime}
              onChange={(e) => setShiftInEndTime(e.target.value)}
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-black-300 mb-2">Out Start Time</label>
            <input
              type="time"
              value={shiftOutStartTime}
              onChange={(e) => setShiftOutStartTime(e.target.value)}
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-black-300 mb-2">Out End Time</label>
            <input
              type="time"
              value={shiftOutEndTime}
              onChange={(e) => setShiftOutEndTime(e.target.value)}
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="nextDay"
              checked={shiftNextDay}
              onChange={() => setShiftNextDay(!shiftNextDay)}
            />
            <label htmlFor="nextDay" className="text-black-300 font-bold">
              Ends Next Day
            </label>
          </div>

          <div>
            <label className="block font-bold text-black-300 mb-2">Minimum Hours</label>
            <input
              type="number"
              value={shiftMinHours}
              onChange={(e) => setShiftMinHours(e.target.value)}
              placeholder="Enter minimum hours"
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onCancel} className="bg-blue-700 text-white px-6 py-3 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="bg-blue-700 text-white px-6 py-3 rounded-lg">
              {editData ? "Update Changes" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ShiftMaster() {
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
      s.shiftOutEndTime?.includes(search) ||
      s.shiftMinHours?.toString().includes(search)
  );

  const handleSave = async (data, shiftId) => {
    try {
      if (shiftId) {
        await axios.put(`http://localhost:5000/api/shifts/${shiftId}`, data);
      } else {
        await axios.post("http://localhost:5000/api/shifts", data);
      }
      setShowForm(false);
      setEditData(null);
      fetchShifts();
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
      const currentUser = localStorage.getItem("username") || "system";
      await axios.delete(`http://localhost:5000/api/shifts/${shiftId}`, {
        data: { updatedBy: currentUser },
      });
      fetchShifts();
    } catch (err) {
      console.error("Error deleting shift:", err);
    }
  };

  return showForm ? (
    <AddOrEditShift
      onSave={handleSave}
      onCancel={() => {
        setShowForm(false);
        setEditData(null);
      }}
      editData={editData}
    />
  ) : (
    <div className="min-h-screen p-6 flex flex-col justify-center align-center">
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search shifts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-1/3 outline-none"
        />
        <button
          className="bg-blue-700 text-white px-5 py-2 rounded-lg shadow-md"
          onClick={() => {
            setShowForm(true);
            setEditData(null);
          }}
        >
          + Add
        </button>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: "300px" }}>
        <table className="w-full text-left border border-gray-300">
          <thead>
            <tr className="bg-gray-100 sticky top-0">
              <th className="py-2 px-4">ID</th>
              <th className="py-2 px-4">Shift Name</th>
              <th className="py-2 px-4">In Start</th>
              <th className="py-2 px-4">In End</th>
              <th className="py-2 px-4">Out Start</th>
              <th className="py-2 px-4">Out End</th>
              <th className="py-2 px-4">Min Hours</th>
              <th className="py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((s) => (
              <tr key={s.shiftId} className="border-t">
                <td className="py-2 px-4">{s.shiftId}</td>
                <td className="py-2 px-4">{s.shiftName}</td>
                <td className="py-2 px-4">{s.shiftInStartTime}</td>
                <td className="py-2 px-4">{s.shiftInEndTime}</td>
                <td className="py-2 px-4">{s.shiftOutStartTime}</td>
                <td className="py-2 px-4">{s.shiftOutEndTime}</td>
                <td className="py-2 px-4">{s.shiftMinHours}</td>
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 text-white px-1 py-1 rounded-md"
                    onClick={() => handleEdit(s)}
                  >
                    <Pencil />
                  </button>
                  <button
                    className="bg-red-600 text-white px-1 py-1 rounded-md"
                    onClick={() => handleDelete(s.shiftId)}
                  >
                    <Trash />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center py-4">
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
