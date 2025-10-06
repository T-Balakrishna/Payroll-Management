// src/pages/BusMaster.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Bus, Pencil, Trash, Plus, X } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import Swal from 'sweetalert2'
import { toast } from "react-toastify";

let token = sessionStorage.getItem("token");
let decoded = token ? jwtDecode(token) : {};
let userNumber = decoded.userNumber;
let userRole = decoded.role;

function AddOrEdit({ onSave, onCancel, editData, userRole, selectedCompanyId, selectedCompanyName }) {
  const [busNumber, setBusNumber] = useState(editData?.busNumber || "");
  const [busDriverName, setBusDriverName] = useState(editData?.busDriverName || "");
  const [busRouteDetails, setBusRouteDetails] = useState(editData?.busRouteDetails || "");
  const [status, setStatus] = useState(editData?.status?.toLowerCase() || "active");
  const [companyId, setCompanyId] = useState(editData?.companyId || selectedCompanyId || "");
  const [companyName, setCompanyName] = useState(editData?.companyName || selectedCompanyName || "");
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    let mounted = true;
    const fetchCompanies = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/companies", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!mounted) return;
        setCompanies(res.data || []);

        if (userRole === "Super Admin" && selectedCompanyId) {
          setCompanyId(selectedCompanyId);
          const selected = res.data.find(c => c.companyId === selectedCompanyId);
          setCompanyName(selected ? selected.companyName : selectedCompanyName || "");
        } else if (userRole === "Admin" && selectedCompanyId) {
          setCompanyId(selectedCompanyId);
          setCompanyName(selectedCompanyName || "No company selected");
        }
      } catch (err) {
        console.error("Error fetching companies:", err);
      }
    };

    if (userRole === "Super Admin") fetchCompanies();
    return () => { mounted = false; };
  }, [userRole, selectedCompanyId, selectedCompanyName]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!busNumber || !busDriverName || !busRouteDetails) return alert("Please fill all fields");

    const busData = {
      busNumber,
      busDriverName,
      busRouteDetails,
      status: status === "active" ? "active" : "inactive",
      createdBy: editData ? editData.createdBy : userNumber,
      updatedBy: userNumber,
    };
    onSave(busData, editData?.busId);
  };

  return (
  <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
    <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-6 relative">
      <button
        onClick={onCancel}
        className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-gray-100 transition"
      >
        <X size={18} />
      </button>

      <div className="flex justify-center mb-4">
        <div className="bg-blue-100 p-3 rounded-full">
          <Bus className="text-blue-600" size={36} />
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-800 text-center mb-4">
        {editData ? "Edit Bus Details" : "Add New Bus"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block font-medium text-gray-700 mb-1">Bus Number</label>
          <input
            type="text"
            value={busNumber}
            onChange={(e) => setBusNumber(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            required
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700 mb-1">Driver Name</label>
          <input
            type="text"
            value={busDriverName}
            onChange={(e) => setBusDriverName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            required
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700 mb-1">Route Details</label>
          <input
            type="text"
            value={busRouteDetails}
            onChange={(e) => setBusRouteDetails(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-1.5 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-1.5 rounded-lg shadow-md transition"
          >
            {editData ? "Update" : "Save"}
          </button>
        </div>
      </form>
    </div>
  </div>
);

}

function BusMaster({ selectedCompanyId, selectedCompanyName }) {
  const [buses, setBuses] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchBuses = async () => {
    try {
      let url = "http://localhost:5000/api/buses";
      if (selectedCompanyId) url += `?companyId=${selectedCompanyId}`;
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setBuses(res.data || []);
    } catch (err) {
      toast.error("Error fetching buses: " + (err.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    fetchBuses();
  }, [selectedCompanyId]);

  const filteredData = buses.filter(
    b =>
      b.busNumber?.toString().toLowerCase().includes(search.toLowerCase()) ||
      b.busDriverName?.toLowerCase().includes(search.toLowerCase()) ||
      b.busRouteDetails?.toLowerCase().includes(search.toLowerCase()) ||
      b.status?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (busData, busId) => {
    try {
      if (busId) await axios.put(`http://localhost:5000/api/buses/${busId}`, busData, { headers: { Authorization: `Bearer ${token}` } });
      else await axios.post(`http://localhost:5000/api/buses`, busData, { headers: { Authorization: `Bearer ${token}` } });
      Swal.fire({
                    icon: "success",
                    title: `${busId ? "Updated" : "Added"}`,
                    text: `Bus ${busId ? "Updated" : "Added"} Successfully`,
                  });
      fetchBuses();
      setShowForm(false);
      setEditData(null);
    } catch (err) {
      Swal.fire({
              icon: "error",
              title: `${busId ? "Update" : "Add"}Failed`,
              // text: `Department ${departmentId ? "Updated" : "Added"} Successfully`,
              text:`${err.response.data}`
          });
    }
  };

  const handleEdit = (bus) => { setEditData(bus); setShowForm(true); };

  const handleDelete = async (busId) => {
        Swal.fire({
          title: "Are you sure?",
          text: "This bus will be permanently deleted!",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Yes, delete it!"
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              await axios.delete(`http://localhost:5000/api/buses/${busId}`, {
                data: { updatedBy: userNumber },
                headers: { Authorization: `Bearer ${token}` },
              });

              Swal.fire("Deleted!", "Bus has been deleted.", "success");
              fetchBuses(); // refresh list
            } catch (err) {
              console.error("Error deleting bus:", err);
              Swal.fire("Error!", "Failed to delete bus.", "error");
            }
          }
        });
      };



  return (
    <div className="h-full flex flex-col px-6 bg-gray-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div className="relative w-full sm:w-80 mb-4 sm:mb-0">
          <input
            type="text"
            placeholder="Search buses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>
        <button
          onClick={() => { setShowForm(true); setEditData(null); }}
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
              {filteredData.length > 0 ? filteredData.map(b => (
                <tr key={b.busId} className="hover:bg-gray-50 transition">
                  <td className="py-3 px-4 font-medium text-gray-800">{b.busNumber}</td>
                  <td className="py-3 px-4 text-gray-700">{b.busDriverName}</td>
                  <td className="py-3 px-4 text-gray-700">{b.busRouteDetails}</td>
                  <td className="py-3 px-4 flex justify-center gap-2">
                    <button className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md shadow" onClick={() => handleEdit(b)} title="Edit bus">
                      <Pencil size={16} />
                    </button>
                    <button className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md shadow" onClick={() => handleDelete(b.busId)} title="Delete bus">
                      <Trash size={16} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={selectedCompanyId ? 4 : 5} className="py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <Bus size={40} className="text-gray-400 mb-3" />
                      <p className="font-medium">No buses found</p>
                      <p className="text-sm text-gray-400 mt-1">Try adjusting your search criteria or add a new bus.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <AddOrEdit
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditData(null); }}
          editData={editData}
          userRole={userRole}
          selectedCompanyId={selectedCompanyId}
          selectedCompanyName={selectedCompanyName}
        />
      )}
    </div>
  );
}

export default BusMaster;
