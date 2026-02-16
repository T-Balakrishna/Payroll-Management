// pages/DashboardPage.jsx
import React, { useState, useEffect } from "react";
import {
  User,
  Calendar,
  LogOut,
  Clock,
  FileText,
  UserCheck,
  Plus,
  XCircle,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import EmployeeProfilePage from "./EmployeeProfilePage";
import CalendarPage from "./CalendarPage";
import TakeLeavePage from "./TakeLeavePage";
import API from "../api";
import { toast } from "react-toastify";
import { useAuth } from "../auth/AuthContext";

export default function EmployeeDashboard() {
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalContent, setModalContent] = useState(null);
  const [tableType, setTableType] = useState("biometric");

  const [userName, setUserName] = useState("New User");
  const [photoUrl, setPhotoUrl] = useState(null);
  const [punches, setPunches] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [departmentId, setDepartmentId] = useState(null);

  const openProfileModal = () => setModalContent("profile");
  const openCalendarModal = () => setModalContent("calendar");
  const openTakeLeaveModal = () => setModalContent("takeleave");
  const closeModal = () => setModalContent(null);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Fetch full employee details
  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        const res = await API.get(`/users/${user.id}`);

        const employee = res.data;
        const fullName =
          `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
          employee.employeeName ||
          "New User";

        setUserName(fullName);

        if (employee.photo) {
          const photoPath = employee.photo.startsWith("/uploads/")
            ? employee.photo
            : `/uploads/${employee.photo}`;
          setPhotoUrl(`http://localhost:5000${photoPath}`);
        } else {
          setPhotoUrl(null);
        }

        setCompanyId(employee.companyId || null);
        setDepartmentId(employee.departmentId || null);
      } catch (err) {
        console.error("Error fetching employee data:", err);
        toast.error("Failed to fetch user data");
        setUserName("New User");
        setPhotoUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployeeData();
  }, [user?.id]);

  // Fetch biometric punches
  useEffect(() => {
    if (!user?.staffId && !user?.employeeId) return;

    const fetchPunches = async () => {
      setIsLoading(true);
      try {
        const staffId = user.staffId || user.employeeId;
        const res = await API.get(`/punches/staff/${staffId}`);

        const punchesData = res.data.map((row) => ({
          ...row,
          punchTimestamp: row.punchTimestamp || new Date().toISOString(),
          location: row.location || "Unknown Location",
        }));

        setPunches(
          punchesData.sort(
            (a, b) => new Date(b.punchTimestamp) - new Date(a.punchTimestamp)
          )
        );
      } catch (err) {
        console.error("Error fetching punches:", err);
        toast.error("Failed to fetch attendance data");
        setPunches([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPunches();
  }, [user?.staffId, user?.employeeId]);

  // Fetch leaves
  useEffect(() => {
    if (!user?.staffId) return;

    const fetchLeaves = async () => {
      setIsLoading(true);
      try {
        const res = await API.get(`/leaves/employee/${user.staffId}`);

        const leaveData = res.data.map((l) => ({
          from_date: l.startDate ? formatDate(l.startDate) : "N/A",
          to_date: l.endDate ? formatDate(l.endDate) : "N/A",
          description: l.reason || "N/A",
          status: l.status || "Pending",
        }));

        setLeaves(
          leaveData.sort((a, b) => new Date(b.from_date) - new Date(a.from_date))
        );
      } catch (err) {
        console.error("Error fetching leaves:", err);
        toast.error("Failed to fetch leave data");
        setLeaves([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaves();
  }, [user?.staffId]);

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const renderTable = () => {
    if (isLoading) {
      return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-gray-600">Loading data...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
        </div>
      );
    }

    if (tableType === "leave") {
      return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" /> Leave History
            </h3>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">
                    From Date
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">
                    To Date
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">
                    Reason
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaves.length > 0 ? (
                  leaves.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="py-4 px-6 border-b border-gray-100">
                        {row.from_date}
                      </td>
                      <td className="py-4 px-6 border-b border-gray-100">
                        {row.to_date}
                      </td>
                      <td className="py-4 px-6 border-b border-gray-100">
                        {row.description}
                      </td>
                      <td className="py-4 px-6 border-b border-gray-100 flex items-center gap-2">
                        {getStatusIcon(row.status)}
                        <span
                          className={`font-medium ${
                            row.status?.toLowerCase() === "approved"
                              ? "text-green-700"
                              : row.status?.toLowerCase() === "rejected"
                              ? "text-red-700"
                              : "text-yellow-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="4"
                      className="text-center py-6 text-gray-500"
                    >
                      No leave data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Biometric punches table
    return (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" /> Biometric History
          </h3>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-4 px-6 font-semibold text-gray-700">
                  Date
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">
                  Time
                </th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">
                  Location
                </th>
              </tr>
            </thead>
            <tbody>
              {punches.length > 0 ? (
                punches.map((row, idx) => {
                  const dateObj = new Date(row.punchTimestamp);
                  const time = dateObj.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const date = formatDate(row.punchTimestamp);

                  return (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="py-4 px-6 border-b border-gray-100">
                        {date}
                      </td>
                      <td className="py-4 px-6 border-b border-gray-100">
                        {time}
                      </td>
                      <td className="py-4 px-6 border-b border-gray-100">
                        {row.location || "Unknown Location"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="3" className="text-center py-6 text-gray-500">
                    No punch data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const handleLogout = async () => {
    try {
      await API.post("/auth/logout");
      toast.success("Logged out successfully");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error("Logout failed");
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={openCalendarModal}
            className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors duration-150"
          >
            <Calendar className="w-6 h-6 text-gray-600" />
          </button>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {userName}
            </h1>
            <p className="text-gray-600">Have a great day!</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openProfileModal}
              className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center overflow-hidden relative transition-colors duration-150"
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder-image.jpg";
                  }}
                />
              ) : (
                <User className="w-6 h-6 text-gray-600" />
              )}
            </button>

            <button
              onClick={handleLogout}
              className="w-12 h-12 bg-red-100 hover:bg-red-200 rounded-xl flex items-center justify-center transition-colors duration-150"
            >
              <LogOut className="w-6 h-6 text-red-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <button
            onClick={openTakeLeaveModal}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors duration-150"
          >
            <Plus className="w-5 h-5" /> Apply Leave
          </button>

          <button
            onClick={() => setTableType("biometric")}
            className={`px-6 py-3 font-semibold rounded-xl flex items-center gap-2 transition-colors duration-150 ${
              tableType === "biometric"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <UserCheck className="w-5 h-5" /> Attendance History
          </button>

          <button
            onClick={() => setTableType("leave")}
            className={`px-6 py-3 font-semibold rounded-xl flex items-center gap-2 transition-colors duration-150 ${
              tableType === "leave"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <FileText className="w-5 h-5" /> Leave History
          </button>
        </div>

        {renderTable()}
      </div>

      {/* Modal */}
      {modalContent && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl relative">
            <button
              className="absolute z-50 top-4 right-4 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors duration-150"
              onClick={closeModal}
            >
              <XCircle className="w-6 h-6 text-gray-600" />
            </button>

            <div className="h-full overflow-y-auto">
              {modalContent === "profile" && <EmployeeProfilePage />}
              {modalContent === "calendar" && <CalendarPage />}
              {modalContent === "takeleave" && (
                <TakeLeavePage
                  empId={user?.staffId || user?.employeeId}
                  companyId={companyId}
                  departmentId={departmentId}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}