import React, { useState, useEffect } from "react";
import axios from "axios";
import { CalendarDays, Pencil, Trash } from "lucide-react";

function AddOrEdit({ onSave, onCancel, editData }) {
  const [holiday_name, setHolidayName] = useState(editData?.holiday_name || "");
  const [type, setType] = useState(editData?.type || "");
  const [leave_date, setLeaveDate] = useState(editData?.leave_date || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!holiday_name || !type || !leave_date)
      return alert("Please fill all fields");

    const holidayData = {
      holiday_name,
      type,
      leave_date,
    };

    onSave(holidayData, editData?.holiday_id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white-900 via-white-800 to-white-900 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-purple-500 rounded-2xl shadow-xl p-8">
        <div className="flex justify-center align-center">
          <CalendarDays className="text-black-400 mb-4" size={40} />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="block font-bold text-black-300 mb-2">
              Holiday Name
            </label>
            <input
              type="text"
              value={holiday_name}
              onChange={(e) => setHolidayName(e.target.value)}
              placeholder="Enter holiday name"
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-black-300 mb-2">
              Type
            </label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Enter type"
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-black-300 mb-2">
              Leave Date
            </label>
            <input
              type="date"
              value={leave_date}
              onChange={(e) => setLeaveDate(e.target.value)}
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

function HolidayMaster() {
  const [holidays, setHolidays] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchHolidays = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/holidays");
      setHolidays(res.data);
    } catch (err) {
      console.error("Error fetching holidays:", err);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const filteredData = holidays.filter(
    (h) =>
      h.holiday_name?.toLowerCase().includes(search.toLowerCase()) ||
      h.type?.toLowerCase().includes(search.toLowerCase()) ||
      h.leave_date?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (holidayData, holiday_id) => {
    try {
      if (holiday_id) {
        await axios.put(`http://localhost:5000/api/holidays/${holiday_id}`, holidayData);
      } else {
        await axios.post("http://localhost:5000/api/holidays", holidayData);
      }
      fetchHolidays();
      setShowForm(false);
      setEditData(null);
    } catch (err) {
      console.error("Error saving holiday:", err);
    }
  };

  const handleEdit = (holiday) => {
    setEditData(holiday);
    setShowForm(true);
  };

  const handleDelete = async (holiday_id) => {
    try {
      await axios.delete(`http://localhost:5000/api/holidays/${holiday_id}`);
      fetchHolidays();
    } catch (err) {
      console.error("Error deleting holiday:", err);
    }
  };

  return showForm ? (
    <AddOrEdit
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
          placeholder="Search holiday..."
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
              <th className="py-2 px-4">Holiday Name</th>
              <th className="py-2 px-4">Type</th>
              <th className="py-2 px-4">Leave Date</th>
              <th className="py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((h) => (
              <tr key={h.holiday_id} className="border-t">
                <td className="py-2 px-4">{h.holiday_id}</td>
                <td className="py-2 px-4">{h.holiday_name}</td>
                <td className="py-2 px-4">{h.type}</td>
                <td className="py-2 px-4">{h.leave_date}</td>
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 text-white px-1 py-1 rounded-md"
                    onClick={() => handleEdit(h)}
                  >
                    <Pencil />
                  </button>
                  <button
                    className="bg-red-400 text-white px-1 py-1 rounded-md"
                    onClick={() => handleDelete(h.holiday_id)}
                  >
                    <Trash />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-4">
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

export default HolidayMaster;
