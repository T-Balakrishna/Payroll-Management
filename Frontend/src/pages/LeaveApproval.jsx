// LeaveApproval.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

let token = sessionStorage.getItem("token");
let decoded = token ? jwtDecode(token) : "";
let userNumber = decoded?.userNumber || "system";

const LeaveApproval = ({ selectedCompanyId, selectedCompanyName }) => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("Pending"); // tabs: all, pending, approved, rejected
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [userDepartmentId, setUserDepartmentId] = useState(null);

  // Get leave type name by ID
  const getLeaveTypeName = (id) => {
    const type = leaveTypes.find((t) => t.leaveTypeId === id);
    return type ? type.leaveTypeName : "Unknown";
  };

  useEffect(() => {
        token = sessionStorage.getItem("token");
        decoded = token ? jwtDecode(token) : "";
        userNumber = decoded?.userNumber;
      }, []);
      
  // Fetch user role and department (if applicable)
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        // const userNumber = sessionStorage.getItem("userNumber");        
        const res = await axios.get(`http://localhost:5000/api/users/byNumber/${userNumber}`);
        setUserRole(res.data.role); // Assuming role is returned (e.g., "Super Admin", "Admin", "Department Admin")
        setUserDepartmentId(res.data.departmentId || null); // Department ID for Department Admin
      } catch (err) {
        console.error("Failed to fetch user details", err);
        toast.error("Failed to fetch user details.");
      }
    };
    fetchUserDetails();
  }, []);

  // Fetch leave types
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/leaveTypes")
      .then((res) => setLeaveTypes(res.data))
      .catch((err) => console.error("Failed to fetch leave types", err));
  }, []);

  // Fetch leaves based on active tab and user role
  const fetchLeaves = async (status) => {
    setLoading(true);
    try {
      let url = "http://localhost:5000/api/leaves";
      const params = {};

      if (status !== "all") {
        params.status = status;
      }

      // Role-based filtering
      if (userRole === "Admin" && selectedCompanyId) {
        params.companyId = selectedCompanyId; // Filter by Admin's company
      } else if (userRole === "Department Admin" && selectedCompanyId && userDepartmentId) {
        params.companyId = selectedCompanyId;
        params.departmentId = userDepartmentId; // Filter by Department Admin's company and department
      }
      // Super Admin sees all leaves, no additional filters needed

      const res = await axios.get(url, { params });
      setLeaves(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch leaves.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userRole) {
      fetchLeaves(activeTab);
    }
  }, [activeTab, userRole, selectedCompanyId, userDepartmentId]);

  // Handle Approve/Reject action
  const handleAction = async (leaveId, action) => {
    setUpdating(true);
    try {
      await axios.put(`http://localhost:5000/api/leaves/${leaveId}/status`, {
        status: action,
        updatedBy: userNumber
      });
      // alert(`Leave ${action} successfully!`);
      Swal.fire({
            icon: "info",
            title: action==="Approved" ? "Approved" : "Rejected",
            text: `Leave ${action} successfully!`
          });
      fetchLeaves(activeTab);
    } catch (err) {
      console.error(err);
      Swal.fire({
            icon: "error",
            title: action==="Approved" ? "Approval Failed" : "Rejection Failed",
            text: err.response.data.message
          });
    }
    setUpdating(false);
  };

  const tabs = [
    { id: "all", label: "All Leaves" },
    { id: "Pending", label: "Pending" },
    { id: "Approved", label: "Approved" },
    { id: "Rejected", label: "Rejected" },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        {/* Leave Management {selectedCompanyName ? `- ${selectedCompanyName}` : ""} */}
      </h1>

      {/* Tabs */}
      <div className="flex mb-4 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 -mb-px border-b-2 font-medium ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-500"
                : "border-transparent text-gray-600 hover:text-blue-500"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div>Loading leaves...</div>
      ) : leaves.length === 0 ? (
        <p>No leaves found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2">Employee Number</th>
                <th className="border px-4 py-2">Leave Type</th>
                <th className="border px-4 py-2">From</th>
                <th className="border px-4 py-2">To</th>
                <th className="border px-4 py-2">Reason</th>
                <th className="border px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((leave) => (
                <tr key={leave.leaveId}>
                  <td className="border px-4 py-2">{leave.employeeNumber}</td>
                  <td className="border px-4 py-2">{getLeaveTypeName(leave.leaveTypeId)}</td>
                  <td className="border px-4 py-2">{leave.startDate}</td>
                  <td className="border px-4 py-2">{leave.endDate}</td>
                  <td className="border px-4 py-2">{leave.reason}</td>
                  <td className="border px-4 py-2 space-x-2">
                    <button
                      className="bg-green-500 text-white px-2 py-1 rounded disabled:opacity-50"
                      onClick={() => handleAction(leave.leaveId, "Approved")}
                      disabled={updating || leave.status !== "Pending"}
                    >
                      ✓
                    </button>
                    <button
                      className="bg-red-500 text-white px-2 py-1 rounded disabled:opacity-50"
                      onClick={() => handleAction(leave.leaveId, "Rejected")}
                      disabled={updating || leave.status !== "Pending"}
                    >
                      ✗
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LeaveApproval;