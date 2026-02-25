// pages/DashboardPage.jsx
import React, { useState, useEffect } from "react";
import {
  User, Calendar, LogOut, Clock, FileText, UserCheck,
  Plus, XCircle, Loader2, AlertCircle, CheckCircle, Activity, TrendingUp,
} from "lucide-react";
import Button from "../components/ui/Button";
import EmployeeProfilePage from "./EmployeeProfilePage";
import CalendarPage from "./CalendarPage";
import TakeLeavePage from "./TakeLeavePage";
import API from "../api";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
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
  const [resolvedStaffId, setResolvedStaffId] = useState(null);

  const openProfileModal = () => setModalContent("profile");
  const openCalendarModal = () => setModalContent("calendar");
  const openTakeLeaveModal = () => setModalContent("takeleave");
  const closeModal = () => setModalContent(null);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  };

  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        const res = await API.get(`/users/${user.id}`);
        const employee = res.data;
        const fullName =
          `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
          employee.employeeName || "New User";
        setUserName(fullName);
        if (employee.photo) {
          const photoPath = employee.photo.startsWith("/uploads/")
            ? employee.photo : `/uploads/${employee.photo}`;
          setPhotoUrl(`http://localhost:5000${photoPath}`);
        } else {
          setPhotoUrl(null);
        }
        setCompanyId(employee.companyId || null);
        setDepartmentId(employee.departmentId || null);
        const directStaffId =
          employee.staffId || employee.employeeId || user?.staffId || user?.employeeId;
        if (directStaffId) {
          setResolvedStaffId(directStaffId);
        } else if (employee.userNumber) {
          const empRes = await API.get("/employees");
          const matchedEmp = (empRes.data || []).find(
            (emp) => String(emp.staffNumber || "") === String(employee.userNumber)
          );
          setResolvedStaffId(matchedEmp?.staffId || null);
        } else {
          setResolvedStaffId(null);
        }
        toast.success(`Welcome back, ${fullName}! 🎉`);
      } catch (err) {
        console.error("Error fetching employee data:", err);
        toast.error("Failed to load user information");
        setUserName("New User");
        setPhotoUrl(null);
        setResolvedStaffId(user?.staffId || user?.employeeId || null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmployeeData();
  }, [user?.id]);

  useEffect(() => {
    if (user?.staffId || user?.employeeId) {
      setResolvedStaffId(user.staffId || user.employeeId);
    }
  }, [user?.staffId, user?.employeeId]);

  useEffect(() => {
    if (!resolvedStaffId) return;
    const fetchPunches = async () => {
      setIsLoading(true);
      try {
        const res = await API.get(`/biometricPunches`, { params: { staffId: resolvedStaffId } });
        const punchesData = res.data.map((row) => ({
          ...row,
          punchTimestamp: row.punchTimestamp || new Date().toISOString(),
          location: row.location || "Unknown Location",
        }));
        setPunches(punchesData.sort((a, b) => new Date(b.punchTimestamp) - new Date(a.punchTimestamp)));
      } catch (err) {
        console.error("Error fetching punches:", err);
        toast.error("Failed to load Punch history");
        setPunches([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPunches();
  }, [resolvedStaffId]);

  useEffect(() => {
    if (!resolvedStaffId) return;
    const fetchLeaves = async () => {
      setIsLoading(true);
      try {
        const res = await API.get("/leaveRequests", { params: { staffId: resolvedStaffId } });
        const leaveData = res.data.map((l) => ({
          from_date: l.startDate ? formatDate(l.startDate) : "N/A",
          to_date: l.endDate ? formatDate(l.endDate) : "N/A",
          description: l.reason || "N/A",
          status: l.status || "Pending",
        }));
        setLeaves(leaveData.sort((a, b) => new Date(b.from_date) - new Date(a.from_date)));
      } catch (err) {
        console.error("Error fetching leaves:", err);
        toast.error("Failed to load leave history");
        setLeaves([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaves();
  }, [resolvedStaffId]);

  const getStatusBadge = (status) => {
    const lower = status?.toLowerCase();
    if (lower === "approved")
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
          <CheckCircle className="w-3 h-3" /> Approved
        </span>
      );
    if (lower === "rejected")
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
          <XCircle className="w-3 h-3" /> Rejected
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
        <AlertCircle className="w-3 h-3" /> {status || "Pending"}
      </span>
    );
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Sign Out",
      text: "Are you sure you want to sign out?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, sign out",
      cancelButtonText: "Stay",
      background: "#ffffff",
      color: "#1e293b",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#e2e8f0",
    });
    if (!result.isConfirmed) return;
    try {
      await API.post("/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      window.location.href = "/login";
    }
  };

  const renderTable = () => {
    if (isLoading)
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-gray-400 text-sm">Loading your data...</p>
        </div>
      );

    if (error)
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      );

    if (tableType === "leave") {
      return (
        <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-indigo-50">
            <FileText className="w-5 h-5 text-indigo-500" />
            <h3 className="text-base font-bold text-gray-800">Leave History</h3>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">From Date</th>
                  <th className="text-left py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">To Date</th>
                  <th className="text-left py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="text-left py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaves.length > 0 ? (
                  leaves.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors duration-150">
                      <td className="py-4 px-6 text-sm text-gray-700">{row.from_date}</td>
                      <td className="py-4 px-6 text-sm text-gray-700">{row.to_date}</td>
                      <td className="py-4 px-6 text-sm text-gray-500 max-w-xs truncate">{row.description}</td>
                      <td className="py-4 px-6">{getStatusBadge(row.status)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-12 text-gray-400 text-sm">No leave records found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-blue-50">
          <Clock className="w-5 h-5 text-blue-500" />
          <h3 className="text-base font-bold text-gray-800">Punch History</h3>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Time</th>
                <th className="text-left py-3.5 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
              </tr>
            </thead>
            <tbody>
              {punches.length > 0 ? (
                punches.map((row, idx) => {
                  const dateObj = new Date(row.punchTimestamp);
                  const time = dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                  const date = formatDate(row.punchTimestamp);
                  return (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors duration-150">
                      <td className="py-4 px-6 text-sm text-gray-700">{date}</td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                          <Clock className="w-3.5 h-3.5 text-blue-400" />{time}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-medium">
                          {row.location || "Unknown Location"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="3" className="text-center py-12 text-gray-400 text-sm">No punch records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderInlineModal = () => {
    if (!modalContent) return null;
    let content = null;
    let maxW = "max-w-5xl";

    if (modalContent === "profile") { maxW = "max-w-4xl"; content = <EmployeeProfilePage />; }
    if (modalContent === "calendar") {
      maxW = "max-w-6xl";
      content = <CalendarPage empId={resolvedStaffId} companyId={companyId} />;
    }
    if (modalContent === "takeleave") {
      maxW = "max-w-6xl";
      content = (
        <TakeLeavePage
          empId={resolvedStaffId}
          companyId={companyId}
          departmentId={departmentId}
        />
      );
    }
    const scrollable = modalContent === "takeleave" || modalContent === "profile";

    return (
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm overflow-y-auto p-4 sm:p-8 flex items-start justify-center"
        onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
      >
        <div className={`relative w-full ${maxW} my-auto`}>
          <div className="relative bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-2xl shadow-gray-300/50">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-xl bg-gray-100 hover:bg-red-100 border border-gray-200 hover:border-red-200 text-gray-500 hover:text-red-500 flex items-center justify-center transition-all text-sm font-bold shadow-sm"
            >
              ✕
            </button>
            <div className={`${scrollable ? "max-h-[88vh]" : ""} overflow-y-auto pt-14`}>
              {content}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const approvedLeaves = leaves.filter((l) => l.status?.toLowerCase() === "approved").length;
  const pendingLeaves = leaves.filter((l) => l.status?.toLowerCase() === "pending").length;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          <button
            onClick={openCalendarModal}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-blue-100 border border-gray-200 hover:border-blue-300 text-gray-500 hover:text-blue-600 transition-all"
          >
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-semibold">Calendar</span>
          </button>

          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {userName}
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Have a productive day.</p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={openProfileModal}
              className="w-11 h-11 rounded-xl bg-gray-100 hover:bg-blue-100 border border-gray-200 hover:border-blue-300 flex items-center justify-center overflow-hidden transition-all"
            >
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = "/placeholder-image.jpg"; }} />
              ) : (
                <User className="w-5 h-5 text-gray-500" />
              )}
            </button>
            <button
              onClick={handleLogout}
              className="w-11 h-11 rounded-xl bg-gray-100 hover:bg-red-100 border border-gray-200 hover:border-red-200 flex items-center justify-center text-gray-500 hover:text-red-500 transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md hover:shadow-blue-100 transition-all duration-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Punches</p>
              <p className="text-3xl font-bold text-gray-900 mt-0.5">{punches.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-gray-200 hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-100 transition-all duration-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Approved Leaves</p>
              <p className="text-3xl font-bold text-gray-900 mt-0.5">{approvedLeaves}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-gray-200 hover:border-amber-300 hover:shadow-md hover:shadow-amber-100 transition-all duration-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Requests</p>
              <p className="text-3xl font-bold text-gray-900 mt-0.5">{pendingLeaves}</p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={openTakeLeaveModal}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-blue-200 hover:shadow-blue-300 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" /> Apply Leave
          </button>

          <button
            onClick={() => setTableType("biometric")}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border transition-all hover:-translate-y-0.5 shadow-sm ${
              tableType === "biometric"
                ? "bg-blue-100 border-blue-300 text-blue-700"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}
          >
            <UserCheck className="w-4 h-4" /> Punch History
          </button>

          <button
            onClick={() => setTableType("leave")}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border transition-all hover:-translate-y-0.5 shadow-sm ${
              tableType === "leave"
                ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}
          >
            <FileText className="w-4 h-4" /> Leave History
          </button>
        </div>

        {/* Table */}
        {renderTable()}
      </div>

      {renderInlineModal()}
    </div>
  );
}