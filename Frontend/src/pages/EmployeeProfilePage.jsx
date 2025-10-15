import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useTranslation } from "react-i18next";

let token = sessionStorage.getItem("token");
let decoded = token ? jwtDecode(token) : "";
let userNumber = decoded?.userNumber;

// Add this constant for the backend base URL (adjust for production, e.g., via env vars)
const API_BASE_URL = "http://localhost:5000";

const EmployeeProfilePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [options, setOptions] = useState({
    designations: [],
    grades: [],
    types: [],
    departments: [],
    holidayPlans: [],
    religions: [],
    castes: [],
    buses: [],
    employees: [],
    shifts: [],
  });
  const [formData, setFormData] = useState({
    salutation: "",
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "",
    DOB: "",
    DOJ: "",
    doorNumber: "",
    streetName: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
    designationId: "",
    employeeGradeId: "",
    reportsTo: "",
    departmentId: "",
    employeeTypeId: "",
    employeeNumber: "",
    holidayPlanId: "",
    shiftId: "",
    maritalStatus: "",
    bloodGroup: "",
    religionId: "",
    casteId: "",
    aadharNumber: "",
    passportNumber: "",
    costToCompany: "",
    salaryCurrency: "",
    salaryMode: "",
    payrollCostCenter: "",
    panNumber: "",
    pfNumber: "",
    pfNominee: "",
    esiNumber: "",
    uanNumber: "",
    resignationLetterDate: "",
    relievingDate: "",
    exitInterviewHeldOn: "",
    employeeMail: "",
    personalMail: "",
    salaryId: "",
    acctNumber: "",
    password: "",
    confirmPassword: "",
    qualification: "",
    experience: "",
    referencePerson: "",
    busId: "",
    photo: null,
    photoPath: "",
    employeeId: null,
  });
  const [departments, setDepartments] = useState([]);
  const passwordMismatch = formData.password !== formData.confirmPassword && formData.confirmPassword !== "";
  const [photoPreview, setPhotoPreview] = useState("/placeholder-image.jpg");

  useEffect(() => {
    token = sessionStorage.getItem("token");
    decoded = token ? jwtDecode(token) : "";
    userNumber = decoded?.userNumber;
  }, []);

  useEffect(() => {
    if (formData.photo instanceof File) {
      const url = URL.createObjectURL(formData.photo);
      setPhotoPreview(url);
      return () => URL.revokeObjectURL(url);
    } else if (formData.photoPath) {
      let correctedPhotoPath = formData.photoPath;
      if (formData.photoPath.includes('/uploads/employees/')) {
        correctedPhotoPath = `/uploads/${formData.photoPath.split('/').pop()}`;
      } else if (!formData.photoPath.startsWith('/uploads/')) {
        correctedPhotoPath = `/uploads/${formData.photoPath}`;
      }
      const fullPhotoUrl = `${API_BASE_URL}${correctedPhotoPath}`;
      console.log('Corrected full photo URL:', fullPhotoUrl);
      setPhotoPreview(fullPhotoUrl);
    } else {
      setPhotoPreview("/placeholder-image.jpg");
    }
  }, [formData.photo, formData.photoPath]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/departments`);
        setDepartments(res.data);
      } catch (err) {
        console.error("Error fetching departments:", err);
        setErrorMessage(t("errorFetchingDepartments"));
      }
    };
    fetchDepartments();
  }, [t]);

  const getDepartmentName = (id) => {
    const dept = departments.find((d) => d.departmentId === id);
    return dept ? dept.departmentName : id;
  };

  useEffect(() => {
    const fetchUserMappedData = async () => {
      try {
        if (!userNumber) {
          setErrorMessage(t("userNumberNotFound"));
          return;
        }
        console.log('Fetching user data for userNumber:', userNumber);
        const res = await axios.get(`${API_BASE_URL}/api/employees/fromUser/${userNumber}`);
        setFormData((prev) => ({
          ...prev,
          employeeMail: res.data.employeeMail,
          employeeNumber: res.data.employeeNumber,
          password: res.data.password,
          departmentId: res.data.departmentId,
        }));
      } catch (err) {
        console.error("Error fetching user-mapped employee data:", err);
        setErrorMessage(t("errorFetchingUserData"));
      }
    };
    fetchUserMappedData();
  }, [t]);

  useEffect(() => {
    const fetchExistingEmployeeData = async () => {
      try {
        const employeeNumber = userNumber;
        if (!employeeNumber) {
          setErrorMessage(t("userNumberNotFound"));
          return;
        }
        console.log('Fetching employee data for employeeNumber:', employeeNumber);
        const res = await axios.get(
          `${API_BASE_URL}/api/employees/full/${employeeNumber}`
        );
        if (res.data) {
          console.log('Fetched employee data:', res.data);
          const filteredData = Object.fromEntries(
            Object.entries(res.data).filter(
              ([key, value]) =>
                value !== null &&
                value !== undefined &&
                !["employeeNumber", "employeeMail", "departmentId", "photo"].includes(key)
            )
          );
          setFormData((prev) => ({
            ...prev,
            ...filteredData,
            employeeId: res.data.employeeId,
            photoPath: res.data.photo || "",
            photo: null,
          }));
        }
      } catch (err) {
        console.error("Error fetching existing employee data:", err);
        setErrorMessage(t("errorFetchingEmployeeData", { error: err.response?.data?.error || err.message }));
      }
    };
    fetchExistingEmployeeData();
  }, [t]);

  useEffect(() => {
    const fetchOptions = async () => {
      const requests = [
        axios.get(`${API_BASE_URL}/api/designations`),
        axios.get(`${API_BASE_URL}/api/employeeGrades`),
        axios.get(`${API_BASE_URL}/api/employeeTypes`),
        axios.get(`${API_BASE_URL}/api/holidayPlans`),
        axios.get(`${API_BASE_URL}/api/religions`),
        axios.get(`${API_BASE_URL}/api/castes`),
        axios.get(`${API_BASE_URL}/api/buses`),
        axios.get(`${API_BASE_URL}/api/employees`),
        axios.get(`${API_BASE_URL}/api/shifts`),
      ];

      try {
        const results = await Promise.allSettled(requests);

        const newOptions = {
          designations: [],
          grades: [],
          types: [],
          departments: [],
          holidayPlans: [],
          religions: [],
          castes: [],
          buses: [],
          employees: [],
          shifts: [],
        };

        const mappings = [
          { key: 'designations', resIndex: 0 },
          { key: 'grades', resIndex: 1 },
          { key: 'types', resIndex: 2 },
          { key: 'holidayPlans', resIndex: 3 },
          { key: 'religions', resIndex: 4 },
          { key: 'castes', resIndex: 5 },
          { key: 'buses', resIndex: 6 },
          { key: 'employees', resIndex: 7 },
          { key: 'shifts', resIndex: 8 },
        ];

        let hasErrors = false;
        mappings.forEach(({ key, resIndex }) => {
          if (results[resIndex].status === 'fulfilled') {
            newOptions[key] = results[resIndex].value.data || [];
          } else {
            console.error(`Failed to load ${key}:`, results[resIndex].reason);
            hasErrors = true;
            newOptions[key] = [];
          }
        });

        setOptions(newOptions);

        if (hasErrors) {
          setErrorMessage(t("errorFetchingOptions"));
        }
      } catch (error) {
        console.error("Unexpected error in fetchOptions:", error);
        setErrorMessage(t("errorFetchingOptions"));
      }
    };

    fetchOptions();
  }, [t]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "photo") {
      setFormData((prev) => ({
        ...prev,
        photo: files[0] || null,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    setErrorMessage("");
  };

  const handleSave = async () => {
    const requiredFields = ["firstName", "lastName", "departmentId", "DOB", "employeeNumber"];

    if (activeTab !== "password") {
      for (let field of requiredFields) {
        if (!formData[field] || formData[field].toString().trim() === "") {
          setErrorMessage(t("requiredField", { field: t(field) }));
          return;
        }
      }
      if (activeTab === "basic" && !formData.photo && !formData.photoPath) {
        setErrorMessage(t("profilePhotoRequired"));
        return;
      }
    }

    if (activeTab === "password") {
      if (!formData.password || !formData.confirmPassword) {
        setErrorMessage(t("bothPasswordsRequired"));
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setErrorMessage(t("passwordsDoNotMatch"));
        return;
      }
    }

    try {
      const employeeNumber = userNumber;
      if (!employeeNumber) {
        setErrorMessage(t("userNumberNotFound"));
        return;
      }
      console.log('Saving with employeeNumber:', employeeNumber);

      let employee;
      try {
        const response = await axios.get(`${API_BASE_URL}/api/employees/full/${employeeNumber}`);
        employee = response.data;
      } catch (err) {
        if (err.response?.status === 404) {
          console.log('Employee not found, creating new employee');
          const createResponse = await axios.post(`${API_BASE_URL}/api/employees`, {
            employeeNumber,
            firstName: formData.firstName || "Default",
            lastName: formData.lastName || "User",
            departmentId: formData.departmentId || 1,
            employeeMail: formData.employeeMail || `${employeeNumber}@example.com`,
          });
          employee = createResponse.data;
          setFormData((prev) => ({
            ...prev,
            employeeId: employee.employeeId,
          }));
        } else {
          throw err;
        }
      }

      if (formData.photo instanceof File && activeTab === "basic") {
        if (!formData.employeeId && !employee.employeeId) {
          setErrorMessage(t("employeeIdMissing"));
          return;
        }
        const photoFormData = new FormData();
        photoFormData.append("photo", formData.photo);
        try {
          const photoResponse = await axios.post(
            `${API_BASE_URL}/api/employees/${formData.employeeId || employee.employeeId}/photo`,
            photoFormData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );
          console.log('Photo upload response (new photoPath):', photoResponse.data.employee.photo);
          setFormData((prev) => ({
            ...prev,
            photoPath: photoResponse.data.employee.photo,
            photo: null,
          }));
        } catch (photoError) {
          console.error("Error uploading photo:", photoError);
          setErrorMessage(t("errorUploadingPhoto"));
          return;
        }
      }

      const filteredData = Object.fromEntries(
        Object.entries(formData).filter(
          ([key, value]) => key !== "photo" && key !== "photoPath" && key !== "confirmPassword" && value !== "" && value !== null
        )
      );

      console.log('Sending PUT with data:', filteredData);
      await axios.put(`${API_BASE_URL}/api/employees/${employeeNumber}`, filteredData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      alert(t("employeeSavedSuccessfully"));
      setErrorMessage("");

      setFormData((prev) => ({
        ...prev,
        confirmPassword: activeTab === "password" ? "" : prev.confirmPassword,
        photo: activeTab === "basic" ? null : prev.photo,
      }));
    } catch (error) {
      console.error("Error saving employee:", error);
      const errorMsg = error.response?.data?.error || error.message;
      setErrorMessage(t("errorSavingEmployee", { error: errorMsg }));
    }
  };

  const tabs = [
    { id: "overview", label: t("overview"), icon: t("overviewIcon") },
    { id: "basic", label: t("basic"), icon: t("basicIcon") },
    { id: "address", label: t("address"), icon: t("addressIcon") },
    { id: "job", label: t("job"), icon: t("jobIcon") },
    { id: "attendance", label: t("attendance"), icon: t("attendanceIcon") },
    { id: "personal", label: t("personal"), icon: t("personalIcon") },
    { id: "salary", label: t("salary"), icon: t("salaryIcon") },
    { id: "exit", label: t("exit"), icon: t("exitIcon") },
    { id: "password", label: t("changePassword"), icon: t("passwordIcon") },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 border-b border-slate-100">
            <h1 className="text-2xl font-bold text-slate-800">{t("employeeProfile")}</h1>
          </div>
          <div className="flex py-3">
            <div className="flex space-x-2 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-1 text-sm ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col">
          {errorMessage && (
            <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="p-8">
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("employeeEmail")}
                  </label>
                  <input
                    type="email"
                    name="employeeMail"
                    value={formData.employeeMail}
                    disabled
                    className="w-full p-3 border-2 border-slate-200 rounded-lg font-medium text-slate-600 cursor-not-allowed focus:outline-none focus:border-blue-500 transition-colors h-12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("employeeNumber")}
                  </label>
                  <input
                    type="text"
                    name="employeeNumber"
                    value={formData.employeeNumber}
                    disabled
                    className="w-full p-3 border-2 border-slate-200 rounded-lg font-medium text-slate-600 cursor-not-allowed focus:outline-none focus:border-blue-500 transition-colors h-12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("department")}
                  </label>
                  <input
                    type="text"
                    name="departmentId"
                    value={getDepartmentName(formData.departmentId)}
                    disabled
                    className="w-full p-3 border-2 border-slate-200 rounded-lg font-medium text-slate-600 cursor-not-allowed focus:outline-none focus:border-blue-500 transition-colors h-12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("dateOfJoining")}
                  </label>
                  <input
                    type="date"
                    name="DOJ"
                    value={formData.DOJ || new Date().toISOString().split("T")[0]}
                    disabled
                    className="w-full p-3 border-2 border-slate-200 rounded-lg font-medium text-slate-600 cursor-not-allowed focus:outline-none focus:border-blue-500 transition-colors h-12"
                  />
                </div>
              </div>
            )}

            {activeTab === "basic" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("salutation")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="salutation"
                    value={formData.salutation}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">{t("selectSalutation")}</option>
                    <option value="Mr">{t("mr")}</option>
                    <option value="Ms">{t("ms")}</option>
                    <option value="Mrs">{t("mrs")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("firstName")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterFirstName")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("middleName")}
                  </label>
                  <input
                    type="text"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterMiddleName")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("lastName")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterLastName")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("gender")}
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">{t("selectGender")}</option>
                    <option value="Male">{t("male")}</option>
                    <option value="Female">{t("female")}</option>
                    <option value="Other">{t("other")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("dateOfBirth")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="DOB"
                    value={formData.DOB}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("referencePerson")}
                  </label>
                  <input
                    type="text"
                    name="referencePerson"
                    value={formData.referencePerson}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterReferencePerson")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("personalEmail")}
                  </label>
                  <input
                    type="email"
                    name="personalMail"
                    value={formData.personalMail}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterPersonalEmail")}
                  />
                </div>
                <div className="col-span-1 md:col-span-2 flex justify-center mt-6">
                  <div className="w-full max-w-md">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t("profilePhoto")} <span className="text-red-500">*</span>
                    </label>
                    <div className="mb-4">
                      <img
                        src={photoPreview}
                        alt={t("profilePhoto")}
                        className="w-32 h-32 object-cover rounded-full mx-auto border-2 border-slate-200"
                        onError={(e) => {
                          console.error('Failed to load image from URL:', photoPreview);
                          e.currentTarget.src = "/placeholder-image.jpg";
                          if (!errorMessage.includes(t("profilePhoto"))) {
                            setErrorMessage(t("failedToLoadProfilePhoto"));
                          }
                        }}
                      />
                    </div>
                    <input
                      type="file"
                      name="photo"
                      accept="image/*"
                      onChange={handleChange}
                      className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                    />
                    {formData.photo && (
                      <p className="text-sm text-slate-600 mt-2">
                        {t("selectedPhoto", { fileName: formData.photo.name })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "address" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("doorNumber")}
                  </label>
                  <input
                    type="text"
                    name="doorNumber"
                    value={formData.doorNumber}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterDoorNumber")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("streetName")}
                  </label>
                  <input
                    type="text"
                    name="streetName"
                    value={formData.streetName}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterStreetName")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("city")}
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterCity")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("busRoute")}
                  </label>
                  <select
                    name="busId"
                    value={formData.busId}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">{t("selectBus")}</option>
                    {options.buses.map((b) => (
                      <option key={b.busId} value={b.busId}>
                        {b.busNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("district")}
                  </label>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterDistrict")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("state")}
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterState")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("pincode")}
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterPincode")}
                  />
                </div>
              </div>
            )}

            {activeTab === "job" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("designation")}
                  </label>
                  <select
                    name="designationId"
                    value={formData.designationId}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">{t("selectDesignation")}</option>
                    {options.designations.map((d) => (
                      <option key={d.designationId} value={d.designationId}>
                        {d.designationName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("grade")}
                  </label>
                  <select
                    name="employeeGradeId"
                    value={formData.employeeGradeId}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">{t("selectGrade")}</option>
                    {options.grades.map((g) => (
                      <option key={g.employeeGradeId} value={g.employeeGradeId}>
                        {g.employeeGradeName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("qualification")}
                  </label>
                  <input
                    type="text"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterQualification")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("experience")}
                  </label>
                  <input
                    type="text"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterExperience")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("reportsTo")}
                  </label>
                  <select
                    name="reportsTo"
                    value={formData.reportsTo}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">{t("selectReportsTo")}</option>
                    {options.employees.length > 0 ? (
                      options.employees.map((emp) => (
                        <option key={emp.employeeId} value={emp.employeeId}>
                          {emp.firstName} {emp.lastName}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        {t("noManagersAvailable")}
                      </option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("employeeType")}
                  </label>
                  <select
                    name="employeeTypeId"
                    value={formData.employeeTypeId}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">{t("selectEmployeeType")}</option>
                    {options.types.map((t) => (
                      <option key={t.employeeTypeId} value={t.employeeTypeId}>
                        {t.employeeTypeName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {activeTab === "attendance" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("holidayPlan")}
                  </label>
                  <select
                    name="holidayPlanId"
                    value={formData.holidayPlanId}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">{t("selectHolidayPlan")}</option>
                    {options.holidayPlans.map((h) => (
                      <option key={h.holidayPlanId} value={h.holidayPlanId}>
                        {h.holidayPlanName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("shift")}
                  </label>
                  <select
                    name="shiftId"
                    value={formData.shiftId}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                    disabled
                  >
                    <option value="">{t("selectShift")}</option>
                    {options.shifts.map((s) => (
                      <option key={s.shiftId} value={s.shiftId}>
                        {s.shiftName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {activeTab === "personal" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("religion")}
                  </label>
                  <select
                    name="religionId"
                    value={formData.religionId}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">{t("selectReligion")}</option>
                    {options.religions.map((r) => (
                      <option key={r.religionId} value={r.religionId}>
                        {r.religionName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("caste")}
                  </label>
                  <select
                    name="casteId"
                    value={formData.casteId}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">{t("selectCaste")}</option>
                    {options.castes.map((c) => (
                      <option key={c.casteId} value={c.casteId}>
                        {c.casteName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("maritalStatus")}
                  </label>
                  <input
                    type="text"
                    name="maritalStatus"
                    value={formData.maritalStatus}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterMaritalStatus")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("bloodGroup")}
                  </label>
                  <input
                    type="text"
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterBloodGroup")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("aadharNumber")}
                  </label>
                  <input
                    type="text"
                    name="aadharNumber"
                    value={formData.aadharNumber}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterAadharNumber")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("passportNumber")}
                  </label>
                  <input
                    type="text"
                    name="passportNumber"
                    value={formData.passportNumber}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterPassportNumber")}
                  />
                </div>
              </div>
            )}

            {activeTab === "salary" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("costToCompany")}
                  </label>
                  <input
                    type="number"
                    name="costToCompany"
                    value={formData.costToCompany}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterCtc")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("salaryId")}
                  </label>
                  <input
                    type="number"
                    name="salaryId"
                    value={formData.salaryId}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterSalaryId")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("salaryCurrency")}
                  </label>
                  <input
                    type="text"
                    name="salaryCurrency"
                    value={formData.salaryCurrency}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterSalaryCurrency")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("salaryMode")}
                  </label>
                  <input
                    type="text"
                    name="salaryMode"
                    value={formData.salaryMode}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterSalaryMode")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("payrollCostCenter")}
                  </label>
                  <input
                    type="text"
                    name="payrollCostCenter"
                    value={formData.payrollCostCenter}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterPayrollCostCenter")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("accountNumber")}
                  </label>
                  <input
                    type="text"
                    name="acctNumber"
                    value={formData.acctNumber}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterAccountNumber")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("panNumber")}
                  </label>
                  <input
                    type="text"
                    name="panNumber"
                    value={formData.panNumber}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterPanNumber")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("pfNumber")}
                  </label>
                  <input
                    type="text"
                    name="pfNumber"
                    value={formData.pfNumber}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterPfNumber")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("pfNominee")}
                  </label>
                  <input
                    type="text"
                    name="pfNominee"
                    value={formData.pfNominee}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterPfNominee")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("esiNumber")}
                  </label>
                  <input
                    type="text"
                    name="esiNumber"
                    value={formData.esiNumber}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterEsiNumber")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("uanNumber")}
                  </label>
                  <input
                    type="text"
                    name="uanNumber"
                    value={formData.uanNumber}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder={t("enterUanNumber")}
                  />
                </div>
              </div>
            )}

            {activeTab === "exit" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("resignationLetterDate")}
                  </label>
                  <input
                    type="date"
                    name="resignationLetterDate"
                    value={formData.resignationLetterDate}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("relievingDate")}
                  </label>
                  <input
                    type="date"
                    name="relievingDate"
                    value={formData.relievingDate}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("exitInterviewHeldOn")}
                  </label>
                  <input
                    type="date"
                    name="exitInterviewHeldOn"
                    value={formData.exitInterviewHeldOn}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                  />
                </div>
              </div>
            )}

            {activeTab === "password" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                <div className="relative">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("newPassword")}
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full p-3 border-2 rounded-lg focus:outline-none transition-colors h-12 pr-10 ${
                      passwordMismatch ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-blue-500"
                    }`}
                    placeholder={t("enterNewPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-10 text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
                <div className="relative">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t("confirmPassword")}
                  </label>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full p-3 border-2 rounded-lg focus:outline-none transition-colors h-12 pr-10 ${
                      passwordMismatch ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-blue-500"
                    }`}
                    placeholder={t("enterConfirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-10 text-slate-500 hover:text-slate-700"
                  >
                    {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                  {passwordMismatch && (
                    <p className="text-red-500 text-sm mt-1">{t("passwordsDoNotMatch")}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-8 py-6 border-t border-slate-200 flex-shrink-0">
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
              >
                <span>💾</span>
                {t("saveProfile")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfilePage;