import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";
import API from "../../../api";
import { useAuth } from "../../../auth/AuthContext";

const DEFAULT_FORM = {
  name: "",
  startTime: "09:00",
  endTime: "18:00",
  beginCheckInBefore: 15,
  allowCheckOutAfter: 15,
  enableAutoAttendance: true,
  requireCheckIn: true,
  requireCheckOut: true,
  allowMultipleCheckIns: false,
  autoMarkAbsentIfNoCheckIn: false,
  workingHoursCalculation: "first_to_last",
  minimumHours: 6,
  halfDayHours: 4,
  absentHours: 6,
  enableLateEntry: true,
  lateGracePeriod: 15,
  enableEarlyExit: true,
  earlyExitPeriod: 15,
  markAutoAttendanceOnHolidays: false,
  weeklyOff: ["sunday"],
};

const WEEKLY_OFF_DAY_OPTIONS = [
  { key: "sunday", label: "Sunday" },
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
];

const normalizeRole = (role) => String(role || "").replace(/\s+/g, "").toLowerCase();
const toTimeInputValue = (value, fallback) => {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (raw.length >= 5) return raw.slice(0, 5);
  return fallback;
};
const toTimePayloadValue = (value) => {
  const raw = String(value || "").trim();
  if (raw.length === 5) return `${raw}:00`;
  return raw;
};
const toPositiveInteger = (value, fallback = 0) => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
};
const toPositiveDecimal = (value, fallback = 0) => {
  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
};
const normalizeWeeklyOff = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return [...new Set(value.map((day) => String(day || "").trim().toLowerCase()))];
  }
  if (typeof value === "object") {
    return WEEKLY_OFF_DAY_OPTIONS
      .map((day) => day.key)
      .filter((key) => Boolean(value[key]));
  }
  return [];
};

export default function ShiftTypeForm({
  editData,
  userRole,
  selectedCompanyId,
  selectedCompanyName,
  onSave,
  onCancel,
}) {
  const { user } = useAuth();
  const isSuperAdmin = normalizeRole(userRole) === "superadmin";
  const currentUserId = user?.userId ?? user?.id ?? null;

  const [form, setForm] = useState(DEFAULT_FORM);
  const [companyId, setCompanyId] = useState(
    editData?.companyId || (!isSuperAdmin ? selectedCompanyId : "")
  );
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    const id = setTimeout(() => {
      const base = {
        ...DEFAULT_FORM,
        ...editData,
      };
      const normalizedWeeklyOff = normalizeWeeklyOff(base.weeklyOff);
      setForm({
        ...base,
        startTime: toTimeInputValue(base.startTime, DEFAULT_FORM.startTime),
        endTime: toTimeInputValue(base.endTime, DEFAULT_FORM.endTime),
        weeklyOff: normalizedWeeklyOff.length > 0
          ? normalizedWeeklyOff
          : [...DEFAULT_FORM.weeklyOff],
      });
      setCompanyId(editData?.companyId || (!isSuperAdmin ? selectedCompanyId : ""));
    }, 0);

    return () => clearTimeout(id);
  }, [editData, isSuperAdmin, selectedCompanyId]);

  useEffect(() => {
    const fetchLookups = async () => {
      const [companyResult] = await Promise.allSettled([API.get("/companies")]);

      if (companyResult.status === "fulfilled") {
        const companyRes = companyResult.value;
        const companyData = Array.isArray(companyRes.data)
          ? companyRes.data
          : Array.isArray(companyRes.data?.data)
            ? companyRes.data.data
            : [];
        setCompanies(companyData);

        if (isSuperAdmin && selectedCompanyId && !editData) {
          setCompanyId(selectedCompanyId);
        }
      } else {
        console.error("Error fetching companies:", companyResult.reason);
        toast.error("Failed to load companies");
      }

    };

    fetchLookups();
  }, [editData, isSuperAdmin, selectedCompanyId]);

  const adminCompanyName = useMemo(() => {
    if (selectedCompanyName) return selectedCompanyName;
    if (!selectedCompanyId) return "No company selected";

    const match = companies.find((c) => String(c.companyId) === String(selectedCompanyId));
    return match?.companyName || `Company #${selectedCompanyId}`;
  }, [companies, selectedCompanyId, selectedCompanyName]);

  const effectiveCompanyId = companyId || selectedCompanyId || "";

  const setField = (key) => (e) => {
    const value = e?.target?.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const toggleWeeklyOff = (day) => (e) => {
    const checked = Boolean(e?.target?.checked);
    setForm((prev) => {
      const current = Array.isArray(prev.weeklyOff) ? prev.weeklyOff : [];
      if (checked) {
        return { ...prev, weeklyOff: [...new Set([...current, day])] };
      }
      return { ...prev, weeklyOff: current.filter((item) => item !== day) };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.name?.trim()) return toast.error("Shift Type Name is required");
    if (!form.startTime) return toast.error("Start time is required");
    if (!form.endTime) return toast.error("End time is required");
    if (isSuperAdmin && !effectiveCompanyId) return toast.error("Please select a company");

    const halfDayHours = toPositiveDecimal(form.halfDayHours, 0);
    const absentHours = toPositiveDecimal(form.absentHours, 0);
    const minimumHours = toPositiveDecimal(form.minimumHours, 0);
    if (halfDayHours >= absentHours) {
      return toast.error("Half day hours must be less than absent hours threshold");
    }
    if (minimumHours < halfDayHours) {
      return toast.error("Minimum hours must be greater than or equal to half day hours");
    }
    if (form.autoMarkAbsentIfNoCheckIn && !form.requireCheckIn) { 
      return toast.error("Cannot auto-mark absent if check-in is not required");
    }
    if (!Array.isArray(form.weeklyOff) || form.weeklyOff.length === 0) {
      return toast.error("Select at least one weekly off day");
    }

    const payload = {
      name: form.name.trim(),
      startTime: toTimePayloadValue(form.startTime),
      endTime: toTimePayloadValue(form.endTime),
      beginCheckInBefore: toPositiveInteger(form.beginCheckInBefore, 0),
      allowCheckOutAfter: toPositiveInteger(form.allowCheckOutAfter, 0),
      enableAutoAttendance: Boolean(form.enableAutoAttendance),
      requireCheckIn: Boolean(form.requireCheckIn),
      requireCheckOut: Boolean(form.requireCheckOut),
      allowMultipleCheckIns: Boolean(form.allowMultipleCheckIns),
      autoMarkAbsentIfNoCheckIn: Boolean(form.autoMarkAbsentIfNoCheckIn),
      workingHoursCalculation: form.workingHoursCalculation || "first_to_last",
      minimumHours,
      halfDayHours,
      absentHours,
      enableLateEntry: Boolean(form.enableLateEntry),
      lateGracePeriod: toPositiveInteger(form.lateGracePeriod, 0),
      enableEarlyExit: Boolean(form.enableEarlyExit),
      earlyExitPeriod: toPositiveInteger(form.earlyExitPeriod, 0),
      markAutoAttendanceOnHolidays: Boolean(form.markAutoAttendanceOnHolidays),
      weeklyOff: normalizeWeeklyOff(form.weeklyOff),
      companyId: effectiveCompanyId,
      createdBy: editData?.createdBy || currentUserId,
      updatedBy: currentUserId,
    };

    onSave(payload, editData?.shiftTypeId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Shift Type Name"
        value={form.name}
        onChange={setField("name")}
        placeholder='Enter shift name (e.g. "General Shift")'
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Start Time" type="time" value={form.startTime} onChange={setField("startTime")} required />
        <Input label="End Time" type="time" value={form.endTime} onChange={setField("endTime")} required />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Begin Check-In Before (minutes)"
          type="number"
          min={0}
          value={form.beginCheckInBefore}
          onChange={setField("beginCheckInBefore")}
        />
        <Input
          label="Allow Check-Out After (minutes)"
          type="number"
          min={0}
          value={form.allowCheckOutAfter}
          onChange={setField("allowCheckOutAfter")}
        />
      </div>

      <Select
        label="Working Hours Calculation"
        value={form.workingHoursCalculation}
        onChange={setField("workingHoursCalculation")}
        options={[
          { value: "first_to_last", label: "First Punch To Last Punch" },
          { value: "fixed_hours", label: "Fixed Hours" },
          { value: "with_breaks", label: "With Breaks" },
        ]}
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Minimum Hours (Present)"
          type="number"
          min={0}
          step="0.25"
          value={form.minimumHours}
          onChange={setField("minimumHours")}
        />
        <Input
          label="Half Day Hours"
          type="number"
          min={0}
          step="0.25"
          value={form.halfDayHours}
          onChange={setField("halfDayHours")}
        />
        <Input
          label="Absent Hours"
          type="number"
          min={0}
          step="0.25"
          value={form.absentHours}
          onChange={setField("absentHours")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Late Grace Period (minutes)"
          type="number"
          min={0}
          value={form.lateGracePeriod}
          onChange={setField("lateGracePeriod")}
          disabled={!form.enableLateEntry}
        />
        <Input
          label="Early Exit Period (minutes)"
          type="number"
          min={0}
          value={form.earlyExitPeriod}
          onChange={setField("earlyExitPeriod")}
          disabled={!form.enableEarlyExit}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <p className="text-sm font-medium text-gray-700 mb-2">Weekly Off</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {WEEKLY_OFF_DAY_OPTIONS.map((day) => (
              <label key={day.key} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Array.isArray(form.weeklyOff) && form.weeklyOff.includes(day.key)}
                  onChange={toggleWeeklyOff(day.key)}
                />
                {day.label}
              </label>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.enableAutoAttendance} onChange={setField("enableAutoAttendance")} />
          Enable Auto Attendance
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.requireCheckIn} onChange={setField("requireCheckIn")} />
          Require Check-In
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.requireCheckOut} onChange={setField("requireCheckOut")} />
          Require Check-Out
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.allowMultipleCheckIns} onChange={setField("allowMultipleCheckIns")} />
          Allow Multiple Check-Ins
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.autoMarkAbsentIfNoCheckIn}
            onChange={setField("autoMarkAbsentIfNoCheckIn")}
          />
          Auto Mark Absent If No Check-In
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.enableLateEntry} onChange={setField("enableLateEntry")} />
          Enable Late Entry
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.enableEarlyExit} onChange={setField("enableEarlyExit")} />
          Enable Early Exit
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.markAutoAttendanceOnHolidays}
            onChange={setField("markAutoAttendanceOnHolidays")}
          />
          Mark Auto Attendance On Holidays
        </label>
      </div>
      <div>
        <label className="block font-medium text-gray-700 mb-2">Company</label>
        {isSuperAdmin ? (
          <Select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            options={companies.map((c) => ({ value: c.companyId, label: c.companyName }))}
            placeholder="Select Company"
          />
        ) : (
          <Input value={adminCompanyName} disabled />
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{editData ? "Update Changes" : "Save"}</Button>
      </div>
    </form>
  );
}
