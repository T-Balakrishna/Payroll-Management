import React, { useState, useEffect } from "react";
import axios from "axios";
import { Building2, Pencil, Trash, Plus, X } from "lucide-react";

// ✅ Modal Form Component
function AddOrEdit({ onSave, onCancel, editData }) {
  const [religionName, setReligionName] = useState(editData?.religionName || "");
  const [status, setStatus] = useState(editData?.status || "active");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!religionName) return alert("Please fill the religion name");

    const adminName = localStorage.getItem("adminName") || "system";

    const religionData = {
      religionName,
      status,
      createdBy: editData ? editData.createdBy : adminName,
      updatedBy: adminName,
    };

    onSave(religionData, editData?.religionId);
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
          {editData ? "Edit Religion" : "Add New Religion"}
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-medium text-gray-700 mb-2">Religion Name</label>
            <input
              type="text"
              value={religionName}
              onChange={(e) => setReligionName(e.target.value)}
              placeholder="Enter religion name"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
function ReligionMaster() {
  const [religions, setReligions] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchReligions = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/religions");
      setReligions(res.data);
    } catch (err) {
      console.error("Error fetching religions:", err);
    }
  };

  useEffect(() => {
    fetchReligions();
  }, []);

  const filteredData = religions.filter(
    (r) =>
      r.religionName?.toLowerCase().includes(search.toLowerCase()) ||
      r.status?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (religionData, religionId) => {
    try {
      if (religionId) {
        await axios.put(`http://localhost:5000/api/religions/${religionId}`, religionData);
      } else {
        await axios.post("http://localhost:5000/api/religions", religionData);
      }
      fetchReligions();
      setShowForm(false);
      setEditData(null);
    } catch (err) {
      console.error("Error saving religion:", err);
    }
  };

  const handleEdit = (religion) => {
    setEditData(religion);
    setShowForm(true);
  };

  const handleDelete = async (religionId) => {
    if (!window.confirm("Are you sure you want to delete this religion?")) return;
    try {
      const updatedBy = localStorage.getItem("adminName") || "system";
      await axios.delete(`http://localhost:5000/api/religions/${religionId}`, {
        data: { updatedBy },
      });
      fetchReligions();
    } catch (err) {
      console.error("Error deleting religion:", err);
    }
  };

  return (
    <div className="min-h-screen p-6 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <input
          type="text"
          placeholder="Search religion..."
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
          <Plus size={18} /> Add Religion
        </button>
      </div>

      {/* Table */}
      <div
        className="overflow-y-auto border border-gray-200 rounded-lg shadow-sm"
        style={{ maxHeight: "320px" }}
      >
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0">
            <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <th className="py-3 px-4">ID</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((r) => (
              <tr key={r.religionId} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{r.religionId}</td>
                <td className="py-2 px-4">{r.religionName}</td>
                <td className="py-2 px-4">{r.status}</td>
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md"
                    onClick={() => handleEdit(r)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md"
                    onClick={() => handleDelete(r.religionId)}
                  >
                    <Trash size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-4 text-gray-500">
                  No religions found
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

export default ReligionMaster;
