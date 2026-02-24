// pages/CalendarPage.jsx
import React, { useState, useEffect } from "react";
import { Calendar, Sun, CalendarCheck, CheckCircle, XCircle, AlertCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import API from "../api"; // your axios instance with withCredentials: true
import { useAuth } from "../auth/AuthContext";

const CalendarPage = ({ empId = null, companyId = null }) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState({}); // { "2025-02-01": "Present", ... }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1; // 1-12
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayIndex = new Date(year, month - 1, 1).getDay();

  const today = new Date();
  const effectiveCompanyId = companyId || user?.companyId || user?.company?.companyId || null;
  const effectiveStaffId = empId || user?.staffId || user?.employeeId || null;

  const statusConfig = {
    Present:    { color: "#3B82F6", bg: "#EFF6FF", icon: <CheckCircle className="w-4 h-4" /> },
    "Week Off": { color: "#10B981", bg: "#ECFDF5", icon: <Sun className="w-4 h-4" /> },
    Holiday:    { color: "#10B981", bg: "#ECFDF5", icon: <CalendarCheck className="w-4 h-4" /> },
    Permission: { color: "#8B5CF6", bg: "#F3E8FF", icon: <AlertCircle className="w-4 h-4" /> },
    Leave:      { color: "#F97316", bg: "#FFF7ED", icon: <CheckCircle className="w-4 h-4" /> },
    Absent:     { color: "#DC2626", bg: "#FEF2F2", icon: <XCircle className="w-4 h-4" /> },
    "Half-Day": { color: "#EAB308", bg: "#FEFCE8", icon: <CheckCircle className="w-4 h-4" /> },
    Late:       { color: "#3B82F6", bg: "#EFF6FF", icon: <AlertCircle className="w-4 h-4" /> },
    "Early Exit": { color: "#EAB308", bg: "#FEFCE8", icon: <AlertCircle className="w-4 h-4" /> },
  };

  const getStatusConfig = (status) => {
    if (!status) return { color: "#9CA3AF", bg: "#F9FAFB" };
    // Keep leave color/icon for custom DB statuses like "test-leave" or "Leave - Sick Leave"
    if (/leave/i.test(String(status))) return statusConfig.Leave;
    return statusConfig[status] || statusConfig["Absent"];
  };

  useEffect(() => {
    const fetchMonth = async () => {
      setLoading(true);
      setError(null);

      try {
        const monthStr = `${year}-${String(month).padStart(2, "0")}`;

        const res = await API.get("/attendances/month", {
          params: {
            month: monthStr,
            ...(effectiveCompanyId ? { companyId: effectiveCompanyId } : {}),
            ...(effectiveStaffId ? { staffId: effectiveStaffId } : {}),
          },
        });

        setAttendanceData(res.data.data || {});
      } catch (err) {
        console.error("Failed to load monthly attendance:", err);
        setError("Could not load attendance data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchMonth();
  }, [year, month, effectiveCompanyId, effectiveStaffId]);

  const renderCells = () => {
    const cells = [];

    // Empty cells before first day
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="h-16" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const status = attendanceData[cellKey];
      const config = getStatusConfig(status);

      const isToday =
        day === today.getDate() &&
        month === today.getMonth() + 1 &&
        year === today.getFullYear();

      cells.push(
        <div
          key={day}
          className={`h-16 rounded-xl flex flex-col items-center justify-center border-2 transition-all duration-200 hover:shadow-md ${
            isToday ? "border-blue-500 shadow-lg" : "border-transparent"
          }`}
          style={{ backgroundColor: config.bg }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-semibold mb-1"
            style={{ backgroundColor: config.color }}
          >
            {day}
          </div>
          {status && <div style={{ color: config.color }}>{config.icon}</div>}
        </div>
      );
    }

    return cells;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const yearOptions = Array.from({ length: 101 }, (_, i) => year - 50 + i);

  const goToPreviousMonth = () => {
    setSelectedDate(new Date(year, month - 2, 1));
  };

  const goToNextMonth = () => {
    setSelectedDate(new Date(year, month, 1));
  };

  return (
    <div className="h-full bg-white p-6">
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Attendance Calendar</h1>
              <p className="text-gray-600">Track your attendance history</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPreviousMonth}
              disabled={loading}
              className="w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>

            <select
              value={month - 1}
              onChange={(e) => {
                const nextMonthIndex = Number(e.target.value);
                setSelectedDate(new Date(year, nextMonthIndex, 1));
              }}
              className="px-3 py-2 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
              disabled={loading}
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => {
                const nextYear = Number(e.target.value);
                setSelectedDate(new Date(nextYear, month - 1, 1));
              }}
              className="px-3 py-2 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
              disabled={loading}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={goToNextMonth}
              disabled={loading}
              className="w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Loading attendance...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-6">
              {Object.entries(statusConfig).map(([status, config]) => (
                <div key={status} className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-white"
                    style={{ backgroundColor: config.color }}
                  >
                    {config.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{status}</span>
                </div>
              ))}
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {monthNames[month - 1]} {year}
              </h2>

              <div className="grid grid-cols-7 gap-2 mb-4">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center font-semibold text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">{renderCells()}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CalendarPage;
