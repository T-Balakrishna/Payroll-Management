import { useEffect, useState } from "react";
import { Loader2, Save, User, RefreshCw, ChevronDown } from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import API from "../api";
import { useAuth } from "../auth/AuthContext";

const STATIC_OPTIONS = {
  gender: ["Male", "Female", "Other"],
  bloodGroup: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
  maritalStatus: ["Single", "Married", "Divorced", "Widowed"],
  employmentStatus: ["Active", "Resigned", "Terminated", "On Leave", "Retired", "Notice Period"],
  paymentMode: ["Bank Transfer", "Cash", "Cheque"],
};

const DATE_FIELDS = new Set(["dateOfBirth","weddingDate","dateOfJoining","confirmationDate","resignationLetterDate","relievingDate","dateOfRetirement","exitInterviewHeldOn"]);
const BOOL_FIELDS = new Set(["isOvertimeApplicable", "isTransportRequired"]);

const initialForm = {
  staffId: "", biometricNumber: "", companyId: "", staffNumber: "", salutation: "",
  firstName: "", middleName: "", lastName: "", gender: "", dateOfBirth: "", bloodGroup: "",
  maritalStatus: "", weddingDate: "", profilePhoto: "", personalEmail: "", officialEmail: "",
  mobileNumber: "", alternateMobile: "", emergencyContactName: "", emergencyContactNumber: "",
  emergencyContactRelationship: "", currentAddressLine1: "", currentAddressLine2: "",
  currentCity: "", currentState: "", currentPincode: "", currentCountry: "India",
  permanentAddressLine1: "", permanentAddressLine2: "", permanentCity: "", permanentState: "",
  permanentPincode: "", permanentCountry: "India", departmentId: "", designationId: "",
  employeeGradeId: "", dateOfJoining: "", confirmationDate: "", probationPeriod: "",
  reportingManagerId: "", workLocation: "", employmentStatus: "Active", shiftTypeId: "",
  leavePolicyId: "", isOvertimeApplicable: false, remainingPermissionHours: "", basicSalary: "",
  costToCompany: "", salaryCurrency: "INR", paymentMode: "Bank Transfer", bankName: "",
  bankAccountNumber: "", ifscCode: "", panNumber: "", uanNumber: "", esiNumber: "",
  isTransportRequired: false, busId: "", pickupPoint: "", aadhaarNumber: "", passportNumber: "",
  drivingLicenseNumber: "", voterIdNumber: "", annaUniversityFacultyId: "", aicteFacultyId: "",
  orcid: "", researcherId: "", googleScholarId: "", scopusProfile: "", vidwanProfile: "",
  supervisorId: "", hIndex: "", citationIndex: "", resignationLetterDate: "",
  reasonForResignation: "", relievingDate: "", dateOfRetirement: "", exitInterviewHeldOn: "",
};

// Each section gets a color theme for its accent ring / header tint
const SECTION_META = {
  "Identification & Core":   { emoji: "🪪", ring: "border-cyan-500/30",    header: "bg-cyan-500/5",    badge: "bg-cyan-500/10 text-cyan-400" },
  "Basic Information":       { emoji: "👤", ring: "border-violet-500/30",  header: "bg-violet-500/5",  badge: "bg-violet-500/10 text-violet-400" },
  "Contact Information":     { emoji: "📬", ring: "border-sky-500/30",     header: "bg-sky-500/5",     badge: "bg-sky-500/10 text-sky-400" },
  "Current Address":         { emoji: "🏠", ring: "border-amber-500/30",   header: "bg-amber-500/5",   badge: "bg-amber-500/10 text-amber-400" },
  "Permanent Address":       { emoji: "📍", ring: "border-emerald-500/30", header: "bg-emerald-500/5", badge: "bg-emerald-500/10 text-emerald-400" },
  "Employment Information":  { emoji: "💼", ring: "border-indigo-500/30",  header: "bg-indigo-500/5",  badge: "bg-indigo-500/10 text-indigo-400" },
  "Shift & Attendance":      { emoji: "🕐", ring: "border-pink-500/30",    header: "bg-pink-500/5",    badge: "bg-pink-500/10 text-pink-400" },
  "Salary & Bank":           { emoji: "💰", ring: "border-green-500/30",   header: "bg-green-500/5",   badge: "bg-green-500/10 text-green-400" },
  "Transport":               { emoji: "🚌", ring: "border-orange-500/30",  header: "bg-orange-500/5",  badge: "bg-orange-500/10 text-orange-400" },
  "Documents":               { emoji: "📄", ring: "border-purple-500/30",  header: "bg-purple-500/5",  badge: "bg-purple-500/10 text-purple-400" },
  "Academic & Research":     { emoji: "🎓", ring: "border-teal-500/30",    header: "bg-teal-500/5",    badge: "bg-teal-500/10 text-teal-400" },
  "Exit":                    { emoji: "🚪", ring: "border-rose-500/30",    header: "bg-rose-500/5",    badge: "bg-rose-500/10 text-rose-400" },
};

const FIELD_SECTIONS = [
  { title: "Identification & Core", fields: [{ name: "staffId", label: "staffId", type: "number", readOnly: true },{ name: "biometricNumber", label: "biometricNumber", readOnly: true },{ name: "companyId", label: "companyId", type: "select", options: "companies", readOnly: true },{ name: "staffNumber", label: "staffNumber", readOnly: true },{ name: "salutation", label: "salutation" }] },
  { title: "Basic Information", fields: [{ name: "firstName", label: "firstName", required: true },{ name: "middleName", label: "middleName" },{ name: "lastName", label: "lastName" },{ name: "gender", label: "gender", type: "select", options: "gender" },{ name: "dateOfBirth", label: "dateOfBirth", type: "date" },{ name: "bloodGroup", label: "bloodGroup", type: "select", options: "bloodGroup" },{ name: "maritalStatus", label: "maritalStatus", type: "select", options: "maritalStatus" },{ name: "weddingDate", label: "weddingDate", type: "date" },{ name: "profilePhoto", label: "profilePhoto" }] },
  { title: "Contact Information", fields: [{ name: "personalEmail", label: "personalEmail", type: "email", required: true },{ name: "officialEmail", label: "officialEmail", type: "email" },{ name: "mobileNumber", label: "mobileNumber" },{ name: "alternateMobile", label: "alternateMobile" },{ name: "emergencyContactName", label: "emergencyContactName" },{ name: "emergencyContactNumber", label: "emergencyContactNumber" },{ name: "emergencyContactRelationship", label: "emergencyContactRelationship" }] },
  { title: "Current Address", fields: [{ name: "currentAddressLine1", label: "currentAddressLine1" },{ name: "currentAddressLine2", label: "currentAddressLine2" },{ name: "currentCity", label: "currentCity" },{ name: "currentState", label: "currentState" },{ name: "currentPincode", label: "currentPincode" },{ name: "currentCountry", label: "currentCountry" }] },
  { title: "Permanent Address", fields: [{ name: "permanentAddressLine1", label: "permanentAddressLine1" },{ name: "permanentAddressLine2", label: "permanentAddressLine2" },{ name: "permanentCity", label: "permanentCity" },{ name: "permanentState", label: "permanentState" },{ name: "permanentPincode", label: "permanentPincode" },{ name: "permanentCountry", label: "permanentCountry" }] },
  { title: "Employment Information", fields: [{ name: "departmentId", label: "departmentId", type: "select", options: "departments", required: true, readOnly: true },{ name: "designationId", label: "designationId", type: "select", options: "designations", readOnly: true },{ name: "employeeGradeId", label: "employeeGradeId", type: "select", options: "grades" },{ name: "dateOfJoining", label: "dateOfJoining", type: "date", required: true, readOnly: true },{ name: "confirmationDate", label: "confirmationDate", type: "date" },{ name: "probationPeriod", label: "probationPeriod", type: "number" },{ name: "reportingManagerId", label: "reportingManagerId", type: "select", options: "employees" },{ name: "workLocation", label: "workLocation" },{ name: "employmentStatus", label: "employmentStatus", type: "select", options: "employmentStatus", readOnly: true }] },
  { title: "Shift & Attendance", fields: [{ name: "shiftTypeId", label: "shiftTypeId", type: "select", options: "shiftTypes", readOnly: true },{ name: "leavePolicyId", label: "leavePolicyId", type: "select", options: "leavePolicies", readOnly: true },{ name: "isOvertimeApplicable", label: "isOvertimeApplicable", type: "checkbox" },{ name: "remainingPermissionHours", label: "remainingPermissionHours", type: "number", readOnly: true }] },
  { title: "Salary & Bank", fields: [{ name: "basicSalary", label: "basicSalary", type: "number" },{ name: "costToCompany", label: "costToCompany", type: "number" },{ name: "salaryCurrency", label: "salaryCurrency" },{ name: "paymentMode", label: "paymentMode", type: "select", options: "paymentMode" },{ name: "bankName", label: "bankName" },{ name: "bankAccountNumber", label: "bankAccountNumber" },{ name: "ifscCode", label: "ifscCode" },{ name: "panNumber", label: "panNumber" },{ name: "uanNumber", label: "uanNumber" },{ name: "esiNumber", label: "esiNumber" }] },
  { title: "Transport", fields: [{ name: "isTransportRequired", label: "isTransportRequired", type: "checkbox" },{ name: "busId", label: "busId", type: "select", options: "buses" },{ name: "pickupPoint", label: "pickupPoint" }] },
  { title: "Documents", fields: [{ name: "aadhaarNumber", label: "aadhaarNumber" },{ name: "passportNumber", label: "passportNumber" },{ name: "drivingLicenseNumber", label: "drivingLicenseNumber" },{ name: "voterIdNumber", label: "voterIdNumber" }] },
  { title: "Academic & Research", fields: [{ name: "annaUniversityFacultyId", label: "annaUniversityFacultyId" },{ name: "aicteFacultyId", label: "aicteFacultyId" },{ name: "orcid", label: "orcid" },{ name: "researcherId", label: "researcherId" },{ name: "googleScholarId", label: "googleScholarId" },{ name: "scopusProfile", label: "scopusProfile" },{ name: "vidwanProfile", label: "vidwanProfile" },{ name: "supervisorId", label: "supervisorId", type: "select", options: "employees" },{ name: "hIndex", label: "hIndex", type: "number" },{ name: "citationIndex", label: "citationIndex", type: "number" }] },
  { title: "Exit", fields: [{ name: "resignationLetterDate", label: "resignationLetterDate", type: "date" },{ name: "reasonForResignation", label: "reasonForResignation", type: "textarea" },{ name: "relievingDate", label: "relievingDate", type: "date" },{ name: "dateOfRetirement", label: "dateOfRetirement", type: "date" },{ name: "exitInterviewHeldOn", label: "exitInterviewHeldOn", type: "date" }] },
];

const toDateInput = (value) => { if (!value) return ""; const d = new Date(value); if (Number.isNaN(d.getTime())) return ""; return d.toISOString().split("T")[0]; };
const toDateTimeInput = (value) => { if (!value) return ""; const d = new Date(value); if (Number.isNaN(d.getTime())) return ""; const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString(); return iso.slice(0, 16); };
const toNullable = (value) => (value === "" || value === null || value === undefined ? null : value);
const toNullableNumber = (value) => { if (value === "" || value === null || value === undefined) return null; const n = Number(value); return Number.isNaN(n) ? null : n; };

const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-slate-200 text-sm placeholder-slate-600 outline-none focus:border-cyan-500/50 focus:bg-cyan-500/[0.04] focus:ring-1 focus:ring-cyan-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed";
const labelCls = "block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5";

export default function EmployeeProfilePage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openSections, setOpenSections] = useState(
    new Set(["Identification & Core", "Basic Information", "Contact Information"])
  );

  const [userDetail, setUserDetail] = useState(null);
  const [employeeRow, setEmployeeRow] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [photoPreview, setPhotoPreview] = useState("");
  const [options, setOptions] = useState({
    companies: [], departments: [], designations: [], grades: [],
    shiftTypes: [], employees: [], leavePolicies: [], buses: [],
  });

  const staffId = employeeRow?.staffId || userDetail?.staffId || "";
  const userNumber = userDetail?.userNumber || user?.userNumber || "";

  const toggleSection = (title) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  };

  const hydrateForm = (row, fallbackCompanyId, fallbackStaffNumber) => {
    const next = { ...initialForm };
    for (const key of Object.keys(initialForm)) {
      const raw = row?.[key];
      if (["createdAt", "updatedAt", "deletedAt"].includes(key)) next[key] = toDateTimeInput(raw);
      else if (DATE_FIELDS.has(key)) next[key] = toDateInput(raw);
      else if (BOOL_FIELDS.has(key)) next[key] = Boolean(raw);
      else if (raw === null || raw === undefined) next[key] = initialForm[key];
      else next[key] = String(raw);
    }
    if (!next.companyId && fallbackCompanyId) next.companyId = String(fallbackCompanyId);
    if (!next.staffNumber && fallbackStaffNumber) next.staffNumber = String(fallbackStaffNumber);
    setPhotoPreview(next.profilePhoto || "");
    setForm(next);
  };

  const loadData = async () => {
    if (!user?.id) { setError("User context missing. Please login again."); setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      const { data: userRes } = await API.get(`/users/${user.id}`);
      setUserDetail(userRes);
      const companyId = userRes?.companyId || null;
      const [companiesRes, departmentsRes, designationsRes, gradesRes, shiftTypesRes, employeesRes, leavePoliciesRes, busesRes] = await Promise.all([
        API.get("/companies"), API.get("/departments", { params: companyId ? { companyId } : {} }),
        API.get("/designations", { params: companyId ? { companyId } : {} }),
        API.get("/employeeGrades", { params: companyId ? { companyId } : {} }),
        API.get("/shiftTypes"), API.get("/employees", { params: companyId ? { companyId } : {} }),
        API.get("/leavePolicies", { params: companyId ? { companyId } : {} }),
        API.get("/buses", { params: companyId ? { companyId } : {} }),
      ]);
      const employees = employeesRes.data || [];
      const matched = employees.find((e) => String(e?.staffNumber || "") === String(userRes?.userNumber || ""));
      setOptions({
        companies: companiesRes.data || [], departments: departmentsRes.data || [],
        designations: designationsRes.data || [], grades: gradesRes.data || [],
        shiftTypes: (shiftTypesRes.data || []).filter((x) => !companyId || !x?.companyId || Number(x.companyId) === Number(companyId)),
        employees, leavePolicies: leavePoliciesRes.data || [], buses: busesRes.data || [],
      });
      setEmployeeRow(matched || null);
      hydrateForm(matched || null, companyId, userRes?.userNumber || "");
    } catch (e) {
      console.error("Profile load failed:", e);
      setError(e?.response?.data?.error || "Failed to load employee profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user?.id]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const onPhotoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setPhotoPreview(dataUrl);
      setForm((prev) => ({ ...prev, profilePhoto: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const buildPayload = () => ({
    biometricNumber: toNullable(form.biometricNumber), companyId: toNullableNumber(form.companyId),
    staffNumber: toNullable(form.staffNumber), salutation: toNullable(form.salutation),
    firstName: String(form.firstName || "").trim(), middleName: toNullable(form.middleName),
    lastName: toNullable(form.lastName), gender: toNullable(form.gender),
    dateOfBirth: toNullable(form.dateOfBirth), bloodGroup: toNullable(form.bloodGroup),
    maritalStatus: toNullable(form.maritalStatus), weddingDate: toNullable(form.weddingDate),
    profilePhoto: toNullable(form.profilePhoto), personalEmail: String(form.personalEmail || "").trim(),
    officialEmail: toNullable(form.officialEmail), mobileNumber: toNullable(form.mobileNumber),
    alternateMobile: toNullable(form.alternateMobile), emergencyContactName: toNullable(form.emergencyContactName),
    emergencyContactNumber: toNullable(form.emergencyContactNumber), emergencyContactRelationship: toNullable(form.emergencyContactRelationship),
    currentAddressLine1: toNullable(form.currentAddressLine1), currentAddressLine2: toNullable(form.currentAddressLine2),
    currentCity: toNullable(form.currentCity), currentState: toNullable(form.currentState),
    currentPincode: toNullable(form.currentPincode), currentCountry: toNullable(form.currentCountry),
    permanentAddressLine1: toNullable(form.permanentAddressLine1), permanentAddressLine2: toNullable(form.permanentAddressLine2),
    permanentCity: toNullable(form.permanentCity), permanentState: toNullable(form.permanentState),
    permanentPincode: toNullable(form.permanentPincode), permanentCountry: toNullable(form.permanentCountry),
    departmentId: toNullableNumber(form.departmentId), designationId: toNullableNumber(form.designationId),
    employeeGradeId: toNullableNumber(form.employeeGradeId), dateOfJoining: toNullable(form.dateOfJoining),
    confirmationDate: toNullable(form.confirmationDate), probationPeriod: toNullableNumber(form.probationPeriod),
    reportingManagerId: toNullableNumber(form.reportingManagerId), workLocation: toNullable(form.workLocation),
    employmentStatus: toNullable(form.employmentStatus), shiftTypeId: toNullableNumber(form.shiftTypeId),
    leavePolicyId: toNullableNumber(form.leavePolicyId), isOvertimeApplicable: Boolean(form.isOvertimeApplicable),
    remainingPermissionHours: toNullableNumber(form.remainingPermissionHours), basicSalary: toNullableNumber(form.basicSalary),
    costToCompany: toNullableNumber(form.costToCompany), salaryCurrency: toNullable(form.salaryCurrency),
    paymentMode: toNullable(form.paymentMode), bankName: toNullable(form.bankName),
    bankAccountNumber: toNullable(form.bankAccountNumber), ifscCode: toNullable(form.ifscCode),
    panNumber: toNullable(form.panNumber), uanNumber: toNullable(form.uanNumber), esiNumber: toNullable(form.esiNumber),
    isTransportRequired: Boolean(form.isTransportRequired), busId: toNullableNumber(form.busId),
    pickupPoint: toNullable(form.pickupPoint), aadhaarNumber: toNullable(form.aadhaarNumber),
    passportNumber: toNullable(form.passportNumber), drivingLicenseNumber: toNullable(form.drivingLicenseNumber),
    voterIdNumber: toNullable(form.voterIdNumber), annaUniversityFacultyId: toNullable(form.annaUniversityFacultyId),
    aicteFacultyId: toNullable(form.aicteFacultyId), orcid: toNullable(form.orcid),
    researcherId: toNullable(form.researcherId), googleScholarId: toNullable(form.googleScholarId),
    scopusProfile: toNullable(form.scopusProfile), vidwanProfile: toNullable(form.vidwanProfile),
    supervisorId: toNullableNumber(form.supervisorId), hIndex: toNullableNumber(form.hIndex),
    citationIndex: toNullableNumber(form.citationIndex), resignationLetterDate: toNullable(form.resignationLetterDate),
    reasonForResignation: toNullable(form.reasonForResignation), relievingDate: toNullable(form.relievingDate),
    dateOfRetirement: toNullable(form.dateOfRetirement), exitInterviewHeldOn: toNullable(form.exitInterviewHeldOn),
    updatedBy: user?.id || null,
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim()) return toast.error("firstName is required");
    if (!form.personalEmail.trim()) return toast.error("personalEmail is required");
    if (!form.companyId) return toast.error("companyId is required");
    if (!form.departmentId) return toast.error("departmentId is required");
    if (!form.dateOfJoining) return toast.error("dateOfJoining is required");
    if (!form.staffNumber.trim()) return toast.error("staffNumber is required");

    const confirm = await Swal.fire({
      title: "Save Profile?",
      text: "Your profile information will be updated.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, save it",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#f1f5f9",
      confirmButtonColor: "#06b6d4",
      cancelButtonColor: "#1e293b",
    });
    if (!confirm.isConfirmed) return;

    const payload = buildPayload();
    setSaving(true);
    setError("");
    try {
      if (staffId) {
        const { data } = await API.put(`/employees/${staffId}`, payload);
        setEmployeeRow(data);
        hydrateForm(data, payload.companyId, payload.staffNumber);
      } else {
        const createPayload = { ...payload, createdBy: user?.id || null, updatedBy: user?.id || null };
        const { data } = await API.post("/employees", createPayload);
        setEmployeeRow(data);
        hydrateForm(data, createPayload.companyId, createPayload.staffNumber);
      }
      await Swal.fire({
        title: "Profile Saved! ✅",
        text: "Your profile has been updated successfully.",
        icon: "success",
        background: "#0f172a",
        color: "#f1f5f9",
        confirmButtonColor: "#06b6d4",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
      toast.success("Profile saved successfully");
    } catch (e) {
      console.error("Profile save failed:", e);
      const msg = e?.response?.data?.error || e?.response?.data?.message || "Failed to save";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const renderSelectOptions = (fieldName, optionKey) => {
    if (STATIC_OPTIONS[optionKey]) return STATIC_OPTIONS[optionKey].map((opt) => <option key={`${fieldName}-${opt}`} value={opt}>{opt}</option>);
    if (optionKey === "companies") return options.companies.map((o) => <option key={o.companyId} value={o.companyId}>{o.companyName || o.companyId}</option>);
    if (optionKey === "departments") return options.departments.map((o) => <option key={o.departmentId} value={o.departmentId}>{o.departmentName || o.departmentId}</option>);
    if (optionKey === "designations") return options.designations.map((o) => <option key={o.designationId} value={o.designationId}>{o.designationName || o.designationId}</option>);
    if (optionKey === "grades") return options.grades.map((o) => <option key={o.employeeGradeId} value={o.employeeGradeId}>{o.employeeGradeName || o.employeeGradeId}</option>);
    if (optionKey === "shiftTypes") return options.shiftTypes.map((o) => <option key={o.shiftTypeId} value={o.shiftTypeId}>{o.shiftName || o.shiftTypeId}</option>);
    if (optionKey === "leavePolicies") return options.leavePolicies.map((o) => <option key={o.leavePolicyId} value={o.leavePolicyId}>{o.name || o.leavePolicyName || o.leavePolicyId}</option>);
    if (optionKey === "buses") return options.buses.map((o) => <option key={o.busId} value={o.busId}>{o.busName || o.routeName || o.busId}</option>);
    if (optionKey === "employees") return options.employees.map((o) => <option key={o.staffId} value={o.staffId}>{`${o.firstName || ""} ${o.lastName || ""}`.trim() || o.staffNumber || o.staffId}</option>);
    return null;
  };

  const renderField = (field) => {
    const value = form[field.name];
    const required = Boolean(field.required);
    const readOnly = Boolean(field.readOnly);
    const commonProps = { name: field.name, id: field.name, onChange, required, readOnly, disabled: readOnly };

    if (field.name === "profilePhoto") {
      return (
        <div key={field.name} className="space-y-2">
          <label htmlFor={field.name} className={labelCls}>{field.label}</label>
          <input
            id={field.name}
            name={field.name}
            type="file"
            accept="image/*"
            onChange={onPhotoFileChange}
            className={inputCls}
          />
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="Profile preview"
              className="h-20 w-20 rounded-xl border border-white/10 object-cover"
            />
          ) : null}
        </div>
      );
    }

    if (field.type === "checkbox") {
      return (
        <label key={field.name} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:border-cyan-500/25 hover:bg-cyan-500/[0.04] cursor-pointer transition-all">
          <input
            {...commonProps}
            type="checkbox"
            checked={Boolean(value)}
            onChange={onChange}
            className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
          />
          <span className="text-sm text-slate-400 font-medium">{field.label}</span>
        </label>
      );
    }

    if (field.type === "textarea") {
      return (
        <div key={field.name}>
          <label htmlFor={field.name} className={labelCls}>{field.label}</label>
          <textarea {...commonProps} value={value || ""} rows={3} className={`${inputCls} resize-y min-h-[80px]`} />
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <div key={field.name}>
          <label htmlFor={field.name} className={labelCls}>{field.label}</label>
          <select {...commonProps} value={value || ""} className={inputCls}>
            <option value="">Select</option>
            {renderSelectOptions(field.name, field.options)}
          </select>
        </div>
      );
    }

    return (
      <div key={field.name}>
        <label htmlFor={field.name} className={labelCls}>{field.label}</label>
        <input
          {...commonProps}
          type={field.type || "text"}
          value={field.type === "number" ? value ?? "" : value || ""}
          className={inputCls}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        <span className="text-sm">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <User className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Employee Profile</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff ID:{" "}
                <span className="text-cyan-400 font-semibold">{staffId || "N/A"}</span>
                {" "}&nbsp;|&nbsp; User Number:{" "}
                <span className="text-violet-400 font-semibold">{userNumber || "N/A"}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-cyan-500/10 hover:border-cyan-500/30 text-slate-400 hover:text-cyan-400 text-sm font-semibold transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Sections */}
        <form onSubmit={onSubmit} className="space-y-3">
          {FIELD_SECTIONS.map((section) => {
            const meta = SECTION_META[section.title] || { emoji: "📋", ring: "border-slate-500/30", header: "bg-slate-500/5", badge: "bg-slate-500/10 text-slate-400" };
            const isOpen = openSections.has(section.title);

            return (
              <div
                key={section.title}
                className={`rounded-2xl border bg-white/[0.02] overflow-hidden transition-all duration-200 ${isOpen ? meta.ring : "border-white/10"}`}
              >
                {/* Section Header */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors ${isOpen ? meta.header : "hover:bg-white/[0.03]"}`}
                >
                  <span className="text-lg leading-none">{meta.emoji}</span>
                  <span className="text-sm font-bold text-slate-200 flex-1">{section.title}</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${meta.badge}`}>
                    {section.fields.length} fields
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Section Body */}
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 border-t border-white/[0.06]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                      {section.fields.map((field) => renderField(field))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Save Bar */}
          <div className="flex justify-end pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2.5 px-7 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-900 font-bold text-sm shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

