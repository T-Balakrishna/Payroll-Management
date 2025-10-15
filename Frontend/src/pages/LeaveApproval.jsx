import React, { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

let token = sessionStorage.getItem("token");
let decoded = token ? jwtDecode(token) : "";
let userNumber = decoded?.userNumber || "system";

const LeaveApproval = ({ selectedCompanyId, selectedCompanyName }) => {
  const { t } = useTranslation();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("Pending");
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [userDepartmentId, setUserDepartmentId] = useState(null);

  const getLeaveTypeName = (id) => {
    const type = leaveTypes.find((t) => t.leaveTypeId === id);
    return type ? type.leaveTypeName : t("unknown");
  };

  useEffect(() => {
    token = sessionStorage.getItem("token");
    decoded = token ? jwtDecode(token) : "";
    userNumber = decoded?.userNumber;
  }, []);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/users/byNumber/${userNumber}`);
        setUserRole(res.data.role);
        setUserDepartmentId(res.data.departmentId || null);
      } catch (err) {
        console.error("Failed to fetch user details", err);
        Swal.fire({
          icon: "error",
          title: t("failedToFetchUserDetails"),
          text: t("failedToFetchUserDetails"),
        });
      }
    };
    fetchUserDetails();
  }, [t]);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/leaveTypes")
      .then((res) => setLeaveTypes(res.data))
      .catch((err) => console.error("Failed to fetch leave types", err));
  }, []);

  const fetchLeaves = async (status) => {
    setLoading(true);
    try {
      let url = "http://localhost:5000/api/leaves";
      const params = {};

      if (status !== "all") {
        params.status = status;
      }

      if (userRole === "Admin" && selectedCompanyId) {
        params.companyId = selectedCompanyId;
      } else if (userRole === "Department Admin" && selectedCompanyId && userDepartmentId) {
        params.companyId = selectedCompanyId;
        params.departmentId = userDepartmentId;
      }

      const res = await axios.get(url, { params });
      setLeaves(res.data);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: t("failedToFetchLeaves"),
        text: t("failedToFetchLeaves"),
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userRole) {
      fetchLeaves(activeTab);
    }
  }, [activeTab, userRole, selectedCompanyId, userDepartmentId, t]);

  const handleAction = async (leaveId, action) => {
    setUpdating(true);
    try {
      await axios.put(`http://localhost:5000/api/leaves/${leaveId}/status`, {
        status: action,
        updatedBy: userNumber
      });
      Swal.fire({
        icon: "success",
        title: action === "Approved" ? t("leaveApproved") : t("leaveRejected"),
        text: action === "Approved" ? t("leaveApproved") : t("leaveRejected"),
      });
      fetchLeaves(activeTab);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: action === "Approved" ? t("approvalFailed") : t("rejectionFailed"),
        text: err.response.data.message,
      });
    }
    setUpdating(false);
  };

  const tabs = [
    { id: "all", label: t("allLeaves") },
    { id: "Pending", label: t("pending") },
    { id: "Approved", label: t("approved") },
    { id: "Rejected", label: t("rejected") },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        {t("leaveApproval")} {selectedCompanyName ? `- ${selectedCompanyName}` : ""}
      </h1>

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

      {loading ? (
        <div>{t("loadingLeaves")}</div>
      ) : leaves.length === 0 ? (
        <p>{t("noLeavesFound")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2">{t("employeeNumber")}</th>
                <th className="border px-4 py-2">{t("leaveType")}</th>
                <th className="border px-4 py-2">{t("from")}</th>
                <th className="border px-4 py-2">{t("to")}</th>
                <th className="border px-4 py-2">{t("reason")}</th>
                <th className="border px-4 py-2">{t("actions")}</th>
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