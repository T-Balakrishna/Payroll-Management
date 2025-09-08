import React, { useState, useEffect } from "react";
import axios from "axios";
import { Calendar } from "lucide-react";

function AddOrEdit({ onSave, onCancel, editData }) {
  const [empId, setEmpId] = useState(editData?.emp_id || "");
  const [leaveType, setLeaveType] = useState(editData?.leave_type || ""); // ✅ New field
  const [fromDate, setFromDate] = useState(editData?.from_date || "");
  const [toDate, setToDate] = useState(editData?.to_date || "");
  const [leaveReason, setLeaveReason] = useState(editData?.leave_reason || "");
  const status = "pending"; // default

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!empId || !leaveType || !fromDate || !toDate || !leaveReason)
      return alert("Please fill all fields");

    const leaveData = {
      emp_id: empId,
      leave_type: leaveType, // ✅ added
      from_date: fromDate,
      to_date: toDate,
      leave_reason: leaveReason,
      status: status,
    };

    onSave(leaveData, editData?.ticket_no);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white-900 via-white-800 to-white-900 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-purple-500 rounded-2xl shadow-xl p-8">
        <div className="flex justify-center align-center">
          <Calendar className="text-black-400 mb-4" size={40} />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="block font-bold text-black-300 mb-2">
              Employee ID
            </label>
            <input
              type="number"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              placeholder="Enter employee ID"
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          {/* ✅ Leave Type */}
          <div>
            <label className="block font-bold text-black-300 mb-2">
              Leave Type
            </label>
            <input
              type="text"
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              placeholder="Enter leave type (e.g. Sick, Casual)"
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-black-300 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-black-300 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-300/40 bg-white text-black rounded-lg p-3 w-full outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-black-300 mb-2">
              Leave Reason
            </label>
            <input
              type="text"
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="Enter leave reason"
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

function LeaveMaster() {
  const [leaves, setLeaves] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchLeaves = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/leaves");
      setLeaves(res.data);
    } catch (err) {
      console.error("Error fetching leaves:", err);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const filteredData = leaves.filter(
    (l) =>
      l.ticket_no?.toString().includes(search) ||
      l.emp_id?.toString().includes(search) ||
      l.leave_type?.toLowerCase().includes(search.toLowerCase()) || // ✅ searchable
      l.leave_reason?.toLowerCase().includes(search.toLowerCase()) ||
      l.status?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (leaveData, ticket_no) => {
    try {
      const from = new Date(leaveData.from_date);
      const to = new Date(leaveData.to_date);
      if (from > to) {
        alert("From Date must be earlier than or equal to To Date.");
        return;
      }

      
      // const empCheck = await axios.get(
      //   `http://localhost:5000/api/employees/${leaveData.emp_id}`
      // );
      // if (!empCheck.data) {
      //   alert("Employee ID not found in Employee Table.");
      //   return;
      // }

      try {
        const empCheck = await axios.get(`http://localhost:5000/api/employees/${leaveData.emp_id}`);

        if (!empCheck.data || Object.keys(empCheck.data).length === 0) {
          alert("Employee ID not found in Employee Table.");
          return;
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          alert("Employee ID not found in Employee Table.");
        } else {
          alert("Error checking employee ID. Please try again.");
          console.error(error);
        }
        return;
      }


      if (ticket_no) {
        await axios.put(`http://localhost:5000/api/leaves/${ticket_no}`, leaveData);
      } else {
        await axios.post("http://localhost:5000/api/leaves", leaveData);
      }

      fetchLeaves();
      setShowForm(false);
      setEditData(null);
    } catch (err) {
      console.error("Error saving leave:", err);
      alert("Error occurred while saving leave. Please try again.");
    }
  };

  const handleEdit = (leave) => {
    setEditData(leave);
    setShowForm(true);
  };

  const handleUpdateStatus = async (ticket_no, status) => {
  try {
    await axios.put(`http://localhost:5000/api/leaves/${ticket_no}/status`, {
      ticket_no: ticket_no,
      status: status
    });
    // Refresh data
    fetchLeaves();
  } catch (err) {
    console.error("Error updating status:", err);
    alert("Failed to update leave status");
  }
};


  const handleDelete = async (ticket_no) => {
    try {
      await axios.delete(`http://localhost:5000/api/leaves/${ticket_no}`);
      fetchLeaves();
    } catch (err) {
      console.error("Error deleting leave:", err);
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
          placeholder="Search leave..."
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
              <th className="py-2 px-4">Employee ID</th>
              <th className="py-2 px-4">Leave Type</th> 
              <th className="py-2 px-4">From Date</th>
              <th className="py-2 px-4">To Date</th>
              <th className="py-2 px-4">Reason</th>
              <th className="py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((l) => (
              <tr key={l.ticket_no} className="border-t">                
                <td className="py-2 px-4">{l.emp_id}</td>
                <td className="py-2 px-4">{l.leave_type}</td> 
                <td className="py-2 px-4">{l.from_date}</td>
                <td className="py-2 px-4">{l.to_date}</td>
                <td className="py-2 px-4">{l.leave_reason}</td>                
                <td className="py-2 px-4 flex gap-2">
                  <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-green-500 text-white px-2 py-1 rounded-md"
                    onClick={() => handleUpdateStatus(l.ticket_no, "approved")}
                  >
                    
                    Approve
                  </button>
                  <button
                    className="bg-red-500 text-white px-2 py-1 rounded-md"
                    onClick={() => handleUpdateStatus(l.ticket_no, "rejected")}
                  >                    
                    Reject
                  </button>
                </td>

                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center py-4">
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

export default LeaveMaster;
