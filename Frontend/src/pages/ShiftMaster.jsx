import React, { useState, useEffect } from "react";
import axios from "axios";
import { Building2, Pencil, Trash } from "lucide-react";

function AddOrEditShift({ onSave, onCancel, editData }) {
  const [shiftName, setShiftName] = useState(editData?.shift_name || "");
  const [fromTime, setFromTime] = useState(editData?.from_time || "");
  const [toTime, setToTime] = useState(editData?.to_time || "");
  const [minHours, setMinHours] = useState(editData?.min_hours || "");
  
  // NEW: State for "Ends Next Day"
  const [nextDay, setNextDay] = useState(editData?.next_day || false);

  const handleSubmit = (e) => {
  e.preventDefault();
  if (!shiftName || !fromTime || !toTime || !minHours)
    return alert("Please fill all fields");

  // --- NEW: Calculate duration ---
  const [fromH, fromM] = fromTime.split(":").map(Number);
  const [toH, toM] = toTime.split(":").map(Number);

  let durationMinutes = (toH * 60 + toM) - (fromH * 60 + fromM);

  if (nextDay) { // shift ends next day
    durationMinutes += 24 * 60;
  }

  const durationHours = durationMinutes / 60;

  if (Number(minHours) > durationHours) {
    return alert(
      `Minimum hours cannot exceed shift duration (${durationHours.toFixed(2)} hours)`
    );
  }

  const shiftData = {
    shift_name: shiftName,
    from_time: fromTime,
    to_time: toTime,
    min_hours: minHours,
    next_day: nextDay,
  };

  onSave(shiftData, editData?.shift_id);
};


  return (
    <div className="min-h-screen bg-gradient-to-br from-white-900 via-white-800 to-white-900 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-purple-500 rounded-2xl shadow-xl p-8">
        <div className="flex justify-center align-center mb-4">
          <Building2 className="text-black-400" size={40} />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="block font-bold text-black-300 mb-2">
              Shift Name
            </label>
            <input
              type="text"
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              placeholder="Enter shift name"
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-black-300 mb-2">
              From Time
            </label>
            <input
              type="time"
              value={fromTime}
              onChange={(e) => setFromTime(e.target.value)}
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-black-300 mb-2">
              To Time
            </label>
            <input
              type="time"
              value={toTime}
              onChange={(e) => setToTime(e.target.value)}
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          {/* NEW: Checkbox for Next Day */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="nextDay"
              checked={nextDay}
              onChange={() => setNextDay(!nextDay)}
            />
            <label htmlFor="nextDay" className="text-black-300 font-bold">
              Ends Next Day
            </label>
          </div>

          <div>
            <label className="block font-bold text-black-300 mb-2">
              Minimum Hours
            </label>
            <input
              type="number"
              value={minHours}
              onChange={(e) => setMinHours(e.target.value)}
              placeholder="Enter minimum hours"
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-400 text-white px-6 py-3 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-sky-500 hover:bg-sky-700 text-white px-6 py-3 rounded-lg"
            >
              {editData ? "Update Changes" : "Save Changes"}
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
      s.shift_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.from_time?.includes(search) ||
      s.to_time?.includes(search) ||
      s.min_hours?.toString().includes(search)
  );

  const handleSave = async (data, shift_id) => {
    try {
      if (shift_id) {
        await axios.put(`http://localhost:5000/api/shifts/${shift_id}`, data);
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

  const handleDelete = async (shift_id) => {
    try {
      await axios.delete(`http://localhost:5000/api/shifts/${shift_id}`);
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
          className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-lg shadow-md"
          onClick={() => {
            setShowForm(true);
            setEditData(null);
          }}
        >
          + Add
        </button>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: "260px" }}>
        <table className="w-full text-left border border-gray-300">
          <thead>
            <tr className="bg-gray-100 sticky top-0">
              <th className="py-2 px-4">ID</th>
              <th className="py-2 px-4">Shift Name</th>
              <th className="py-2 px-4">From Time</th>
              <th className="py-2 px-4">To Time</th>
              <th className="py-2 px-4">Min Hours</th>
              <th className="py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((s) => (
              <tr key={s.shift_id} className="border-t">
                <td className="py-2 px-4">{s.shift_id}</td>
                <td className="py-2 px-4">{s.shift_name}</td>
                <td className="py-2 px-4">{s.from_time}</td>
                <td className="py-2 px-4">
                  {s.to_time} {s.next_day ? "(Next Day)" : ""} {/* NEW */}
                </td>
                <td className="py-2 px-4">{s.min_hours}</td>
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 text-white px-1 py-1 rounded-md"
                    onClick={() => handleEdit(s)}
                  >
                    <Pencil />
                  </button>
                  <button
                    className="bg-red-500 text-white px-1 py-1 rounded-md"
                    onClick={() => handleDelete(s.shift_id)}
                  >
                    <Trash />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-4">
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
