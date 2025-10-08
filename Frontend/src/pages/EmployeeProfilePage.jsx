import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

let token = sessionStorage.getItem("token");
let decoded = token ? jwtDecode(token) : "";
let userNumber = decoded?.userNumber;

const EmployeeProfilePage = () => {
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
    if (formData.photo instanceof File) {
      const url = URL.createObjectURL(formData.photo);
      setPhotoPreview(url);
      return () => URL.revokeObjectURL(url);
    } else if (formData.photoPath) {
      // Transform photoPath to match static route (/uploads/<filename>)
      const correctedPhotoPath = formData.photoPath.includes('/uploads/employees/')
        ? `/uploads/${formData.photoPath.split('/').pop()}`
        : formData.photoPath;
      console.log('Corrected photoPath:', correctedPhotoPath); // Debug log
      setPhotoPreview(correctedPhotoPath);
    } else {
      setPhotoPreview("/placeholder-image.jpg");
    }
  }, [formData.photo, formData.photoPath]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/departments");
        setDepartments(res.data);
      } catch (err) {
        console.error("Error fetching departments:", err);
        setErrorMessage("Failed to load departments. Please try again.");
      }
    };
    fetchDepartments();
  }, []);

  const getDepartmentName = (id) => {
    const dept = departments.find((d) => d.departmentId === id);
    return dept ? dept.departmentName : id;
  };

  useEffect(() => {
    const fetchUserMappedData = async () => {
      try {
        if (!userNumber) {
          setErrorMessage("User number not found. Please log in again.");
          return;
        }
        console.log('Fetching user data for userNumber:', userNumber); // Debug log
        const res = await axios.get(`http://localhost:5000/api/employees/fromUser/${userNumber}`);
        setFormData((prev) => ({
          ...prev,
          employeeMail: res.data.employeeMail,
          employeeNumber: res.data.employeeNumber,
          password: res.data.password,
          departmentId: res.data.departmentId,
        }));
      } catch (err) {
        console.error("Error fetching user-mapped employee data:", err);
        setErrorMessage("Failed to load user data. Please try again.");
      }
    };
    fetchUserMappedData();
  }, []);

  useEffect(() => {
    const fetchExistingEmployeeData = async () => {
      try {
        const employeeNumber = userNumber
        if (!employeeNumber) {
          setErrorMessage("User number not found. Please log in again.");
          return;
        }
        console.log('Fetching employee data for employeeNumber:', employeeNumber); // Debug log
        const res = await axios.get(
          `http://localhost:5000/api/employees/full/${employeeNumber}`
        );
        if (res.data) {
          console.log('Fetched employee data:', res.data); // Debug log
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
        setErrorMessage(`Failed to load employee data: ${err.response?.data?.error || err.message}`);
      }
    };
    fetchExistingEmployeeData();
  }, []);

  useEffect(() => {
    const fetchOptions = async () => {
      const requests = [
        axios.get("http://localhost:5000/api/designations"),
        axios.get("http://localhost:5000/api/employeeGrades"),
        axios.get("http://localhost:5000/api/employeeTypes"),
        axios.get("http://localhost:5000/api/holidayPlans"),
        axios.get("http://localhost:5000/api/religions"),
        axios.get("http://localhost:5000/api/castes"),
        axios.get("http://localhost:5000/api/buses"),
        axios.get("http://localhost:5000/api/employees"),
        axios.get("http://localhost:5000/api/shifts"),
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
          setErrorMessage(
            "Some options, including employee data, failed to load. Some features may be limited. Please try again or contact support."
          );
        }
      } catch (error) {
        console.error("Unexpected error in fetchOptions:", error);
        setErrorMessage("Failed to load options. Please try again.");
      }
    };

    fetchOptions();
  }, []);

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
          setErrorMessage(`${field} is required`);
          return;
        }
      }
      if (activeTab === "basic" && !formData.photo && !formData.photoPath) {
        setErrorMessage("Profile Photo is required");
        return;
      }
    }

    if (activeTab === "password") {
      if (!formData.password || !formData.confirmPassword) {
        setErrorMessage("Both password and confirm password are required");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setErrorMessage("Passwords do not match");
        return;
      }
    }

    try {
      const employeeNumber = userNumber
      if (!employeeNumber) {
        setErrorMessage("User number not found. Please log in again.");
        return;
      }
      console.log('Saving with employeeNumber:', employeeNumber); // Debug log

      // Check if employee exists
      let employee;
      try {
        const response = await axios.get(`http://localhost:5000/api/employees/full/${employeeNumber}`);
        employee = response.data;
      } catch (err) {
        if (err.response?.status === 404) {
          console.log('Employee not found, creating new employee');
          const createResponse = await axios.post(`http://localhost:5000/api/employees`, {
            employeeNumber,
            firstName: formData.firstName || "Default",
            lastName: formData.lastName || "User",
            departmentId: formData.departmentId || 1, // Ensure valid departmentId
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
          setErrorMessage("Employee ID is missing for photo upload");
          return;
        }
        const photoFormData = new FormData();
        photoFormData.append("photo", formData.photo);
        try {
          const photoResponse = await axios.post(
            `http://localhost:5000/api/employees/${formData.employeeId || employee.employeeId}/photo`,
            photoFormData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );
          console.log('Photo upload response:', photoResponse.data); // Debug log
          setFormData((prev) => ({
            ...prev,
            photoPath: photoResponse.data.employee.photo,
            photo: null,
          }));
        } catch (photoError) {
          console.error("Error uploading photo:", photoError);
          setErrorMessage("Failed to upload photo. Please try again.");
          return;
        }
      }

      const filteredData = Object.fromEntries(
        Object.entries(formData).filter(
          ([key, value]) => key !== "photo" && key !== "photoPath" && key !== "confirmPassword" && value !== "" && value !== null
        )
      );

      console.log('Sending PUT with data:', filteredData); // Debug log
      await axios.put(`http://localhost:5000/api/employees/${employeeNumber}`, filteredData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      alert("Employee saved successfully!");
      setErrorMessage("");

      setFormData((prev) => ({
        ...prev,
        confirmPassword: activeTab === "password" ? "" : prev.confirmPassword,
        photo: activeTab === "basic" ? null : prev.photo,
      }));
    } catch (error) {
      console.error("Error saving employee:", error);
      const errorMsg = error.response?.data?.error || error.message;
      setErrorMessage(`Failed to save employee: ${errorMsg}`);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: "👤" },
    { id: "basic", label: "Basic", icon: "📝" },
    { id: "address", label: "Address", icon: "📍" },
    { id: "job", label: "Job", icon: "💼" },
    { id: "attendance", label: "Attendance", icon: "⏰" },
    { id: "personal", label: "Personal", icon: "🏠" },
    { id: "salary", label: "Salary", icon: "💰" },
    { id: "exit", label: "Exit", icon: "🚪" },
    { id: "password", label: "Change Password", icon: "📋" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 border-b border-slate-100">
            <h1 className="text-2xl font-bold text-slate-800">Employee Profile</h1>
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
                    Employee Email
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
                    Employee Number
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
                    Department
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
                    Date of Joining
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
                    Salutation <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="salutation"
                    value={formData.salutation}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">Select Salutation</option>
                    <option value="Mr">Mr</option>
                    <option value="Ms">Ms</option>
                    <option value="Mrs">Mrs</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter middle name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter last name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Date of Birth <span className="text-red-500">*</span>
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
                    Reference Person ID
                  </label>
                  <input
                    type="text"
                    name="referencePerson"
                    value={formData.referencePerson}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter reference person ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Personal Email
                  </label>
                  <input
                    type="email"
                    name="personalMail"
                    value={formData.personalMail}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter personal email"
                  />
                </div>
                <div className="col-span-1 md:col-span-2 flex justify-center mt-6">
                  <div className="w-full max-w-md">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Profile Photo <span className="text-red-500">*</span>
                    </label>
                    <div className="mb-4">
                      <img
                        src={photoPreview}
                        alt="Profile"
                        className="w-32 h-32 object-cover rounded-full mx-auto border-2 border-slate-200"
                        onError={(e) => {
                          console.error('Failed to load image:', photoPreview); // Debug log
                          e.currentTarget.src = "/placeholder-image.jpg";
                          setErrorMessage("Failed to load profile photo");
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
                        Selected: {formData.photo.name}
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
                    Door Number
                  </label>
                  <input
                    type="text"
                    name="doorNumber"
                    value={formData.doorNumber}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter door number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Street Name
                  </label>
                  <input
                    type="text"
                    name="streetName"
                    value={formData.streetName}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter street name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter city"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Bus Route
                  </label>
                  <select
                    name="busId"
                    value={formData.busId}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">Select Bus</option>
                    {options.buses.map((b) => (
                      <option key={b.busId} value={b.busId}>
                        {b.busNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    District
                  </label>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter district"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter state"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Pincode
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter pincode"
                  />
                </div>
              </div>
            )}

            {activeTab === "job" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Designation
                  </label>
                  <select
                    name="designationId"
                    value={formData.designationId}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">Select Designation</option>
                    {options.designations.map((d) => (
                      <option key={d.designationId} value={d.designationId}>
                        {d.designationName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Grade
                  </label>
                  <select
                    name="employeeGradeId"
                    value={formData.employeeGradeId}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">Select Grade</option>
                    {options.grades.map((g) => (
                      <option key={g.employeeGradeId} value={g.employeeGradeId}>
                        {g.employeeGradeName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Qualification
                  </label>
                  <input
                    type="text"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter qualification"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Experience
                  </label>
                  <input
                    type="text"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter experience details"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Reports To
                  </label>
                  <select
                    name="reportsTo"
                    value={formData.reportsTo}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">Select Manager</option>
                    {options.employees.length > 0 ? (
                      options.employees.map((emp) => (
                        <option key={emp.employeeId} value={emp.employeeId}>
                          {emp.firstName} {emp.lastName}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        No managers available
                      </option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Employee Type
                  </label>
                  <select
                    name="employeeTypeId"
                    value={formData.employeeTypeId}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">Select Employee Type</option>
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
                    Holiday Plan
                  </label>
                  <select
                    name="holidayPlanId"
                    value={formData.holidayPlanId}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">Select Holiday Plan</option>
                    {options.holidayPlans.map((h) => (
                      <option key={h.holidayPlanId} value={h.holidayPlanId}>
                        {h.holidayPlanName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Shift
                  </label>
                  <select
                    name="shiftId"
                    value={formData.shiftId}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">Select Shift</option>
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
                    Religion
                  </label>
                  <select
                    name="religionId"
                    value={formData.religionId}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">Select Religion</option>
                    {options.religions.map((r) => (
                      <option key={r.religionId} value={r.religionId}>
                        {r.religionName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Caste
                  </label>
                  <select
                    name="casteId"
                    value={formData.casteId}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">Select Caste</option>
                    {options.castes.map((c) => (
                      <option key={c.casteId} value={c.casteId}>
                        {c.casteName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Marital Status
                  </label>
                  <input
                    type="text"
                    name="maritalStatus"
                    value={formData.maritalStatus}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter marital status"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Blood Group
                  </label>
                  <input
                    type="text"
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter blood group"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Aadhar Number
                  </label>
                  <input
                    type="text"
                    name="aadharNumber"
                    value={formData.aadharNumber}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter Aadhar number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Passport Number
                  </label>
                  <input
                    type="text"
                    name="passportNumber"
                    value={formData.passportNumber}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter passport number"
                  />
                </div>
              </div>
            )}

            {activeTab === "salary" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Cost to Company (CTC)
                  </label>
                  <input
                    type="number"
                    name="costToCompany"
                    value={formData.costToCompany}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter CTC amount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Salary ID
                  </label>
                  <input
                    type="number"
                    name="salaryId"
                    value={formData.salaryId}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter salary ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Salary Currency
                  </label>
                  <input
                    type="text"
                    name="salaryCurrency"
                    value={formData.salaryCurrency}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter currency (e.g., INR)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Salary Mode
                  </label>
                  <input
                    type="text"
                    name="salaryMode"
                    value={formData.salaryMode}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter salary mode"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Payroll Cost Center
                  </label>
                  <input
                    type="text"
                    name="payrollCostCenter"
                    value={formData.payrollCostCenter}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter cost center"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    name="acctNumber"
                    value={formData.acctNumber}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter account number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    name="panNumber"
                    value={formData.panNumber}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter PAN number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    PF Number
                  </label>
                  <input
                    type="text"
                    name="pfNumber"
                    value={formData.pfNumber}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter PF number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    PF Nominee
                  </label>
                  <input
                    type="text"
                    name="pfNominee"
                    value={formData.pfNominee}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter PF nominee name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    ESI Number
                  </label>
                  <input
                    type="text"
                    name="esiNumber"
                    value={formData.esiNumber}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter ESI number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    UAN Number
                  </label>
                  <input
                    type="text"
                    name="uanNumber"
                    value={formData.uanNumber}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter UAN number"
                  />
                </div>
              </div>
            )}

            {activeTab === "exit" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Resignation Letter Date
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
                    Relieving Date
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
                    Exit Interview Held On
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
                    New Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full p-3 border-2 rounded-lg focus:outline-none transition-colors h-12 pr-10 ${
                      passwordMismatch ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-blue-500"
                    }`}
                    placeholder="Enter new password"
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
                    Confirm Password
                  </label>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full p-3 border-2 rounded-lg focus:outline-none transition-colors h-12 pr-10 ${
                      passwordMismatch ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-blue-500"
                    }`}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-10 text-slate-500 hover:text-slate-700"
                  >
                    {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                  {passwordMismatch && (
                    <p className="text-red-500 text-sm mt-1">Passwords do not match.</p>
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
                Save Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfilePage;