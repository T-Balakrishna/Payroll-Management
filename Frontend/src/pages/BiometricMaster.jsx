// src/pages/BiometricMaster.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Fingerprint, Pencil, Trash, Search, Plus, X } from "lucide-react";

function AddOrEdit({ onSave, onCancel, editData }) {
  const [biometricNumber, setBiometricNumber] = useState(editData?.biometricNumber || "");
  const [employeeNumber, setEmployeeNumber] = useState(editData?.employeeNumber || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!biometricNumber || !employeeNumber) {
      return alert("Please fill all fields");
    }
    const biometricData = { biometricNumber, employeeNumber };
    onSave(biometricData, editData?.biometricId);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 relative">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 transition"
        >
          <X size={20} />
        </button>

        {/* Icon + Heading */}
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <Fingerprint className="text-blue-600" size={40} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
          {editData ? "Edit Biometric" : "Add New Biometric"}
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-medium text-gray-700 mb-2">Biometric Number</label>
            <input
              type="text"
              value={biometricNumber}
              onChange={(e) => setBiometricNumber(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-2">Employee Number</label>
            <input
              type="text"
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value.toUpperCase())}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* Footer Buttons */}
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

function BiometricMaster() {
  const [biometrics, setBiometrics] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchBiometrics = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/biometrics");
      setBiometrics(res.data);
    } catch (err) {
      console.error("Error fetching biometrics:", err);
    }
  };

  const handleEdit = (biometric) => {
    setEditData(biometric);
    setShowForm(true);
  };

  useEffect(() => {
    fetchBiometrics();
  }, []);

  const filteredData = biometrics.filter(
    (b) =>
      b.biometricNumber?.toLowerCase().includes(search.toLowerCase()) ||
      b.employeeNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (biometricData, biometricId) => {
    try {
      const adminName = sessionStorage.getItem("userNumber");
      if (biometricId) {
        await axios.put(`http://localhost:5000/api/biometrics/${biometricId}`, {
          ...biometricData,
          updatedBy: adminName,
        });
      } else {
        await axios.post("http://localhost:5000/api/biometrics", {
          ...biometricData,
          createdBy: adminName,
        });
      }
      fetchBiometrics();
      setShowForm(false);
      setEditData(null);
    } catch (err) {
        alert(`❌ Error saving biometric: ${err.response.data.split(":")[0]}`);
        console.error("❌ Error saving biometric:", err);        
        setShowForm(false);
        setEditData(null);
    }
  };

  const handleDelete = async (biometricId) => {
    try {
      const adminName = localStorage.getItem("userNumber");
      if (!biometricId) return;
      await axios.delete(`http://localhost:5000/api/biometrics/${biometricId}`, {
        data: { updatedBy: adminName },
      });
      fetchBiometrics();
    } catch (err) {
      alert(`❌ Error Deleting biometric: ${err.response.data.split(":")[0]}`);
      console.error("Error deleting biometric:", err);
    }
  };

  return (
    <div className="h-full align-items-center justify-center bg-gray-50 p-6 relative">
      {/* Modal */}
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div className="relative w-full sm:w-80 mb-4 sm:mb-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search biometrics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditData(null);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-md transition"
        >
          <Plus size={18} /> Add
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0">
              <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <th className="py-3 px-4 text-left font-semibold">Biometric Number</th>
                <th className="py-3 px-4 text-left font-semibold">Employee Number</th>
                <th className="py-3 px-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length > 0 ? (
                filteredData.map((b) => (
                  <tr key={b.biometricId} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-medium text-gray-800">{b.biometricNumber}</td>
                    <td className="py-3 px-4 text-gray-700">{b.employeeNumber}</td>
                    <td className="py-3 px-4 flex justify-center gap-2">
                      <button
                        className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md shadow"
                        onClick={() => handleEdit(b)}
                        title="Edit biometric"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md shadow"
                        onClick={() => handleDelete(b.biometricId)}
                        title="Delete biometric"
                      >
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <Fingerprint size={40} className="text-gray-400 mb-3" />
                      <p className="font-medium">No biometrics found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Try adjusting your search criteria or add a new biometric.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default BiometricMaster;
