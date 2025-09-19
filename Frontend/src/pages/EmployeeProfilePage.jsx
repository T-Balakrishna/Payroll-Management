import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";




const EmployeeProfilePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");




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
    qualification: "",
    experience: "",
    referencePerson: "",
    busId: "",
  });




  const [departments, setDepartments] = useState([]);




  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/departments");
        setDepartments(res.data);
      } catch (err) {
        console.error("Error fetching departments:", err);
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
        const userNumber = sessionStorage.getItem("userNumber");
        if (!userNumber) return;
        const res = await axios.get(`http://localhost:5000/api/employees/fromUser/${userNumber}`);
        setFormData((prev) => ({
          ...prev,
          employeeMail: res.data.employeeMail,
          employeeNumber: res.data.employeeNumber,
          password: res.data.password,
          departmentId: res.data.departmentId,
        }));
        // const toPostemployeeNumber = res.employeeNumber;
        const res2 = await axios.post(`http://localhost:5000/api/employees`,
          {
            employeeMail: res.data.employeeMail,
            employeeNumber: res.data.employeeNumber,
            password: res.data.password,
            departmentId: res.data.departmentId,
        }
        );
      } catch (err) {
        console.error("Error fetching user-mapped employee data:", err);
      }
    };
    fetchUserMappedData();
  }, []);




  useEffect(() => {
    const fetchExistingEmployeeData = async () => {
      try {
        const employeeNumber = sessionStorage.getItem("userNumber");
        if (!employeeNumber) return;
        const res = await axios.get(
          `http://localhost:5000/api/employees/full/${employeeNumber}`
        );
        if (res.data) {
          const filteredData = Object.fromEntries(
            Object.entries(res.data).filter(
              ([key, value]) =>
                value !== null &&
                value !== undefined &&
                !["employeeNumber", "employeeMail", "departmentId", "DOJ"].includes(key)
            )
          );
          setFormData((prev) => ({
            ...prev,
            ...filteredData,
          }));
        }
      } catch (err) {
        console.error("Error fetching existing employee data:", err);
      }
    };




    fetchExistingEmployeeData();
  }, []);




  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [
          designations,
          grades,
          types,
          departments,
          holidayPlans,
          religions,
          castes,
          buses,
          employees,
          shifts,
        ] = await Promise.all([
          axios.get("http://localhost:5000/api/designations"),
          axios.get("http://localhost:5000/api/employeeGrades"),
          axios.get("http://localhost:5000/api/employeeTypes"),
          axios.get("http://localhost:5000/api/departments"),
          axios.get("http://localhost:5000/api/holidayPlans"),
          axios.get("http://localhost:5000/api/religions"),
          axios.get("http://localhost:5000/api/castes"),
          axios.get("http://localhost:5000/api/buses"),
          axios.get("http://localhost:5000/api/employees"),
          axios.get("http://localhost:5000/api/shifts"),
        ]);




        setOptions({
          designations: designations.data || [],
          grades: grades.data || [],
          types: types.data || [],
          departments: departments.data || [],
          holidayPlans: holidayPlans.data || [],
          religions: religions.data || [],
          castes: castes.data || [],
          buses: buses.data || [],
          employees: employees.data || [],
          shifts: shifts.data || [],
        });
      } catch (error) {
        console.error("Failed to load options:", error);
      }
    };




    fetchOptions();
  }, []);




  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };




  const handleSave = async () => {
    const requiredFields = ["firstName", "lastName", "departmentId", "DOB", "employeeNumber"];




    for (let field of requiredFields) {
      if (!formData[field] || formData[field].toString().trim() === "") {
        alert(`${field} is required`);
        return;
      }
    }




    const filteredData = Object.fromEntries(
      Object.entries(formData).filter(([_, value]) => value !== "")
    );




    try {
      const employeeNumber = sessionStorage.getItem("userNumber");
      console.log(employeeNumber);
      await axios.put(`http://localhost:5000/api/employees/${employeeNumber}`, filteredData);
      alert("Employee saved successfully!");
    } catch (error) {
      console.error("Error saving employee:", error);
      alert("Failed to save employee");
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
    { id: "extra", label: "Additional", icon: "📋" },
  ];




  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header with Close Button and Tabs */}
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Modal Header */}
          <div className="flex justify-between items-center py-4 border-b border-slate-100">
            <h1 className="text-2xl font-bold text-slate-800">Employee Profile</h1>
          </div>
          {/* Horizontal Tab Navigation */}
          <div className="flex py-3">
            <div className="flex space-x-2 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-1 text-sm ${activeTab === tab.id
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




      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col">
          {/* Form Content */}
          <div className="p-8">
            {/* Overview */}
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
                    className="w-full p-3 border-2 border-slate-200 rounded-lg font-medium text-slate-600
                 cursor-not-allowed focus:outline-none focus:border-blue-500 transition-colors h-12"
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
                    className="w-full p-3 border-2 border-slate-200 rounded-lg font-medium text-slate-600
                 cursor-not-allowed focus:outline-none focus:border-blue-500 transition-colors h-12"
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
                    className="w-full p-3 border-2 border-slate-200 rounded-lg font-medium text-slate-600
                 cursor-not-allowed focus:outline-none focus:border-blue-500 transition-colors h-12"
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
                    className="w-full p-3 border-2 border-slate-200 rounded-lg font-medium text-slate-600
                 cursor-not-allowed focus:outline-none focus:border-blue-500 transition-colors h-12"
                  />
                </div>
              </div>




            )}




            {/* Basic */}
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
              </div>
            )}




            {/* Address */}
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




            {/* Job */}
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
                    Reports To
                  </label>
                  <select
                    name="reportsTo"
                    value={formData.reportsTo}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white h-12"
                  >
                    <option value="">Select Manager</option>
                    {options.employees.map((emp) => (
                      <option key={emp.employeeId} value={emp.employeeId}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
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




            {/* Attendance */}
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




            {/* Personal */}
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




            {/* Salary */}
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




            {/* Exit */}
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




            {/* Extra */}
            {activeTab === "extra" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
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




                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors h-12"
                    placeholder="Enter password"
                  />
                </div>
              </div>
            )}
          </div>




          {/* Save Button */}
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
