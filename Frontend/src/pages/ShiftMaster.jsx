import React, { useState, useEffect } from "react";
import axios from "axios";
import { Building2, Pencil, Trash, Plus, X } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

// Decode token to get user info
const token = sessionStorage.getItem("token");
const decoded = token ? jwtDecode(token) : "";
const userNumber = decoded.userNumber;

// ✅ Modal Form Component
function AddOrEdit({ onSave, onCancel, editData, userRole, selectedCompanyId, selectedCompanyName }) {
  const [shiftName, setShiftName] = useState(editData?.shiftName || "");
  const [shiftInStartTime, setShiftInStartTime] = useState(editData?.shiftInStartTime || "");
  const [shiftInEndTime, setShiftInEndTime] = useState(editData?.shiftInEndTime || "");
  const [shiftOutStartTime, setShiftOutStartTime] = useState(editData?.shiftOutStartTime || "");
  const [shiftMinHours, setShiftMinHours] = useState(editData?.shiftMinHours || "");
  const [shiftNextDay, setShiftNextDay] = useState(editData?.shiftNextDay || false);
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(editData?.companyId || selectedCompanyId || "");
  const [companyName, setCompanyName] = useState(editData?.companyName || selectedCompanyName || "");

  // ✅ Fetch companies for Super Admin only
  useEffect(() => {
    let mounted = true;
    const fetchCompanies = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/companies", {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        });
        if (!mounted) return;
        setCompanies(res.data || []);

        if (userRole === "Super Admin" && selectedCompanyId) {
          setCompanyId(selectedCompanyId);
          const selected = res.data.find((c) => c.companyId === selectedCompanyId);
          setCompanyName(selected ? selected.companyName : selectedCompanyName || "");
        }
      } catch (err) {
        console.error("Error fetching companies:", err);
      }
    };

    if (userRole === "Super Admin") fetchCompanies();
    else if (userRole === "Admin" && selectedCompanyId) {
      setCompanyId(selectedCompanyId);
      setCompanyName(selectedCompanyName || "No company selected");
    }

    return () => {
      mounted = false;
    };
  }, [userRole, selectedCompanyId, selectedCompanyName]);

  // ✅ Handle Submit
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!shiftName || !shiftInStartTime || !shiftInEndTime || !shiftOutStartTime || !shiftMinHours) {
      return toast.error("Please fill all required fields");
    }

    // Duration validation
    const [fromH, fromM] = shiftInStartTime.split(":").map(Number);
    const [toH, toM] = shiftOutStartTime.split(":").map(Number);
    let durationMinutes = (toH * 60 + toM) - (fromH * 60 + fromM);
    if (shiftNextDay && durationMinutes < 0) durationMinutes += 24 * 60;
    const durationHours = durationMinutes / 60;

    if (Number(shiftMinHours) > durationHours) {
      return toast.error(`Minimum hours cannot exceed shift duration (${durationHours.toFixed(2)} hrs)`);
    }

    if (!companyId) {
      return toast.error("Company not selected. Please try again.");
    }

    const adminName = sessionStorage.getItem("userNumber");
const shiftData = {
  shiftName,
  shiftInStartTime,
  shiftInEndTime,
  shiftOutStartTime,
  shiftMinHours,
  shiftNextDay,
  // ✅ Always ensure companyId is set
  companyId: userRole === "Super Admin" ? companyId : selectedCompanyId,
  createdBy: editData ? editData.createdBy : adminName,
  updatedBy: adminName,
};

    onSave(shiftData, editData?.shiftId);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
  <div className="relative w-[90%] sm:w-[80%] md:w-[600px] lg:w-[700px]
                  bg-white rounded-2xl shadow-xl p-6 border border-gray-200
                  max-h-[85vh] sm:max-h-[80vh] md:max-h-[75vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <X size={22} />
        </button>

        {/* Header Icon */}
        <div className="flex justify-center mb-5">
          <div className="bg-blue-100 p-4 rounded-full">
            <Building2 className="text-blue-600" size={40} />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-5">
          {editData ? "Edit Shift" : "Add New Shift"}
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Shift Name */}
          <div>
            <label className="block font-medium text-gray-700 mb-2">Shift Name</label>
            <input
              type="text"
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              placeholder="Enter shift name"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Time Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-gray-700 mb-2">In Start</label>
              <input
                type="time"
                value={shiftInStartTime}
                onChange={(e) => setShiftInStartTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-2">In End</label>
              <input
                type="time"
                value={shiftInEndTime}
                onChange={(e) => setShiftInEndTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Out Start */}
          <div>
            <label className="block font-medium text-gray-700 mb-2">Out Start</label>
            <input
              type="time"
              value={shiftOutStartTime}
              onChange={(e) => setShiftOutStartTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Next Day Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="nextDay"
              checked={shiftNextDay}
              onChange={() => setShiftNextDay(!shiftNextDay)}
            />
            <label htmlFor="nextDay" className="text-gray-700 font-medium">
              Ends Next Day
            </label>
          </div>

          {/* Minimum Hours */}
          <div>
            <label className="block font-medium text-gray-700 mb-2">Minimum Hours</label>
            <input
              type="number"
              step="0.01"
              value={shiftMinHours}
              onChange={(e) => setShiftMinHours(e.target.value)}
              placeholder="Enter minimum hours"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
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
        const selected = companies.find((c) => c.companyId === parseInt(e.target.value));
        setCompanyName(selected ? selected.companyName : "");
      }}
      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
    >
      <option value="">Select Company</option>
      {companies
        .filter((c) => c.companyId !== 1)
        .map((c) => (
          <option key={c.companyId} value={c.companyId}>
            {c.companyName}
          </option>
        ))}
    </select>
  ) : (
    // ✅ Automatically use selectedCompanyId if admin
    <input
      type="text"
      value={selectedCompanyName || "No company selected"}
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

// ✅ Main Component
function ShiftMaster({ userRole, selectedCompanyId, selectedCompanyName }) {
  const [shifts, setShifts] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [companies, setCompanies] = useState([]);

  const getCompanyAcronym = (id) => {
    const company = companies.find((c) => c.companyId === id);
    return company ? company.companyAcr : "";
  };

  // Fetch all companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/companies", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCompanies(res.data || []);
      } catch (err) {
        console.error("Error fetching companies:", err);
      }
    };
    fetchCompanies();
  }, []);

  // Fetch Shifts
  const fetchShifts = async () => {
    try {
      let url = "http://localhost:5000/api/shifts";
      if (selectedCompanyId) url += `?companyId=${selectedCompanyId}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let data = res.data || [];
      if (selectedCompanyId && Array.isArray(data)) {
        data = data.filter((s) => String(s.companyId) === String(selectedCompanyId));
      }
      setShifts(data);
    } catch (err) {
      console.error("Error fetching shifts:", err);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [selectedCompanyId]);

  const filteredData = shifts.filter(
    (s) =>
      s.shiftName?.toLowerCase().includes(search.trim().toLowerCase()) ||
      s.shiftInStartTime?.includes(search.trim()) ||
      s.shiftInEndTime?.includes(search.trim()) ||
      s.shiftOutStartTime?.includes(search.trim()) ||
      s.shiftMinHours?.toString().includes(search.trim())
      );

  // Save or Update Shift
  const handleSave = async (shiftData, shiftId) => {
    try {
      if (shiftId) {
        await axios.put(
          `http://localhost:5000/api/shifts/${shiftId}`,
          { ...shiftData, updatedBy: userNumber },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          "http://localhost:5000/api/shifts",
          { ...shiftData, createdBy: userNumber },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      await fetchShifts();
      setShowForm(false);
      setEditData(null);
      Swal.fire({
        icon: "success",
        title: shiftId ? "Updated" : "Added",
        text: `Shift ${shiftId ? "updated" : "added"} successfully`,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to save shift",
      });
    }
  };

  // Edit Shift
  const handleEdit = async (shift) => {
    try {
      const res = await axios.get("http://localhost:5000/api/companies", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const company = res.data.find((c) => c.companyId === shift.companyId);
      setEditData({ ...shift, companyName: company ? company.companyName : selectedCompanyName || "" });
      setShowForm(true);
    } catch {
      setEditData({ ...shift, companyName: selectedCompanyName || "" });
      setShowForm(true);
    }
  };

  // Delete Shift
  const handleDelete = async (shiftId) => {
    const updatedBy = userNumber;

    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`http://localhost:5000/api/shifts/${shiftId}`, {
            data: { updatedBy },
            headers: { Authorization: `Bearer ${token}` },
          });
          Swal.fire("Deleted!", "Shift has been deleted.", "success");
          await fetchShifts();
        } catch (err) {
          Swal.fire("Error!", "Failed to delete shift.", "error");
        }
      }
    });
  };

  return (
    <div className="h-full flex flex-col px-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search shifts..."
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
          <Plus size={18} /> Add Shift
        </button>
      </div>

      {/* Table */}
      <div className="overflow-y-auto border border-gray-200 rounded-lg shadow-sm flex-1" style={{ maxHeight: "320px" }}>
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0">
            <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">In Start</th>
              <th className="py-3 px-4">In End</th>
              <th className="py-3 px-4">Out Start</th>
              <th className="py-3 px-4">Min Hours</th>
              <th className="py-3 px-4">Next Day</th>
              {!selectedCompanyId && <th className="py-3 px-4">Company</th>}
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((s) => (
              <tr key={s.shiftId} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{s.shiftName}</td>
                <td className="py-2 px-4">{s.shiftInStartTime}</td>
                <td className="py-2 px-4">{s.shiftInEndTime}</td>
                <td className="py-2 px-4">{s.shiftOutStartTime}</td>
                <td className="py-2 px-4">{s.shiftMinHours}</td>
                <td className="py-2 px-4">{s.shiftNextDay ? "Yes" : "No"}</td>
                {!selectedCompanyId && <td>{getCompanyAcronym(s.companyId)}</td>}
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md"
                    onClick={() => handleEdit(s)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md"
                    onClick={() => handleDelete(s.shiftId)}
                  >
                    <Trash size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={selectedCompanyId ? 8 : 9} className="text-center py-4 text-gray-500">
                  No shifts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
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

export default ShiftMaster;