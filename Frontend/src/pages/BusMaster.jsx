// src/pages/BusMaster.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Bus, Pencil, Trash } from "lucide-react";

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
      busNumber: busNumber,
      busDriverName: busDriverName,
      busRouteDetails: busRouteDetails,
      status: status === "active" ? "active" : "inactive",
    };

    onSave(busData, editData?.busId);
  };
 
  return (
    <div className="min-h-screen bg-gradient-to-br from-white-900 via-white-800 to-white-900 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-center align-center">
          <Bus className="text-black-400 mb-4" size={40} />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="block font-bold text-black-300 mb-2">
              Bus Number
            </label>
            <input
              type="text"
              value={busNumber}
              onChange={(e) => setBusNumber(e.target.value)}
              placeholder="Enter bus number"
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-black-300 mb-2">
              Driver Name
            </label>
            <input
              type="text"
              value={busDriverName}
              onChange={(e) => setBusDriverName(e.target.value)}
              placeholder="Enter driver name"
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-black-300 mb-2">
              Route Details
            </label>
            <input
              type="text"
              value={busRouteDetails}
              onChange={(e) => setBusRouteDetails(e.target.value)}
              placeholder="Enter route details"
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
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
              className="bg-blue-700  text-white px-6 py-3 rounded-lg"
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
    const adminName = localStorage.getItem("adminName");

    if (busId) {
      // UPDATE using busId
      await axios.put(`http://localhost:5000/api/buses/${busId}`, {
        ...busData,
        updatedBy: adminName,
      });
    } else {
      // CREATE
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
    const adminName = localStorage.getItem("adminName");
    if(!busId) return;
    await axios.delete(`http://localhost:5000/api/buses/${busId}`,{
      data:{updatedBy:adminName}
    });
    fetchBuses();
  } catch (err) {
    console.error("Error deleting bus:", err);
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
          placeholder="Search bus..."
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
              <th className="py-2 px-4">Bus Number</th>
              <th className="py-2 px-4">Driver Name</th>
              <th className="py-2 px-4">Route Details</th>
              <th className="py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((b) => (
              <tr key={b.busNumber} className="border-t">
                <td className="py-2 px-4">{b.busNumber}</td>
                <td className="py-2 px-4">{b.busDriverName}</td>
                <td className="py-2 px-4">{b.busRouteDetails}</td>
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-blue-500 text-white px-1 py-1 rounded-md"
                    onClick={() => handleEdit(b)}
                  >
                    <Pencil />
                  </button>
                  <button
                    className="bg-red-600 text-white px-1 py-1 rounded-md"
                    onClick={() => handleDelete(b.busId)}
                  >
                    <Trash />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-4">
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

export default BusMaster;
