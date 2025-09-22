// src/pages/BusMaster.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Bus, Pencil, Trash, Search, Plus, X } from "lucide-react";

function AddOrEdit({ onSave, onCancel, editData }) {
  const [busNumber, setBusNumber] = useState(editData?.busNumber || "");
  const [busDriverName, setBusDriverName] = useState(editData?.busDriverName || "");
  const [busRouteDetails, setBusRouteDetails] = useState(editData?.busRouteDetails || "");
  const [status, setStatus] = useState(editData?.status?.toLowerCase() || "active");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!busNumber || !busDriverName || !busRouteDetails) {
      return alert("Please fill all fields");
    }
    const busData = {
      busNumber,
      busDriverName,
      busRouteDetails,
      status: status === "active" ? "active" : "inactive",
    };
    onSave(busData, editData?.busId);
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
            <Bus className="text-blue-600" size={40} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
          {editData ? "Edit Bus Details" : "Add New Bus"}
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-medium text-gray-700 mb-2">Bus Number</label>
            <input
              type="text"
              value={busNumber}
              onChange={(e) => setBusNumber(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-2">Driver Name</label>
            <input
              type="text"
              value={busDriverName}
              onChange={(e) => setBusDriverName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-2">Route Details</label>
            <input
              type="text"
              value={busRouteDetails}
              onChange={(e) => setBusRouteDetails(e.target.value)}
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

function BusMaster() {
  const [buses, setBuses] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchBuses = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/buses");
      setBuses(res.data);
    } catch (err) {
      console.error("Error fetching buses:", err);
    }
  };

  const handleEdit = (bus) => {
    setEditData(bus);
    setShowForm(true);
  };

  useEffect(() => {
    fetchBuses();
  }, []);

  const filteredData = buses.filter(
    (b) =>
      b.busNumber?.toString().toLowerCase().includes(search.toLowerCase()) ||
      b.busDriverName?.toLowerCase().includes(search.toLowerCase()) ||
      b.busRouteDetails?.toLowerCase().includes(search.toLowerCase()) ||
      b.status?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (busData, busId) => {
    try {
      const adminName = sessionStorage.getItem("userNumber");
      if (busId) {
        await axios.put(`http://localhost:5000/api/buses/${busId}`, {
          ...busData,
          updatedBy: adminName,
        });
      } else {
        await axios.post("http://localhost:5000/api/buses", {
          ...busData,
          createdBy: adminName,
        });
      }
      fetchBuses();
      setShowForm(false);
      setEditData(null);
    } catch (err) {
      console.error("❌ Error saving bus:", err);
    }
  };

  const handleDelete = async (busId) => {
    try {
      const adminName = sessionStorage.getItem("userNumber");
      if (!busId) return;
      await axios.delete(`http://localhost:5000/api/buses/${busId}`, {
        data: { updatedBy: adminName },
      });
      fetchBuses();
    } catch (err) {
      console.error("Error deleting bus:", err);
    }
  };

  return (
<div className="h-full align-items-center justify-center bg-gray-50 p-6 relative ">
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
            placeholder="Search buses..."
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
                <th className="py-3 px-4 text-left font-semibold">Bus Number</th>
                <th className="py-3 px-4 text-left font-semibold">Driver Name</th>
                <th className="py-3 px-4 text-left font-semibold">Route Details</th>
                <th className="py-3 px-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length > 0 ? (
                filteredData.map((b) => (
                  <tr key={b.busId} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-medium text-gray-800">{b.busNumber}</td>
                    <td className="py-3 px-4 text-gray-700">{b.busDriverName}</td>
                    <td className="py-3 px-4 text-gray-700">{b.busRouteDetails}</td>
                    <td className="py-3 px-4 flex justify-center gap-2">
                      <button
                        className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md shadow"
                        onClick={() => handleEdit(b)}
                        title="Edit bus"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md shadow"
                        onClick={() => handleDelete(b.busId)}
                        title="Delete bus"
                      >
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <Bus size={40} className="text-gray-400 mb-3" />
                      <p className="font-medium">No buses found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Try adjusting your search criteria or add a new bus.
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

export default BusMaster;
