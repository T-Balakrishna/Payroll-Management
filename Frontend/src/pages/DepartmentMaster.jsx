import React, { useState, useEffect } from "react";
import axios from "axios";
import { Building2, Pencil, Trash } from "lucide-react";

function AddOrEdit({ onSave, onCancel, editData }) {
  const [deptName, setDeptName] = useState(editData?.deptName || "");
  const [deptShort, setDeptShort] = useState(editData?.deptShort || "");
  const [status, setStatus] = useState(
    editData?.status?.toLowerCase() || "active"
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!deptName || !deptShort || !status) return alert("Please fill all fields");

    const departmentData = {
      deptName,
      deptShort,
      status: status === "active" ? "active" : "inactive",
    };

    onSave(departmentData, editData?.deptId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white-900 via-white-800 to-white-900 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-purple-500 rounded-2xl shadow-xl p-8">
        <div className="flex justify-center align-center">
          <Building2 className="text-black-400 mb-4" size={40} />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="block font-bold text-black-300 mb-2">
              Department Name
            </label>
            <input
              type="text"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="Enter department name"
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-black-300 mb-2">
              Short Name
            </label>
            <input
              type="text"
              value={deptShort}
              onChange={(e) => setDeptShort(e.target.value)}
              placeholder="Enter short name"
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

function DepartmentMaster() {
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  // Fetch from backend
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
      d.deptName?.toLowerCase().includes(search.toLowerCase()) ||
      d.deptShort?.toLowerCase().includes(search.toLowerCase()) ||
      d.status?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (departmentData, deptId) => {
    try {
      if (deptId) {
        await axios.put(`http://localhost:5000/api/departments/${deptId}`, departmentData);
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

  const handleDelete = async (deptId) => {
    try {
      await axios.delete(`http://localhost:5000/api/departments/${deptId}`);
      fetchDepartments();
    } catch (err) {
      console.error("Error deleting department:", err);
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
          placeholder="Search department..."
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
              <th className="py-2 px-4">Name</th>
              <th className="py-2 px-4">Short Name</th>
              <th className="py-2 px-4">Status</th>
              <th className="py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((d) => (
              <tr key={d.deptId} className="border-t">
                <td className="py-2 px-4">{d.deptId}</td>
                <td className="py-2 px-4">{d.deptName}</td>
                <td className="py-2 px-4">{d.deptShort}</td>
                <td className="py-2 px-4">{d.status}</td>
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 text-white px-1 py-1 rounded-md"
                    onClick={() => handleEdit(d)}
                  >
                    <Pencil />
                  </button>
                  <button
                    className="bg-red-400 text-white px-1 py-1 rounded-md"
                    onClick={() => handleDelete(d.deptId)}
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

export default DepartmentMaster;
