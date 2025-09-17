import React, { useState, useEffect } from "react";
import axios from "axios";

const EmployeeProfilePage = () => {
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
        setDepartments(res.data); // [{departmentId: 1, departmentName: "HR"}, ...]
      } catch (err) {
        console.error("❌ Error fetching departments:", err);
      }
    };
    fetchDepartments();
  }, []);

    const getDepartmentName = (id) => {
    const dept = departments.find((d) => d.departmentId === id);
    return dept ? dept.departmentName : id;
  };




    // Fetch user-mapped data using session userNumber
  useEffect(() => {
    const fetchUserMappedData = async () => {
      try {
        const userNumber = sessionStorage.getItem("userNumber"); // stored at login
        if (!userNumber) return;

        const res = await axios.get(`http://localhost:5000/api/employees/fromUser/${userNumber}`);

        setFormData((prev) => ({
          ...prev,
          employeeMail: res.data.employeeMail ,
          employeeNumber: res.data.employeeNumber,
          password: res.data.password,
          departmentId: res.data.departmentId,
        }));
      } catch (err) {
        console.error("❌ Error fetching user-mapped employee data:", err);
      }
    };

    fetchUserMappedData();
  }, []);

  useEffect(() => {
    const fetchExistingEmployeeData = async () => {
      try {
        const employeeNumber = sessionStorage.getItem("userNumber"); // stored at login
        if (!employeeNumber) return;

        const res = await axios.get(
          `http://localhost:5000/api/employees/full/${employeeNumber}`
        );

        if (res.data) {
          // Only fill fields that are empty in formData (skip employeeNumber, employeeMail, departmentId, DOJ)
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
        console.error("❌ Error fetching existing employee data:", err);
      }
    };

    fetchExistingEmployeeData();
  }, []);


  // Fetch dropdown options on mount
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
        console.error("❌ Failed to load options:", error);
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

  // const handleSave = async () => {
  //   try {
  //     await axios.post("http://localhost:5000/api/employees", formData);
  //     alert("✅ Employee saved successfully!");
  //   } catch (error) {
  //     console.error("❌ Error saving employee:", error);
  //     alert("❌ Failed to save employee");
  //   }
  // };

  const handleSave = async () => {
  // Define which fields are required
  const requiredFields = ["firstName", "lastName", "departmentId","DOB","employeeNumber"];

  // Validate required fields
  for (let field of requiredFields) {
    if (!formData[field] || formData[field].toString().trim() === "") {
      alert(`❌ ${field} is required`);
      return;
    }
  }

  // Remove empty optional fields
  const filteredData = Object.fromEntries(
    Object.entries(formData).filter(([_, value]) => value !== "")
  );

  try {
    const employeeNumber = sessionStorage.getItem("userNumber"); // stored at login
    console.log(employeeNumber);

    // Add createdBy field
    filteredData.createdBy = "Admin";
    filteredData.updatedBy = employeeNumber;
    
    await axios.put(`http://localhost:5000/api/employees/${employeeNumber}`, filteredData);
    alert("✅ Employee saved successfully!");
  } catch (error) {
    console.error("❌ Error saving employee:", error);
    alert("❌ Failed to save employee");
  }
};


  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Tabs */}
      <div className="flex border-b mb-6 flex-wrap">
        {[
          "overview",
          "basic",
          "address",
          "job",
          "attendance",
          "personal",
          "salary",
          "exit",
          "extra",
        ].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 capitalize ${
              activeTab === tab ? "border-b-2 border-blue-600 font-semibold" : ""
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

        {/* Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-2 gap-4">
            <label className="block">
              Employee Mail:
              <input
                type="email"
                name="employeeMail"
                value={formData.employeeMail}
                disabled
                className="border p-2 rounded w-full mt-1 bg-gray-100 cursor-not-allowed"
              />
            </label>

            <label className="block">
              Employee Number:
              <input
                type="text"
                name="employeeNumber"
                value={formData.employeeNumber}
                disabled
                className="border p-2 rounded w-full mt-1 bg-gray-100 cursor-not-allowed"
              />
            </label>

            <label className="block">
              Department:
              <input
                type="text"
                name="departmentId"
                value={getDepartmentName(formData.departmentId)}
                disabled
                className="border p-2 rounded w-full mt-1 bg-gray-100 cursor-not-allowed"
              />
            </label>

            <label className="block">
              DOJ:
              <input
                type="date"
                name="DOJ"
                value={formData.DOJ || new Date().toISOString().split("T")[0]} 
                disabled
                className="border p-2 rounded w-full mt-1 bg-gray-100 cursor-not-allowed"
              />
            </label>

        </div>
      )}

      {/* Basic */}
      {activeTab === "basic" && (
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            Salutation:
            <select
              name="salutation"
              value={formData.salutation}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            >
              <option value="">Select Salutation</option>
              <option value="Mr">Mr</option>
              <option value="Ms">Ms</option>
              <option value="Mrs">Mrs</option>
            </select>
          </label>

          <label className="block">
            First Name:
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            Middle Name:
            <input
              type="text"
              name="middleName"
              value={formData.middleName}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            Last Name:
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            Gender:
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label className="block">
            DOB:
            <input
              type="date"
              name="DOB"
              value={formData.DOB}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          
        </div>
      )}

      {/* Address */}
      {activeTab === "address" && (
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            Door Number:
            <input
              type="text"
              name="doorNumber"
              value={formData.doorNumber}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            Street Name:
            <input
              type="text"
              name="streetName"
              value={formData.streetName}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            City:
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            District:
            <input
              type="text"
              name="district"
              value={formData.district}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            State:
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            Pincode:
            <input
              type="text"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>
        </div>
      )}

      {/* Job */}
      {activeTab === "job" && (
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            Designation:
            <select
              name="designationId"
              value={formData.designationId}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            >
              <option value="">Select Designation</option>
              {options.designations.map((d) => (
                <option key={d.designationId} value={d.designationId}>
                  {d.designationName}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            Grade:
            <select
              name="employeeGradeId"
              value={formData.employeeGradeId}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            >
              <option value="">Select Grade</option>
              {options.grades.map((g) => (
                <option key={g.employeeGradeId} value={g.employeeGradeId}>
                  {g.employeeGradeName}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            Reports To:
            <select
              name="reportsTo"
              value={formData.reportsTo}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            >
              <option value="">Select Manager</option>
              {options.employees.map((emp) => (
                <option key={emp.employeeId} value={emp.employeeId}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            Employee Type:
            <select
              name="employeeTypeId"
              value={formData.employeeTypeId}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            >
              <option value="">Select Employee Type</option>
              {options.types.map((t) => (
                <option key={t.employeeTypeId} value={t.employeeTypeId}>
                  {t.employeeTypeName}
                </option>
              ))}
            </select>
          </label>
        
        </div>
      )}

      {/* Attendance */}
      {activeTab === "attendance" && (
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            Holiday Plan:
            <select
              name="holidayPlanId"
              value={formData.holidayPlanId}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            >
              <option value="">Select Holiday Plan</option>
              {options.holidayPlans.map((h) => (
                <option key={h.holidayPlanId} value={h.holidayPlanId}>
                  {h.holidayPlanName}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            Shift:
            <select
              name="shiftId"
              value={formData.shiftId}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            >
              <option value="">Select Shift</option>
              {options.shifts.map((s) => (
                <option key={s.shiftId} value={s.shiftId}>
                  {s.shiftName}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* Personal */}
      {activeTab === "personal" && (
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            Religion:
            <select
              name="religionId"
              value={formData.religionId}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            >
              <option value="">Select Religion</option>
              {options.religions.map((r) => (
                <option key={r.religionId} value={r.religionId}>
                  {r.religionName}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            Caste:
            <select
              name="casteId"
              value={formData.casteId}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            >
              <option value="">Select Caste</option>
              {options.castes.map((c) => (
                <option key={c.casteId} value={c.casteId}>
                  {c.casteName}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            Marital Status:
            <input
              type="text"
              name="maritalStatus"
              value={formData.maritalStatus}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            Blood Group:
            <input
              type="text"
              name="bloodGroup"
              value={formData.bloodGroup}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            Aadhar Number:
            <input
              type="text"
              name="aadharNumber"
              value={formData.aadharNumber}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            Passport Number:
            <input
              type="text"
              name="passportNumber"
              value={formData.passportNumber}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>
        </div>
      )}

      {/* Salary */}
      {activeTab === "salary" && (
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            CTC:
            <input
              type="number"
              name="costToCompany"
              value={formData.costToCompany}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            Salary ID:
            <input
              type="number"
              name="salaryId"
              value={formData.salaryId}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            Salary Currency:
            <input
              type="text"
              name="salaryCurrency"
              value={formData.salaryCurrency}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            Salary Mode:
            <input
              type="text"
              name="salaryMode"
              value={formData.salaryMode}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            Payroll Cost Center:
            <input
              type="text"
              name="payrollCostCenter"
              value={formData.payrollCostCenter}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            Account Number:
            <input
              type="text"
              name="acctNumber"
              value={formData.acctNumber}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            PAN:
            <input
              type="text"
              name="panNumber"
              value={formData.panNumber}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            PF Number:
            <input
              type="text"
              name="pfNumber"
              value={formData.pfNumber}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            PF Nominee:
            <input
              type="text"
              name="pfNominee"
              value={formData.pfNominee}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            ESI Number:
            <input
              type="text"
              name="esiNumber"
              value={formData.esiNumber}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            UAN Number:
            <input
              type="text"
              name="uanNumber"
              value={formData.uanNumber}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>
        </div>
      )}

      {/* Exit */}
      {activeTab === "exit" && (
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            Resignation Letter Date:
            <input
              type="date"
              name="resignationLetterDate"
              value={formData.resignationLetterDate}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            Relieving Date:
            <input
              type="date"
              name="relievingDate"
              value={formData.relievingDate}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            Exit Interview Held On:
            <input
              type="date"
              name="exitInterviewHeldOn"
              value={formData.exitInterviewHeldOn}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>
        </div>
      )}

      {/* Extra */}
      {activeTab === "extra" && (
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            Bus:
            <select
              name="busId"
              value={formData.busId}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            >
              <option value="">Select Bus</option>
              {options.buses.map((b) => (
                <option key={b.busId} value={b.busId}>
                  {b.busNumber}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            Reference Person (ID):
            <input
              type="text"
              name="referencePerson"
              value={formData.referencePerson}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            Qualification:
            <input
              type="text"
              name="qualification"
              value={formData.qualification}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            Experience:
            <input
              type="text"
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            Employee Mail:
            <input
              type="email"
              name="employeeMail"
              value={formData.employeeMail}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
              disabled
            />
          </label>

          <label className="block">
            Personal Mail:
            <input
              type="email"
              name="personalMail"
              value={formData.personalMail}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="block">
            Password:
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="border p-2 rounded w-full mt-1"
            />
          </label>
        </div>
      )}

      {/* Save Button */}
      <div className="mt-6">
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default EmployeeProfilePage;
