import React, { useState, useEffect } from "react";
import axios from "axios";
import { Building2, Pencil, Trash } from "lucide-react";

function AddOrEdit({ onSave, onCancel, editData }) {
  const [religion, setReligion] = useState(editData?.religion || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!religion) return alert("Please fill the religion field");

    const religionData = { religion };
    onSave(religionData, editData?.religion_id);
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
              Religion
            </label>
            <input
              type="text"
              value={religion}
              onChange={(e) => setReligion(e.target.value)}
              placeholder="Enter religion"
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

  const filteredData = religions.filter((r) =>
    r.religion?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (religionData, religion_id) => {
    try {
      if (religion_id) {
        await axios.put(
          `http://localhost:5000/api/religions/${religion_id}`,
          religionData
        );
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

  const handleDelete = async (religion_id) => {
    try {
      await axios.delete(`http://localhost:5000/api/religions/${religion_id}`);
      fetchReligions();
    } catch (err) {
      console.error("Error deleting religion:", err);
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
          placeholder="Search religion..."
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
              <th className="py-2 px-4">Religion ID</th>
              <th className="py-2 px-4">Religion</th>
              <th className="py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((r) => (
              <tr key={r.religion_id} className="border-t">
                <td className="py-2 px-4">{r.religion_id}</td>
                <td className="py-2 px-4">{r.religion}</td>
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 text-white px-1 py-1 rounded-md"
                    onClick={() => handleEdit(r)}
                  >
                    <Pencil />
                  </button>
                  <button
                    className="bg-red-400 text-white px-1 py-1 rounded-md"
                    onClick={() => handleDelete(r.religion_id)}
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

export default ReligionMaster;
