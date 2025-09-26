import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  User, Calendar, LogOut, Clock, FileText, UserCheck,
  Plus, XCircle, CheckCircle, AlertCircle
} from "lucide-react";
import EmployeeProfile from './EmployeeProfilePage';
import CalendarPage from './CalendarPage';
import TakeLeavePage from './TakeLeavePage';

export default function DashboardPage() {
  const [modalContent, setModalContent] = useState(null);
  const [tableType, setTableType] = useState("biometric");
  const [userName, setUserName] = useState("New User");
  const [photoUrl, setPhotoUrl] = useState(null);

  const userNumber = sessionStorage.getItem("userNumber");
  const hasFetchedRef = useRef(false);
  const abortControllerRef = useRef(null);

  const openProfileModal = () => setModalContent("profile");
  const openCalendarModal = () => setModalContent("calendar");
  const closeModal = () => setModalContent(null);

  useEffect(() => {
    if (!userNumber) {
      console.error("No userNumber found in sessionStorage");
      setUserName("Guest");
      setPhotoUrl(null);
      return;
    }

    if (hasFetchedRef.current) return;

    abortControllerRef.current = new AbortController();

    const fetchUserData = async () => {
      try {
        console.log('Fetching user data for userNumber:', userNumber);
        const res = await axios.get(`http://localhost:5000/api/employees/full/${userNumber}`, {
          signal: abortControllerRef.current.signal,
          timeout: 10000,
        });
        const employee = res.data;

        console.log("Employee data:", employee);

        // Update name
        const fullName = `${employee.firstName || employee.employeeName || ''} ${employee.lastName || ''}`.trim() || 'New User';
        setUserName(fullName);

        // Handle photo
        if (employee.photo) {
          const photoPath = employee.photo.startsWith("/uploads/")
            ? employee.photo
            : `/uploads/${employee.photo}`;
          setPhotoUrl(photoPath); // ✅ leave it relative, Vite proxy will handle it
          // Set URL directly without preload
        } else {
          console.log("No photo found in employee data, using placeholder");
          setPhotoUrl(null);
        }

        hasFetchedRef.current = true;
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log("Fetch aborted for userNumber:", userNumber);
          return;
        }
        console.error("Error fetching user data:", err.response?.data?.error || err.message);
        setUserName("New User");
        setPhotoUrl(null);
        hasFetchedRef.current = true;
      }
    };

    fetchUserData();

    return () => {
      if (abortControllerRef.current && !hasFetchedRef.current) {
        console.log("Aborting fetch for userNumber:", userNumber);
        abortControllerRef.current.abort();
      }
    };
  }, [userNumber]);

  // Sample Data (unchanged)
  const biometricData = [
    { time_stamp: "2025-01-10 09:01", location: "Main Gate" },
    { time_stamp: "2025-01-10 17:45", location: "Main Gate" },
  ];

  const leaveHistoryData = [
    { from_date: "2024-12-20", to_date: "2024-12-22", description: "Medical", status: "Approved" },
    { from_date: "2024-11-05", to_date: "2024-11-06", description: "Personal", status: "Rejected" },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case "Approved": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "Rejected": return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const renderTable = () => {
    if (tableType === "leave") {
      return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" /> Leave History
            </h3>
          </div>
          <div className="overflow-x-auto max-h-110 overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">From Date</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">To Date</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Reason</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaveHistoryData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="py-4 px-6 border-b border-gray-100">{row.from_date}</td>
                    <td className="py-4 px-6 border-b border-gray-100">{row.to_date}</td>
                    <td className="py-4 px-6 border-b border-gray-100">{row.description}</td>
                    <td className="py-4 px-6 border-b border-gray-100 flex items-center gap-2">
                      {getStatusIcon(row.status)}
                      <span className={`font-medium ${
                        row.status === "Approved" ? "text-green-700" :
                        row.status === "Rejected" ? "text-red-700" : "text-yellow-700"
                      }`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    } else {
      return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" /> Biometric History
            </h3>
          </div>
          <div className="overflow-x-auto max-h-110 overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Time Stamp</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Location</th>
                </tr>
              </thead>
              <tbody>
                {biometricData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="py-4 px-6 border-b border-gray-100 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      {row.time_stamp}
                    </td>
                    <td className="py-4 px-6 border-b border-gray-100">{row.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={openCalendarModal} className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-gray-600" />
          </button>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {userName}</h1>
            <p className="text-gray-600">Have a great day at work</p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={openProfileModal} className="w-15 h-15 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center overflow-hidden relative">
              <img
                src={photoUrl || "/placeholder-image.jpg"}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error("Image failed to load in img tag:", e.currentTarget.src, e);
                  e.currentTarget.src = "/placeholder-image.jpg";
                }}
                onLoad={() => console.log("Image loaded successfully in img tag:", photoUrl)}
              />
            </button>

            <button
              onClick={() => {
                sessionStorage.removeItem("token");
                sessionStorage.removeItem("userNumber");
                window.location.href = "/";
              }}
              className="w-12 h-12 bg-red-100 hover:bg-red-200 rounded-xl flex items-center justify-center"
            >
              <LogOut className="w-6 h-6 text-red-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <button onClick={() => setModalContent("takeleave")} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-2">
            <Plus className="w-5 h-5" /> Apply Leave
          </button>
          <button onClick={() => setTableType("biometric")} className={`px-6 py-3 font-semibold rounded-xl flex items-center gap-2 ${tableType === "biometric" ? "bg-blue-600 text-white" : "bg-white text-gray-700 border border-gray-200"}`}>
            <UserCheck className="w-5 h-5" /> Attendance History
          </button>
          <button onClick={() => setTableType("leave")} className={`px-6 py-3 font-semibold rounded-xl flex items-center gap-2 ${tableType === "leave" ? "bg-blue-600 text-white" : "bg-white text-gray-700 border border-gray-200"}`}>
            <FileText className="w-5 h-5" /> Leave History
          </button>
        </div>

        <div>{renderTable()}</div>
      </div>

      {modalContent && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl relative">
            <button className="absolute z-50 top-4 right-4 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center" onClick={closeModal}>
              <XCircle className="w-6 h-6 text-gray-600" />
            </button>

            <div className="h-full overflow-y-auto">
              {modalContent === "profile" && <EmployeeProfile />}
              {modalContent === "calendar" && <CalendarPage />}
              {modalContent === "takeleave" && <TakeLeavePage empId={userNumber} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}