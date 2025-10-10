import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  User, Calendar, LogOut, Clock, FileText, UserCheck,
  Plus, XCircle, CheckCircle, AlertCircle
} from "lucide-react";
import EmployeeProfile from './EmployeeProfilePage';
import CalendarPage from './CalendarPage';
import TakeLeavePage from './TakeLeavePage';
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

let token = sessionStorage.getItem("token");
let decoded = token ? jwtDecode(token) : "";
let userNumber = decoded?.userNumber;

export default function DashboardPage() {
  const [modalContent, setModalContent] = useState(null);
  const [tableType, setTableType] = useState("biometric");
  const [userName, setUserName] = useState("New User");
  const [photoUrl, setPhotoUrl] = useState(null);
  const [punches, setPunches] = useState([]);
  const [biometricId, setBiometricId] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [companyId, setCompanyId] = useState(null); // Added
  const [departmentId, setDepartmentId] = useState(null); // Added

  const hasFetchedRef = useRef(false);
  const abortControllerRef = useRef(null);

  const openProfileModal = () => setModalContent("profile");
  const openCalendarModal = () => setModalContent("calendar");
  const closeModal = () => setModalContent(null);

  useEffect(() => {
    token = sessionStorage.getItem("token");
    decoded = token ? jwtDecode(token) : "";
    userNumber = decoded?.userNumber;
  }, []);
  
  // Fetch employee info
  useEffect(() => {
      
    if (!userNumber) {      
      console.error("No userNumber found in sessionStorage");
      setUserName("Guest");
      setPhotoUrl(null);
      setCompanyId(null); // Added
      setDepartmentId(null); // Added
      return;
    }

    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    abortControllerRef.current = new AbortController();
    setIsLoading(true);

    const fetchUserData = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/employees/full/${userNumber}`, {
          signal: abortControllerRef.current.signal,
          timeout: 10000,
        });
        const employee = res.data;
        if (employee.firstName && employee.lastName) {
          const fullName = `${employee.firstName || employee.employeeName || ''} ${employee.lastName || ''}`.trim() || 'New User';
          setUserName(fullName);
        }

        if (employee.photo) {
          const photoPath = employee.photo.startsWith("/uploads/") ? employee.photo : `/uploads/${employee.photo}`;
          setPhotoUrl(`http://localhost:5000${photoPath}`);
        } else {
          setPhotoUrl(null);
        }

        // Set companyId and departmentId
        setCompanyId(employee.companyId || null);
        setDepartmentId(employee.departmentId || null);

        hasFetchedRef.current = true;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error("Error fetching user data:", err.response?.data?.error || err.message);
        setError("Failed to fetch user data. Please try again.");
        setUserName("New User");
        setPhotoUrl(null);
        setCompanyId(null); // Added
        setDepartmentId(null); // Added
        hasFetchedRef.current = true;
      }
    };

    fetchUserData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [userNumber]);

  // Fetch biometricId using employeeNumber
  useEffect(() => {
    if (!userNumber) return;
    setIsLoading(true);

    const fetchBiometricId = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/users/getBiometricNumber/${userNumber}`);        
        const bio = res.data.biometricNumber;
        if (bio) {
          setBiometricId(bio);
        } else {
          console.warn("No biometric linked to employeeNumber:", userNumber);
          setError("No biometric data linked to your account.");
        }
      } catch (err) {
        console.error("Error fetching biometrics:", err.message);
        setError("Failed to fetch biometric data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchBiometricId();
  }, [userNumber]);

  // Fetch device info by IP
  const fetchDeviceByIp = async (ip) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/biometricDevices/ip/${ip}`, {
        timeout: 5000,
      });
      return res.data.location || "Unknown Location";
    } catch (err) {
      console.error("Error fetching device by IP:", err.message);
      return "Unknown Location";
    }
  };

  // Fetch punches using biometricId
  useEffect(() => {
    if (!biometricId) return;
    setIsLoading(true);

    const fetchPunches = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/punches/user/${Number(biometricId)}`, {
          timeout: 10000,
        });
        const punchesData = await Promise.all(
          res.data.map(async (row) => {
            if (!row.location && row.deviceIp) {
              row.location = await fetchDeviceByIp(row.deviceIp);
            }
            return {
              ...row,
              punchTimestamp: row.punchTimestamp || new Date().toISOString(),
              location: row.location || "Unknown",
            };
          })
        );
        setPunches(punchesData.sort((a, b) => new Date(b.punchTimestamp) - new Date(a.punchTimestamp)));
      } catch (err) {
        console.error("Error fetching punches:", err.message);
        setError("Failed to fetch attendance data.");
        setPunches([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPunches();
  }, [biometricId]);

  // Fetch leaves for this employee
  useEffect(() => {
    if (!userNumber) return;
    setIsLoading(true);

    const fetchLeaves = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/leaves/employee/${userNumber}`, {
          timeout: 10000,
        });
        const leaveData = res.data.map(l => ({
          from_date: l.startDate ? formatDate(l.startDate) : "N/A",
          to_date: l.endDate ? formatDate(l.endDate) : "N/A",
          description: l.reason || l.LeaveType?.leaveTypeName || "N/A",
          status: l.status || "Pending",
        }));
        setLeaves(leaveData.sort((a, b) => new Date(b.from_date) - new Date(a.from_date)));
      } catch (err) {
        console.error("Error fetching leaves:", err.message);
        setError("Failed to fetch leave data.");
        setLeaves([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaves();
  }, [userNumber]);

  const getStatusIcon = (status) => {
    switch (status) {
      case "Approved": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "Rejected": return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const renderTable = () => {
    if (isLoading) {
      return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <p className="text-gray-600">Loading data...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
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
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">From Date</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">To Date</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Reason</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaves.length > 0 ? leaves.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="py-4 px-6 border-b border-gray-100">{row.from_date}</td>
                    <td className="py-4 px-6 border-b border-gray-100">{row.to_date}</td>
                    <td className="py-4 px-6 border-b border-gray-100">{row.description}</td>
                    <td className="py-4 px-6 border-b border-gray-100 flex items-center gap-2">
                      {getStatusIcon(row.status)}
                      <span className={`font-medium ${row.status === "Approved" ? "text-green-700" : row.status === "Rejected" ? "text-red-700" : "text-yellow-700"}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-gray-500">No leave data available</td>
                  </tr>
                )}
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
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Time</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Location</th>
                </tr>
              </thead>
              <tbody>
                {punches.length > 0 ? punches.map((row, idx) => {
                  const dateObj = new Date(row.punchTimestamp);
                  const time = dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                  const date = formatDate(row.punchTimestamp);
                  return (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="py-4 px-6 border-b border-gray-100">{time}</td>
                      <td className="py-4 px-6 border-b border-gray-100">{row.location}</td>
                      <td className="py-4 px-6 border-b border-gray-100">{date}</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="3" className="text-center py-6 text-gray-500">No punch data available</td>
                  </tr>
                )}
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
          <button onClick={openCalendarModal} className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors duration-150">
            <Calendar className="w-6 h-6 text-gray-600" />
          </button>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {userName}</h1>
            <p className="text-gray-600">Have a great day at work</p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={openProfileModal} className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center overflow-hidden relative transition-colors duration-150">
              <img
                src={photoUrl || "/placeholder-image.jpg"}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = "/placeholder-image.jpg"; }}
              />
            </button>

            <button
              onClick={() => {
                sessionStorage.removeItem("token");
                window.location.href = "/";
              }}
              className="w-12 h-12 bg-red-100 hover:bg-red-200 rounded-xl flex items-center justify-center transition-colors duration-150"
            >
              <LogOut className="w-6 h-6 text-red-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <button onClick={() => setModalContent("takeleave")} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors duration-150">
            <Plus className="w-5 h-5" /> Apply Leave
          </button>
          <button onClick={() => setTableType("biometric")} className={`px-6 py-3 font-semibold rounded-xl flex items-center gap-2 ${tableType === "biometric" ? "bg-blue-600 text-white" : "bg-white text-gray-700 border border-gray-200"}`}>
            <UserCheck className="w-5 h-5" /> Biometric Punch History
          </button>
          <button onClick={() => setTableType("leave")} className={`px-6 py-3 font-semibold rounded-xl flex items-center gap-2 transition-colors duration-150 ${tableType === "leave" ? "bg-blue-600 text-white" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"}`}>
            <FileText className="w-5 h-5" /> Leave History
          </button>
        </div>

        <div>{renderTable()}</div>
      </div>

      {modalContent && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl relative">
            <button className="absolute z-50 top-4 right-4 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors duration-150" onClick={closeModal}>
              <XCircle className="w-6 h-6 text-gray-600" />
            </button>

            <div className="h-full overflow-y-auto">
              {modalContent === "profile" && <EmployeeProfile />}
              {modalContent === "calendar" && <CalendarPage />}
              {modalContent === "takeleave" && (
                <TakeLeavePage
                  empId={userNumber}
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
