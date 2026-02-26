// pages/CalendarPage.jsx
import React, { useState, useEffect } from "react";
import {
  Calendar,
  Sun,
  CalendarCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import API from "../api";
import { useAuth } from "../auth/AuthContext";

const CalendarPage = ({ empId = null, companyId = null }) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayIndex = new Date(year, month - 1, 1).getDay();

  const today = new Date();
  const effectiveCompanyId = companyId || user?.companyId || user?.company?.companyId || null;
  const effectiveStaffId = empId || user?.staffId || user?.employeeId || null;

  const statusConfig = {
    Present:    { color: "#3B82F6", bg: "#EFF6FF", light: "#DBEAFE", label: "Present",    icon: <CheckCircle  className="w-3.5 h-3.5" /> },
    "Week Off": { color: "#10B981", bg: "#ECFDF5", light: "#D1FAE5", label: "Week Off",   icon: <Sun          className="w-3.5 h-3.5" /> },
    Holiday:    { color: "#10B981", bg: "#ECFDF5", light: "#D1FAE5", label: "Holiday",    icon: <CalendarCheck className="w-3.5 h-3.5" /> },
    Permission: { color: "#8B5CF6", bg: "#F3E8FF", light: "#EDE9FE", label: "Permission", icon: <AlertCircle  className="w-3.5 h-3.5" /> },
    Leave:      { color: "#F97316", bg: "#FFF7ED", light: "#FFEDD5", label: "Leave",      icon: <CheckCircle  className="w-3.5 h-3.5" /> },
    Absent:     { color: "#DC2626", bg: "#FEF2F2", light: "#FEE2E2", label: "Absent",     icon: <XCircle      className="w-3.5 h-3.5" /> },
    "Half-Day": { color: "#EAB308", bg: "#FEFCE8", light: "#FEF08A", label: "Half-Day",   icon: <CheckCircle  className="w-3.5 h-3.5" /> },
  };

  const parseStatus = (rawStatus) => {
    if (!rawStatus) return { key: null, badge: "" };
    const s = String(rawStatus).trim();

    const permMatch = s.match(/^permission\s*[-–]\s*(\d+(?:\.\d+)?)$/i);
    if (permMatch) return { key: "Permission", badge: `${permMatch[1]}h` };

    const halfMatch = s.match(/^half[-\s]?day\s*[-–]\s*(fn|an)$/i);
    if (halfMatch) return { key: "Half-Day", badge: halfMatch[1].toUpperCase() };

    if (/leave/i.test(s)) {
      const leaveHalf = s.match(/half[-\s]?day\s*[-–]\s*(fn|an)/i);
      if (leaveHalf) return { key: "Leave", badge: leaveHalf[1].toUpperCase() };
      return { key: "Leave", badge: "" };
    }

    if (statusConfig[s]) return { key: s, badge: "" };
    return { key: "Absent", badge: "" };
  };

  const getStatusConfig = (rawStatus) => {
    const { key } = parseStatus(rawStatus);
    if (!key) return null;
    if (key === "Leave") return statusConfig.Leave;
    return statusConfig[key] || statusConfig.Absent;
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

    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="h-16" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const rawStatus = attendanceData[cellKey];
      const { badge } = parseStatus(rawStatus);
      const config = getStatusConfig(rawStatus);

      const isToday =
        day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();

      cells.push(
        <div
          key={day}
          className={`relative h-16 rounded-xl flex flex-col items-center justify-center border-2 transition-all duration-200 hover:shadow-md ${
            isToday ? "border-blue-500 shadow-lg" : "border-transparent"
          }`}
          style={{ backgroundColor: config ? config.bg : undefined }}
        >
          {/* Badge: top-right corner */}
          {badge && config && (
            <span
              className="absolute top-1 right-1.5 text-[15px] font-bold leading-none"
              style={{ color: config.color }}
            >
              {badge}
            </span>
          )}

          {/* Date: centered */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-semibold"
            style={{ backgroundColor: config ? config.color : isToday ? "#3B82F6" : "#D1D5DB" }}
          >
            {day}
          </div>

          {/* Icon: below date */}
          {config && (
            <div className="mt-1" style={{ color: config.color }}>
              {config.icon}
            </div>
          )}
        </div>
      );
    }

    return cells;
  };

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  const yearOptions = Array.from({ length: 101 }, (_, i) => year - 50 + i);

  const goToPreviousMonth = () => setSelectedDate(new Date(year, month - 2, 1));
  const goToNextMonth = () => setSelectedDate(new Date(year, month, 1));

  // Summary counts for the current month
  const summaryCounts = Object.values(attendanceData).reduce((acc, raw) => {
    const { key } = parseStatus(raw);
    if (key) acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-full bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-md shadow-blue-200">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Attendance Calendar</h1>
              <p className="text-xs text-gray-400">Track your attendance history</p>
            </div>
          </div>

          {/* Month / Year nav */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPreviousMonth}
              disabled={loading}
              className="w-9 h-9 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-sm transition-all"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>

            <select
              value={month - 1}
              onChange={(e) => setSelectedDate(new Date(year, Number(e.target.value), 1))}
              className="px-3 py-2 border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white text-sm font-medium text-gray-700 shadow-sm outline-none transition-all"
              disabled={loading}
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx}>{name}</option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setSelectedDate(new Date(Number(e.target.value), month - 1, 1))}
              className="px-3 py-2 border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white text-sm font-medium text-gray-700 shadow-sm outline-none transition-all"
              disabled={loading}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={goToNextMonth}
              disabled={loading}
              className="w-9 h-9 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-sm transition-all"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-sm">Loading attendance...</span>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-center gap-2 text-sm shadow-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Summary strip ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {Object.entries(statusConfig).map(([status, cfg]) => (
                <div
                  key={status}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border shadow-sm"
                  style={{ backgroundColor: cfg.bg, borderColor: cfg.light || cfg.bg }}
                >
                  <span style={{ color: cfg.color }}>{cfg.icon}</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold leading-none truncate" style={{ color: cfg.color }}>{status}</p>
                    <p className="text-base font-bold leading-tight" style={{ color: cfg.color }}>
                      {summaryCounts[status] || 0}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Calendar card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-base font-bold text-gray-800 mb-5">
                {monthNames[month - 1]}{" "}
                <span className="text-gray-400 font-medium">{year}</span>
              </h2>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                  <div key={d} className="text-center font-semibold text-gray-600 py-2 text-sm">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-2">
                {renderCells()}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CalendarPage;