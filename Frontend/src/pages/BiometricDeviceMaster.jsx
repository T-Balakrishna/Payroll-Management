import React, { useState, useEffect } from "react";
import axios from "axios";
import { Cpu, Pencil, Trash, Search, Plus, X } from "lucide-react";

function AddOrEdit({ onSave, onCancel, editData }) {
  const [deviceIp, setDeviceIp] = useState(editData?.deviceIp || "");
  const [location, setLocation] = useState(editData?.location || "");


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!deviceIp) {
      return alert("Device IP is required");
    }
    const deviceData = {
      deviceIp,
      location,
    };
    onSave(deviceData, editData?.deviceId);
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
            <Cpu className="text-blue-600" size={40} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
          {editData ? "Edit Biometric Device" : "Add New Biometric Device"}
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-medium text-gray-700 mb-2">Device IP</label>
            <input
              type="text"
              value={deviceIp}
              onChange={(e) => setDeviceIp(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-2">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
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

function BiometricDeviceMaster() {
  const [devices, setDevices] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchDevices = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/biometricDevices");
      setDevices(res.data);
    } catch (err) {
      console.error("Error fetching devices:", err);
    }
  };

  const handleEdit = (device) => {
    setEditData(device);
    setShowForm(true);
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const filteredData = devices.filter(
    (d) =>
      d.deviceIp?.toString().toLowerCase().includes(search.toLowerCase()) ||
      d.location?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (deviceData, deviceId) => {
    try {
      const adminName = localStorage.getItem("adminName");
      if (deviceId) {
        await axios.put(`http://localhost:5000/api/biometricDevices/${deviceId}`, {
          ...deviceData,
          updatedBy: adminName,
        });
      } else {
        await axios.post("http://localhost:5000/api/biometricDevices", {
          ...deviceData,
          createdBy: adminName,
        });
      }
      fetchDevices();
      setShowForm(false);
      setEditData(null);
    } catch (err) {
        alert("❌ Error saving device:", err);
      console.error("❌ Error saving device:", err);
    }
  };

  const handleDelete = async (deviceId) => {
    try {
      const adminName = localStorage.getItem("adminName");
      if (!deviceId) return;
      await axios.delete(`http://localhost:5000/api/biometricDevices/${deviceId}`, {
        data: { updatedBy: adminName },
      });
      fetchDevices();
    } catch (err) {
      console.error("Error deleting device:", err);
    }
  };

  return (
    <div className="h-screen align-items-center justify-center bg-gray-50 p-6 relative">
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
            placeholder="Search devices..."
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
                <th className="py-3 px-4 text-left font-semibold">Device IP</th>
                <th className="py-3 px-4 text-left font-semibold">Location</th>
                <th className="py-3 px-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length > 0 ? (
                filteredData.map((d) => (
                  <tr key={d.deviceId} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-medium text-gray-800">{d.deviceIp}</td>
                    <td className="py-3 px-4 text-gray-700">{d.location}</td>
                    <td className="py-3 px-4 flex justify-center gap-2">
                      <button
                        className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md shadow"
                        onClick={() => handleEdit(d)}
                        title="Edit device"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md shadow"
                        onClick={() => handleDelete(d.deviceId)}
                        title="Delete device"
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
                      <Cpu size={40} className="text-gray-400 mb-3" />
                      <p className="font-medium">No devices found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Try adjusting your search criteria or add a new device.
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

export default BiometricDeviceMaster;
