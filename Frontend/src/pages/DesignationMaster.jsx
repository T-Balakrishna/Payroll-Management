import React, { useState, useEffect } from "react";
import axios from "axios";
import { GraduationCap, Pencil, Trash } from "lucide-react";

function AddOrEdit({ onSave, onCancel, editData }) {
  const [designationName, setDesignationName] = useState(editData?.designationName || "");
  const [designationAckr, setDesignationAckr] = useState(editData?.designationAckr || "");
  const [status, setStatus] = useState(editData?.status || "active");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!designationName || !designationAckr) return alert("Please fill all fields");

    const adminName = localStorage.getItem("adminName") || "system";

    const designationData = {
      designationName,
      designationAckr,
      status,
      createdBy: editData ? editData.createdBy : adminName,
      updatedBy: adminName,
    };

    onSave(designationData, editData?.designationId);
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-center">
          <GraduationCap className="text-black-400 mb-4" size={40} />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="block font-bold text-black-300 mb-2">
              Designation Name
            </label>
            <input
              type="text"
              value={designationName}
              onChange={(e) => setDesignationName(e.target.value)}
              placeholder="Enter designation name"
              className="border border-gray-300 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-black-300 mb-2">
              Acronym
            </label>
            <input
              type="text"
              value={designationAckr}
              onChange={(e) => setDesignationAckr(e.target.value)}
              placeholder="Enter short/acronym"
              className="border border-gray-300 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-black-300 mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border border-gray-300 bg-white text-black rounded-lg p-3 w-full outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="bg-blue-700 text-white px-6 py-3 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-700 text-white px-6 py-3 rounded-lg"
            >
              {editData ? "Update Changes" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DesignationMaster() {
  const [designations, setDesignations] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchDesignations = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/designations");
      setDesignations(res.data);
    } catch (err) {
      console.error("Error fetching designations:", err);
    }
  };

  useEffect(() => {
    fetchDesignations();
  }, []);

  const filteredData = designations.filter(
    (d) =>
      d.designationName?.toLowerCase().includes(search.toLowerCase()) ||
      d.designationAckr?.toLowerCase().includes(search.toLowerCase()) ||
      d.status?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (designationData, designationId) => {
    try {
      if (designationId) {
        await axios.put(
          `http://localhost:5000/api/designations/${designationId}`,
          designationData
        );
      } else {
        await axios.post("http://localhost:5000/api/designations", designationData);
      }
      fetchDesignations();
      setShowForm(false);
      setEditData(null);
    } catch (err) {
      console.error("Error saving designation:", err);
    }
  };

  const handleEdit = (designation) => {
    setEditData(designation);
    setShowForm(true);
  };

  const handleDelete = async (designationId) => {
    if (!window.confirm("Are you sure you want to delete this designation?")) return;
    try {
      const updatedBy = localStorage.getItem("adminName") || "system";
      await axios.delete(`http://localhost:5000/api/designations/${designationId}`, {
        data: { updatedBy },
      });
      fetchDesignations();
    } catch (err) {
      console.error("Error deleting designation:", err);
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
    <div className="min-h-screen p-6 flex flex-col justify-center">
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search designation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 bg-white text-black rounded-lg p-3 w-1/3 outline-none"
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

      <div className="overflow-y-auto" style={{ maxHeight: "260px" }}>
        <table className="w-full text-left border border-gray-300">
          <thead>
            <tr className="bg-gray-100 sticky top-0">
              <th className="py-2 px-4">ID</th>
              <th className="py-2 px-4">Name</th>
              <th className="py-2 px-4">Acronym</th>
              <th className="py-2 px-4">Status</th>
              <th className="py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((d) => (
              <tr key={d.designationId} className="border-t">
                <td className="py-2 px-4">{d.designationId}</td>
                <td className="py-2 px-4">{d.designationName}</td>
                <td className="py-2 px-4">{d.designationAckr}</td>
                <td className="py-2 px-4">{d.status}</td>
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 text-white px-1 py-1 rounded-md"
                    onClick={() => handleEdit(d)}
                  >
                    <Pencil />
                  </button>
                  <button
                    className="bg-red-600 text-white px-1 py-1 rounded-md"
                    onClick={() => handleDelete(d.designationId)}
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

export default DesignationMaster;
