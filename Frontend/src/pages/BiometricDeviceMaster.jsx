import React, { useState, useEffect } from "react";
import axios from "axios";
import { Cpu, Pencil, Trash, Plus, X } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

let token = sessionStorage.getItem("token");
let decoded = token ? jwtDecode(token) : {};
let userNumber = decoded.userNumber;
let userRole = decoded.role;

// 🔹 Modal Form Component
function AddOrEdit({
  onSave,
  onCancel,
  editData,
  userRole,
  selectedCompanyId,
  selectedCompanyName,
}) {
  const [deviceIp, setDeviceIp] = useState(editData?.deviceIp || "");
  const [location, setLocation] = useState(editData?.location || "");
  const [companyId, setCompanyId] = useState(
    editData?.companyId || selectedCompanyId || ""
  );
  const [companyName, setCompanyName] = useState(
    editData?.companyName || selectedCompanyName || ""
  );
  const [companies, setCompanies] = useState([]);

  // 🔹 Fetch companies (only for Super Admin to choose)
  useEffect(() => {
    let mounted = true;
    const fetchCompanies = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/companies", {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        });
        if (!mounted) return;
        setCompanies(res.data || []);

        if (userRole === "Super Admin" && companyId) {
          const selected = res.data.find((c) => c.companyId === Number(companyId));
          setCompanyName(selected ? selected.companyName : companyName || "");
        }
      } catch (err) {
        console.error("Error fetching companies:", err);
      }
    };

    if (userRole === "Super Admin") fetchCompanies();
    return () => {
      mounted = false;
    };
  }, [userRole, companyId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!deviceIp) return toast.error("Device IP is required");

    const deviceData = {
      deviceIp,
      location,
      companyId: companyId , // ✅ allow change for super admin
      createdBy: editData ? editData.createdBy : userNumber,
      updatedBy: userNumber,
    };

    onSave(deviceData, editData?.deviceId);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 relative">
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 transition"
        >
          <X size={20} />
        </button>

        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <Cpu className="text-blue-600" size={40} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
          {editData ? "Edit Biometric Device" : "Add New Biometric Device"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Device IP */}
          <div>
            <label className="block font-medium text-gray-700 mb-2">
              Device IP
            </label>
            <input
              type="text"
              value={deviceIp}
              onChange={(e) => setDeviceIp(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required
            />
          </div>

          {/* Location */}
          <div>
            <label className="block font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* Company */}
          <div>
            <label className="block font-medium text-gray-700 mb-2">Company</label>
            {userRole === "Super Admin" ? (
              <select
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value);
                  const selected = companies.find((c) => c.companyId === e.target.value);
                  setCompanyName(selected ? selected.companyName : "");
                }}
                disabled={editData}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="">Select Company</option>
                {companies
                  .filter(c => c.companyId !== 1)
                  .map(c => (
                    <option key={c.companyId} value={c.companyId}>
                      {c.companyName}
                    </option>
                  ))}
              </select>
            ) : (
              <input
                type="text"
                value={companyName || "No company selected"}
                disabled
                className="w-full border border-gray-300 rounded-lg p-3 bg-gray-100 cursor-not-allowed"
              />
            )}
          </div>

          {/* Buttons */}
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

// 🔹 Main Component
function BiometricDeviceMaster({ selectedCompanyId, selectedCompanyName }) {
  const [devices, setDevices] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [companies, setCompanies] = useState([]);

  const getCompanyAcronym = (id) => {
    const company = companies.find((c) => c.companyId === id);
    return company ? company.companyAcr : "";
  };

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/companies", {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        });
        setCompanies(res.data || []);
      } catch (err) {
        console.error("Error fetching companies:", err);
      }
    };
    fetchCompanies();
  }, []);

  const fetchDevices = async () => {
    try {
      let url = "http://localhost:5000/api/biometricDevices";
      if (selectedCompanyId) {
        url += `?companyId=${selectedCompanyId}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDevices(res.data || []);
    } catch (err) {
      toast.error(
        "Error fetching devices: " +
          (err.response?.data?.message || err.message)
      );
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [selectedCompanyId]);

  const filteredData = devices.filter(
    (d) =>
      d.deviceIp?.toLowerCase().includes(search.trim().toLowerCase()) ||
      d.location?.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleSave = async (deviceData, deviceId) => {
    try {
      if (deviceId) {
        await axios.put(
          `http://localhost:5000/api/biometricDevices/${deviceId}`,
          deviceData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post("http://localhost:5000/api/biometricDevices", deviceData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      await fetchDevices();
      setShowForm(false);
      setEditData(null);
      Swal.fire({
        icon: "success",
        title: deviceId ? "Updated" : "Added",
        text: `Device ${deviceId ? "Updated" : "Added"} Successfully`,
      });
    } catch (err) {
      toast.error(
        "Error saving device: " +
          (err.response?.data?.message || err.message)
      );
    }
  };

  const handleEdit = (device) => {
    setEditData(device);
    setShowForm(true);
  };

  const handleDelete = async (deviceId) => {
      Swal.fire({
        title: "Are you sure?",
        text: "You won’t be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, delete it!"
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await axios.delete(`http://localhost:5000/api/biometricDevices/${deviceId}`, {
              data: { updatedBy: userNumber },
              headers: { Authorization: `Bearer ${token}` },
            });

            Swal.fire("Deleted!", "Device has been deleted.", "success");
            await fetchDevices();
          } catch (err) {
            console.error("Error deleting Device:", err);
            Swal.fire("Error!", "Failed to delete Device.", "error");
          }
        }
      });
    }

  

  return (
    <div className="h-full flex flex-col px-6">
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search device..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 bg-white text-black rounded-lg px-4 py-2 w-1/3 outline-none"
        />
        <button
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md"
          onClick={() => {
            setShowForm(true);
            setEditData(null);
          }}
        >
          <Plus size={18} /> Add Device
        </button>
      </div>

      <div
        className="overflow-y-auto border border-gray-200 rounded-lg shadow-sm flex-1"
        style={{ maxHeight: "320px" }}
      >
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0">
            <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <th className="py-3 px-4">Device IP</th>
              <th className="py-3 px-4">Location</th>
              {!selectedCompanyId && <th className="py-3 px-4">Company</th>}
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((d) => (
              <tr key={d.deviceId} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{d.deviceIp}</td>
                <td className="py-2 px-4">{d.location}</td>
                {!selectedCompanyId && <td>{getCompanyAcronym(d.companyId)}</td>}
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md"
                    onClick={() => handleEdit(d)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md"
                    onClick={() => handleDelete(d.deviceId)}
                  >
                    <Trash size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td
                  colSpan="4"
                  className="text-center py-4 text-gray-500"
                >
                  No devices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <AddOrEdit
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditData(null);
          }}
          editData={editData}
          userRole={userRole}
          selectedCompanyId={selectedCompanyId}
          selectedCompanyName={selectedCompanyName}
        />
      )}
    </div>
  );
}

export default BiometricDeviceMaster;
