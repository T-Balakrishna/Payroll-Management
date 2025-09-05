import React, { useState, useEffect } from "react";
import axios from "axios";
import { GraduationCap, Pencil, Trash } from "lucide-react";

function AddOrEdit({ onSave, onCancel, editData }) {
  const [desgName, setdesgName] = useState(editData?.desgName || "");
  const [desgShort, setdesgShort] = useState(editData?.desgShort || "");
  const [status, setStatus] = useState(
    editData?.status?.toLowerCase() || "active"
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!desgName || !desgShort || !status) return alert("Please fill all fields");

    const designationData = {
      desgName,
      desgShort,
      status: status === "active" ? "active" : "inactive",
    };

    onSave(designationData, editData?.desgId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white-900 via-white-800 to-white-900 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-purple-500 rounded-2xl shadow-xl p-8">
        <div className="flex justify-center align-center">
          <GraduationCap className="text-black-400 mb-4" size={40} />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="block font-bold text-black-300 mb-2">
              Designation
            </label>
            <input
              type="text"
              value={desgName}
              onChange={(e) => setdesgName(e.target.value)}
              placeholder="Enter designation name"
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-black-300 mb-2">
              Short Name
            </label>
            <input
              type="text"
              value={desgShort}
              onChange={(e) => setdesgShort(e.target.value)}
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

function DesignationMaster() {
  const [designations, setDesignations] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  // Fetch from backend
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
      d.desgName?.toLowerCase().includes(search.toLowerCase()) ||
      d.desgShort?.toLowerCase().includes(search.toLowerCase()) ||
      d.status?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (designationData, desgId) => {
    try {
      if (desgId) {
        // Update
        await axios.put(`http://localhost:5000/api/designations/${desgId}`, designationData);
      } else {
        // Create
        console.log(designationData)
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

  const handleDelete = async (desgId) => {
    try {
      await axios.delete(`http://localhost:5000/api/designations/${desgId}`);
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
    <div className="min-h-screen p-6 flex flex-col justify-center align-center">
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search designation..."
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
              <tr key={d.desgId} className="border-t">
                <td className="py-2 px-4">{d.desgId}</td>
                <td className="py-2 px-4">{d.desgName}</td>
                <td className="py-2 px-4">{d.desgShort}</td>
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
                    onClick={() => handleDelete(d.desgId)}
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
