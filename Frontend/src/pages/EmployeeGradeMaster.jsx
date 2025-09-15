import React, { useState, useEffect } from "react";
import axios from "axios";
import { Award, Pencil, Trash, Plus, X } from "lucide-react";

// ✅ Modal Form Component
function AddOrEditGrade({ onSave, onCancel, editData }) {
  const [employeeGradeName, setEmployeeGradeName] = useState(editData?.employeeGradeName || "");
  const [employeeGradeAckr, setEmployeeGradeAckr] = useState(editData?.employeeGradeAckr || "");
  const [status, setStatus] = useState(editData?.status || "active");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!employeeGradeName || !employeeGradeAckr) return alert("Please fill all fields");

    const adminName = localStorage.getItem("adminName") || "system";

    const gradeData = {
      employeeGradeName,
      employeeGradeAckr,
      status,
      createdBy: editData ? editData.createdBy : adminName,
      updatedBy: adminName,
    };

    onSave(gradeData, editData?.employeeGradeId);
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
            <Award className="text-blue-600" size={40} />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
          {editData ? "Edit Employee Grade" : "Add New Employee Grade"}
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-medium text-gray-700 mb-2">Grade Name</label>
            <input
              type="text"
              value={employeeGradeName}
              onChange={(e) => setEmployeeGradeName(e.target.value)}
              placeholder="Enter grade name"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-2">Acronym</label>
            <input
              type="text"
              value={employeeGradeAckr}
              onChange={(e) => setEmployeeGradeAckr(e.target.value)}
              placeholder="Enter short name"
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
function EmployeeGradeMaster() {
  const [grades, setGrades] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchGrades = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/employeeGrades");
      setGrades(res.data);
    } catch (err) {
      console.error("Error fetching grades:", err);
    }
  };

  useEffect(() => {
    fetchGrades();
  }, []);

  const filteredData = grades.filter(
    (g) =>
      g.employeeGradeName?.toLowerCase().includes(search.toLowerCase()) ||
      g.employeeGradeAckr?.toLowerCase().includes(search.toLowerCase()) ||
      g.status?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (gradeData, gradeId) => {
    try {
      if (gradeId) {
        await axios.put(`http://localhost:5000/api/employeeGrades/${gradeId}`, gradeData);
      } else {
        await axios.post("http://localhost:5000/api/employeeGrades", gradeData);
      }
      fetchGrades();
      setShowForm(false);
      setEditData(null);
    } catch (err) {
      console.error("Error saving grade:", err);
    }
  };

  const handleEdit = (grade) => {
    setEditData(grade);
    setShowForm(true);
  };

  const handleDelete = async (gradeId) => {
    if (!window.confirm("Are you sure you want to delete this grade?")) return;
    try {
      const updatedBy = localStorage.getItem("adminName") || "system";
      await axios.delete(`http://localhost:5000/api/employeeGrades/${gradeId}`, {
        data: { updatedBy },
      });
      fetchGrades();
    } catch (err) {
      console.error("Error deleting grade:", err);
    }
  };

  return (
    <div className="h-full flex-1 p-6 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <input
          type="text"
          placeholder="Search grade..."
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
          <Plus size={18} /> Add Grade
        </button>
      </div>

      {/* Table */}
      <div className="overflow-y-auto border border-gray-200 rounded-lg shadow-sm" style={{ maxHeight: "320px" }}>
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0">
            <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <th className="py-3 px-4">ID</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Acronym</th>
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((g) => (
              <tr key={g.employeeGradeId} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{g.employeeGradeId}</td>
                <td className="py-2 px-4">{g.employeeGradeName}</td>
                <td className="py-2 px-4">{g.employeeGradeAckr}</td>
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md"
                    onClick={() => handleEdit(g)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md"
                    onClick={() => handleDelete(g.employeeGradeId)}
                  >
                    <Trash size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-4 text-gray-500">
                  No grades found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Show Modal */}
      {showForm && (
        <AddOrEditGrade
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

export default EmployeeGradeMaster;
