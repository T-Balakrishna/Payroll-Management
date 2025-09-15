
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Building2, Pencil, Trash, Plus, X } from "lucide-react";


// ✅ Modal Form Component
function AddOrEdit({ onSave, onCancel, editData }) {
  const [departmentName, setDepartmentName] = useState(editData?.departmentName || "");
  const [departmentAckr, setDepartmentAckr] = useState(editData?.departmentAckr || "");
  const [status, setStatus] = useState(editData?.status || "active");


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!departmentName || !departmentAckr) return alert("Please fill all fields");


    const adminName = sessionStorage.getItem("userNumber");


    const departmentData = {
      departmentName,
      departmentAckr,
      status,
      createdBy: editData ? editData.createdBy : adminName,
      updatedBy: adminName,
    };


    onSave(departmentData, editData?.departmentId);
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
          {editData ? "Edit Department" : "Add New Department"}
        </h2>


        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-medium text-gray-700 mb-2">Department Name</label>
            <input
              type="text"
              value={departmentName}
              onChange={(e) => setDepartmentName(e.target.value)}
              placeholder="Enter department name"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>


          <div>
            <label className="block font-medium text-gray-700 mb-2">Acronym</label>
            <input
              type="text"
              value={departmentAckr}
              onChange={(e) => setDepartmentAckr(e.target.value)}
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
function DepartmentMaster() {
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);


  const fetchDepartments = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/departments");
      setDepartments(res.data);
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };


  useEffect(() => {
    fetchDepartments();
  }, []);


  const filteredData = departments.filter(
    (d) =>
      d.departmentName?.toLowerCase().includes(search.toLowerCase()) ||
      d.departmentAckr?.toLowerCase().includes(search.toLowerCase()) ||
      d.status?.toLowerCase().includes(search.toLowerCase())
  );


  const handleSave = async (departmentData, departmentId) => {
    try {
      if (departmentId) {
        await axios.put(`http://localhost:5000/api/departments/${departmentId}`, departmentData);
      } else {
        await axios.post("http://localhost:5000/api/departments", departmentData);
      }
      fetchDepartments();
      setShowForm(false);
      setEditData(null);
    } catch (err) {
      console.error("Error saving department:", err);
    }
  };


  const handleEdit = (department) => {
    setEditData(department);
    setShowForm(true);
  };


  const handleDelete = async (departmentId) => {
    if (!window.confirm("Are you sure you want to delete this department?")) return;
    try {
      const updatedBy = sessionStorage.getItem("userNumber");
      await axios.delete(`http://localhost:5000/api/departments/${departmentId}`, {
        data: { updatedBy },
      });
      fetchDepartments();
    } catch (err) {
      console.error("Error deleting department:", err);
    }
  };


  return (
    <div className="min-h-screen p-6 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <input
          type="text"
          placeholder="Search department..."
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
          <Plus size={18} /> Add Department
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
            {filteredData.map((d) => (
              <tr key={d.departmentId} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{d.departmentId}</td>
                <td className="py-2 px-4">{d.departmentName}</td>
                <td className="py-2 px-4">{d.departmentAckr}</td>
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md"
                    onClick={() => handleEdit(d)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md"
                    onClick={() => handleDelete(d.departmentId)}
                  >
                    <Trash size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-4 text-gray-500">
                  No departments found
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

export default DepartmentMaster;