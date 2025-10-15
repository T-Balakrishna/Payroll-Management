import React, { useState, useEffect } from "react";
import axios from "axios";
import { Calendar, Sun, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { jwtDecode } from "jwt-decode";

const CalendarPage = () => {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState({});

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const today = new Date();

  const statusConfig = {
    "Present":    { color: "#3B82F6", bg: "#EFF6FF", icon: <CheckCircle className="w-4 h-4" /> },
    "Holiday":    { color: "#10B981", bg: "#ECFDF5", icon: <Sun className="w-4 h-4" /> },
    "Leave":      { color: "#392e2eff", bg: "#FEF2F2", icon: <CheckCircle className="w-4 h-4" /> },
    "Absent":     { color: "#EF4444", bg: "#FEF2F2", icon: <XCircle className="w-4 h-4" /> },
    "Half-Day":   { color: "#F59E0B", bg: "#FFF7ED", icon: <CheckCircle className="w-4 h-4" /> },
    "Permission": { color: "#8B5CF6", bg: "#F3E8FF", icon: <CheckCircle className="w-4 h-4" /> },
  };

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const decoded = token ? jwtDecode(token) : "";
    const userNumber = decoded?.userNumber;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/attendance");
        const mapped = {};
        res.data.forEach((att) => {
          mapped[att.attendanceDate] = att.attendanceStatus;
        });
        setAttendanceData(mapped);
      } catch (err) {
        console.error(t("errorFetchingAttendance"), err);
      }
    };
    fetchData();
  }, [t]);

  const renderCells = () => {
    const cells = [];

    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="h-16" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const cellKey = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, "0")}-${String(cellDate.getDate()).padStart(2, "0")}`;

      const status = attendanceData[cellKey];
      const config = status ? statusConfig[status] : { color: "#9CA3AF", bg: "#F9FAFB" };

      const isToday =
        day === today.getDate() &&
        month === today.getMonth() &&
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
          {status && <div style={{ color: config.color }}>{statusConfig[status].icon}</div>}
        </div>
      );
    }
    return cells;
  };

  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];

  return (
    <div className="h-full bg-white p-6">
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t("attendanceCalendar")}</h1>
              <p className="text-gray-600">{t("trackAttendanceHistory")}</p>
            </div>
          </div>

          <input
            type="month"
            value={`${year}-${String(month + 1).padStart(2, "0")}`}
            onChange={(e) => {
              const [yr, mn] = e.target.value.split("-");
              setSelectedDate(new Date(yr, mn - 1));
            }}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          {Object.entries(statusConfig).map(([status, config]) => (
            <div key={status} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: config.color }} />
              <span className="text-sm font-medium text-gray-700">{t(status.toLowerCase())}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex-1">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {t(monthNames[month])} {year}
          </h2>

          <div className="grid grid-cols-7 gap-2 mb-4">
            {["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map((day) => (
              <div key={day} className="text-center font-semibold text-gray-600 py-2">
                {t(day)}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">{renderCells()}</div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;