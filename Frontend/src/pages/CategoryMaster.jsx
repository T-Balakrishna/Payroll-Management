// src/pages/CategoryMaster.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { FolderKanban, Pencil, Trash } from "lucide-react";

function AddOrEditCategory({ onSave, onCancel, editData }) {
  const [categoryName, setCategoryName] = useState(editData?.categoryName || "");
  const [categoryShort, setCategoryShort] = useState(editData?.categoryShort || "");
  const [maxLeaves, setMaxLeaves] = useState(editData?.maxLeaves || "");
  const [carryForward, setCarryForward] = useState(editData?.carryForward || "no");
  const [status, setStatus] = useState(editData?.status?.toLowerCase() || "active");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!categoryName || !categoryShort || !maxLeaves) {
      return alert("Please fill all required fields");
    }

    const categoryData = {
      categoryName,
      categoryShort,
      maxLeaves,
      carryForward,
      status: status === "active" ? "active" : "inactive",
    };

    onSave(categoryData, editData?.categoryId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white-900 via-white-800 to-white-900 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-center align-center">
          <FolderKanban className="text-black-400 mb-4" size={40} />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Category Name */}
          <div>
            <label className="block font-bold text-black-300 mb-2">Category Name</label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Enter category name"
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          {/* Category Short */}
          <div>
            <label className="block font-bold text-black-300 mb-2">Category Short</label>
            <input
              type="text"
              value={categoryShort}
              onChange={(e) => setCategoryShort(e.target.value)}
              placeholder="Enter short code"
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          {/* Max Leaves */}
          <div>
            <label className="block font-bold text-black-300 mb-2">Max Leaves</label>
            <input
              type="number"
              value={maxLeaves}
              onChange={(e) => setMaxLeaves(e.target.value)}
              placeholder="Enter max leaves"
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          {/* Carry Forward */}
          <div>
            <label className="block font-bold text-black-300 mb-2">Carry Forward</label>
            <select
              value={carryForward}
              onChange={(e) => setCarryForward(e.target.value)}
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block font-bold text-black-300 mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Buttons */}
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

function CategoryMaster() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchCategories = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/categories");
      setCategories(res.data);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filteredData = categories.filter(
    (c) =>
      c.categoryName?.toLowerCase().includes(search.toLowerCase()) ||
      c.categoryShort?.toLowerCase().includes(search.toLowerCase()) ||
      c.status?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (categoryData, categoryId) => {
    try {
      const adminName = localStorage.getItem("adminName") || "system";

      if (categoryId) {
        // UPDATE
        await axios.put(`http://localhost:5000/api/categories/${categoryId}`, {
          ...categoryData,
          updatedBy: adminName,
        });
      } else {
        // CREATE
        await axios.post("http://localhost:5000/api/categories", {
          ...categoryData,
          createdBy: adminName,
        });
      }

      fetchCategories();
      setShowForm(false);
      setEditData(null);
    } catch (err) {
      console.error("❌ Error saving category:", err);
    }
  };

  const handleEdit = (category) => {
    setEditData(category);
    setShowForm(true);
  };

  const handleDelete = async (categoryId) => {
    try {
      const adminName = localStorage.getItem("adminName") || "system";
      if (!categoryId) return;
      await axios.delete(`http://localhost:5000/api/categories/${categoryId}`, {
        data: { updatedBy: adminName },
      });
      fetchCategories();
    } catch (err) {
      console.error("Error deleting category:", err);
    }
  };

  return showForm ? (
    <AddOrEditCategory
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
          placeholder="Search category..."
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
              <th className="py-2 px-4">Short</th>
              <th className="py-2 px-4">Max Leaves</th>
              <th className="py-2 px-4">Carry Forward</th>
              <th className="py-2 px-4">Status</th>
              <th className="py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((c) => (
              <tr key={c.categoryId} className="border-t">
                <td className="py-2 px-4">{c.categoryId}</td>
                <td className="py-2 px-4">{c.categoryName}</td>
                <td className="py-2 px-4">{c.categoryShort}</td>
                <td className="py-2 px-4">{c.maxLeaves}</td>
                <td className="py-2 px-4">{c.carryForward}</td>
                <td className="py-2 px-4">{c.status}</td>
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 text-white px-1 py-1 rounded-md"
                    onClick={() => handleEdit(c)}
                  >
                    <Pencil />
                  </button>
                  <button
                    className="bg-red-600 text-white px-1 py-1 rounded-md"
                    onClick={() => handleDelete(c.categoryId)}
                  >
                    <Trash />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-4">
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

export default CategoryMaster;
