import React, { useState, useEffect } from "react";
import axios from "axios";
import { FileText, Pencil, Trash } from "lucide-react";

function AddOrEditPolicy({ onSave, onCancel, editData }) {
  const [policyName, setPolicyName] = useState(editData?.policyName || "");
  const [description, setDescription] = useState(editData?.description || "");
  const [status, setStatus] = useState(editData?.status || "active");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!policyName) return alert("Policy Name is required");

    const adminName = localStorage.getItem("adminName") || "system";

    const policyData = {
      policyName,
      description,
      status,
      updatedBy: adminName, // ✅ always set updatedBy
    };

    onSave(policyData, editData?.leavePolicyId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-center mb-4">
          <FileText className="text-gray-600" size={40} />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="block font-bold text-gray-700 mb-2">Policy Name</label>
            <input
              type="text"
              value={policyName}
              onChange={(e) => setPolicyName(e.target.value)}
              placeholder="Enter policy name"
              className="border border-gray-300 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
              className="border border-gray-300 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-2">Status</label>
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
              {editData ? "Update Policy" : "Save Policy"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LeavePolicyMaster() {
  const [policies, setPolicies] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchPolicies = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/leave-policies");
      setPolicies(res.data);
    } catch (err) {
      console.error("Error fetching leave policies:", err);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const filteredData = policies.filter(
    (p) =>
      p.policyName?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (data, id) => {
    try {
      const adminName = localStorage.getItem("adminName") || "system";

      if (id) {
        await axios.put(`http://localhost:5000/api/leave-policies/${id}`, {
          ...data,
          updatedBy: adminName,
        });
      } else {
        await axios.post("http://localhost:5000/api/leave-policies", {
          ...data,
          createdBy: adminName,
        });
      }

      setShowForm(false);
      setEditData(null);
      fetchPolicies();
    } catch (err) {
      console.error("Error saving policy:", err);
    }
  };

  const handleEdit = (policy) => {
    setEditData(policy);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this policy?")) return;

    try {
      const adminName = localStorage.getItem("adminName") || "system";

      await axios.delete(`http://localhost:5000/api/leave-policies/${id}`, {
        data: { updatedBy: adminName }, // ✅ always send updatedBy
      });

      fetchPolicies();
    } catch (err) {
      console.error("Error deleting policy:", err);
    }
  };

  return showForm ? (
    <AddOrEditPolicy
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
          placeholder="Search policies..."
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
              <th className="py-2 px-4">Policy Name</th>
              <th className="py-2 px-4">Description</th>
              <th className="py-2 px-4">Status</th>
              <th className="py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((p) => (
              <tr key={p.leavePolicyId} className="border-t">
                <td className="py-2 px-4">{p.leavePolicyId}</td>
                <td className="py-2 px-4">{p.policyName}</td>
                <td className="py-2 px-4">{p.description}</td>
                <td className="py-2 px-4">{p.status}</td>
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 text-white px-1 py-1 rounded-md"
                    onClick={() => handleEdit(p)}
                  >
                    <Pencil />
                  </button>
                  <button
                    className="bg-red-600 text-white px-1 py-1 rounded-md"
                    onClick={() => handleDelete(p.leavePolicyId)}
                  >
                    <Trash />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-4">
                  No policies found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
