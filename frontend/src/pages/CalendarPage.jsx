// pages/CalendarPage.jsx
import React, { useState, useEffect } from "react";
import { Calendar, Sun, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import API from "../api"; // your axios instance with withCredentials: true

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState({}); // { "2025-02-01": "Present", ... }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1; // 1-12
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayIndex = new Date(year, month - 1, 1).getDay();

  const today = new Date();

  const statusConfig = {
    Present:    { color: "#3B82F6", bg: "#EFF6FF", icon: <CheckCircle className="w-4 h-4" /> },
    Holiday:    { color: "#10B981", bg: "#ECFDF5", icon: <Sun className="w-4 h-4" /> },
    Leave:      { color: "#8B5CF6", bg: "#F3E8FF", icon: <CheckCircle className="w-4 h-4" /> },
    Absent:     { color: "#EF4444", bg: "#FEF2F2", icon: <XCircle className="w-4 h-4" /> },
    "Half-Day": { color: "#F59E0B", bg: "#FFF7ED", icon: <AlertCircle className="w-4 h-4" /> },
    Permission: { color: "#8B5CF6", bg: "#F3E8FF", icon: <CheckCircle className="w-4 h-4" /> },
    "Week Off": { color: "#6B7280", bg: "#F3F4F6", icon: <Sun className="w-4 h-4" /> },
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
            // Optional filters (add if your ProtectedRoute or context provides them)
            // companyId: user?.companyId,
            // staffId: user?.staffId,
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
  }, [year, month]);

  const renderCells = () => {
    const cells = [];

    // Empty cells before first day
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="h-16" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const status = attendanceData[cellKey];
      const config = status ? statusConfig[status] || statusConfig["Absent"] : { color: "#9CA3AF", bg: "#F9FAFB" };

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

          <input
            type="month"
            value={`${year}-${String(month).padStart(2, "0")}`}
            onChange={(e) => {
              const [yr, mn] = e.target.value.split("-");
              setSelectedDate(new Date(yr, parseInt(mn) - 1));
            }}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            disabled={loading}
          />
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
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: config.color }} />
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