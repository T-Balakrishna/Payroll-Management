// src/pages/CasteMaster.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Users2, Pencil, Trash } from "lucide-react";

function AddOrEdit({ onSave, onCancel, editData }) {
  const [casteName, setCasteName] = useState(editData?.casteName || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!casteName) return alert("Please fill all fields");

    const casteData = { casteName };
    onSave(casteData, editData?.casteId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white-900 via-white-800 to-white-900 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-center align-center">
          <Users2 className="text-black-400 mb-4" size={40} />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="block font-bold text-black-300 mb-2">
              Caste Name
            </label>
            <input
              type="text"
              value={casteName}
              onChange={(e) => setCasteName(e.target.value)}
              placeholder="Enter caste name"
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg"
            >
              {editData ? "Update Changes" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CasteMaster() {
  const [castes, setCastes] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchCastes = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/castes");
      setCastes(res.data);
    } catch (err) {
      console.error("Error fetching castes:", err);
    }
  };

  useEffect(() => {
    fetchCastes();
  }, []);

  const filteredData = castes.filter((c) =>
    c.casteName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (casteData, casteId) => {
    try {
      const adminName = localStorage.getItem("adminName") || "system";

      if (casteId) {
        // UPDATE
        await axios.put(`http://localhost:5000/api/castes/${casteId}`, {
          ...casteData,
          updatedBy: adminName,
        });
      } else {
        // CREATE
        await axios.post("http://localhost:5000/api/castes", {
          ...casteData,
          createdBy: adminName,
        });
      }
      fetchCastes();
      setShowForm(false);
      setEditData(null);
    } catch (err) {
      console.error("Error saving caste:", err);
    }
  };

  const handleEdit = (caste) => {
    setEditData(caste);
    setShowForm(true);
  };

  const handleDelete = async (casteId) => {
    try {
      const adminName = localStorage.getItem("adminName") || "system";
      await axios.delete(`http://localhost:5000/api/castes/${casteId}`, {
        data: { updatedBy: adminName },
      });
      fetchCastes();
    } catch (err) {
      console.error("Error deleting caste:", err);
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
          placeholder="Search caste..."
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

      <div className="overflow-y-auto" style={{ maxHeight: "260px" }}>
        <table className="w-full text-left border border-gray-300">
          <thead>
            <tr className="bg-gray-100 sticky top-0">
              <th className="py-2 px-4">ID</th>
              <th className="py-2 px-4">Name</th>
              <th className="py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((c) => (
              <tr key={c.casteId} className="border-t">
                <td className="py-2 px-4">{c.casteId}</td>
                <td className="py-2 px-4">{c.casteName}</td>
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 text-white px-1 py-1 rounded-md"
                    onClick={() => handleEdit(c)}
                  >
                    <Pencil />
                  </button>
                  <button
                    className="bg-red-600 text-white px-1 py-1 rounded-md"
                    onClick={() => handleDelete(c.casteId)}
                  >
                    <Trash />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="3" className="text-center py-4">
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

export default CasteMaster;
