import React, { useState } from "react";
import axios from "axios";

const EmployeeProfilePage = () => {
  const [activeTab, setActiveTab] = useState("overview");

  const [formData, setFormData] = useState({
    // Overview
    salutation: "",
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "",
    DOB: "",
    DOJ: "",

    // Address
    doorNumber: "",
    streetName: "",
    city: "",
    district: "",
    state: "",
    pincode: "",

    // Job
    designationId: "",
    employeeGradeId: "",
    reportsTo: "",
    departmentId: "",
    employeeTypeId: "",
    employeeNumber: "",

    // Attendance & Leaves
    holidayListPolicyId: "",
    shiftId: "",

    // Personal
    maritalStatus: "",
    bloodGroup: "",
    religionId: "",
    casteId: "",
    aadharNumber: "",
    passportNumber: "",

    // Salary
    costToCompany: "",
    salaryCurrency: "",
    salaryMode: "",
    payrollCostCenter: "",
    panNumber: "",
    pfNumber: "",
    pfNominee: "",
    esiNumber: "",
    uanNumber: "",

    // Exit
    resignationLetterDate: "",
    relievingDate: "",
    exitInterviewHeldOn: "",

    // Extra
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      await axios.post("http://localhost:5000/api/employees", formData);
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
          <input
            type="text"
            name="salutation"
            value={formData.salutation}
            onChange={handleChange}
            placeholder="Salutation"
            className="border p-2 rounded"
          />
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="First Name"
            className="border p-2 rounded"
          />
          <input
            type="text"
            name="middleName"
            value={formData.middleName}
            onChange={handleChange}
            placeholder="Middle Name"
            className="border p-2 rounded"
          />
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Last Name"
            className="border p-2 rounded"
          />
          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="border p-2 rounded"
          >
            <option value="">Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <input
            type="date"
            name="DOB"
            value={formData.DOB}
            onChange={handleChange}
            className="border p-2 rounded"
          />
          <input
            type="date"
            name="DOJ"
            value={formData.DOJ}
            onChange={handleChange}
            className="border p-2 rounded"
          />
        </div>
      )}

      {/* Address */}
      {activeTab === "address" && (
        <div className="grid grid-cols-2 gap-4">
          {["doorNumber", "streetName", "city", "district", "state", "pincode"].map((field) => (
            <input
              key={field}
              type="text"
              name={field}
              value={formData[field]}
              onChange={handleChange}
              placeholder={field}
              className="border p-2 rounded"
            />
          ))}
        </div>
      )}

      {/* Job */}
      {activeTab === "job" && (
        <div className="grid grid-cols-2 gap-4">
          {[
            "designationId",
            "employeeGradeId",
            "reportsTo",
            "departmentId",
            "employeeTypeId",
            "employeeNumber",
          ].map((field) => (
            <input
              key={field}
              type="text"
              name={field}
              value={formData[field]}
              onChange={handleChange}
              placeholder={field}
              className="border p-2 rounded"
            />
          ))}
        </div>
      )}

      {/* Attendance */}
      {activeTab === "attendance" && (
        <div className="grid grid-cols-2 gap-4">
          {["holidayListPolicyId", "shiftId"].map((field) => (
            <input
              key={field}
              type="text"
              name={field}
              value={formData[field]}
              onChange={handleChange}
              placeholder={field}
              className="border p-2 rounded"
            />
          ))}
        </div>
      )}

      {/* Personal */}
      {activeTab === "personal" && (
        <div className="grid grid-cols-2 gap-4">
          {[
            "maritalStatus",
            "bloodGroup",
            "religionId",
            "casteId",
            "aadharNumber",
            "passportNumber",
          ].map((field) => (
            <input
              key={field}
              type="text"
              name={field}
              value={formData[field]}
              onChange={handleChange}
              placeholder={field}
              className="border p-2 rounded"
            />
          ))}
        </div>
      )}

      {/* Salary */}
      {activeTab === "salary" && (
        <div className="grid grid-cols-2 gap-4">
          {[
            "costToCompany",
            "salaryCurrency",
            "salaryMode",
            "payrollCostCenter",
            "panNumber",
            "pfNumber",
            "pfNominee",
            "esiNumber",
            "uanNumber",
          ].map((field) => (
            <input
              key={field}
              type="text"
              name={field}
              value={formData[field]}
              onChange={handleChange}
              placeholder={field}
              className="border p-2 rounded"
            />
          ))}
        </div>
      )}

      {/* Exit */}
      {activeTab === "exit" && (
        <div className="grid grid-cols-2 gap-4">
          {["resignationLetterDate", "relievingDate", "exitInterviewHeldOn"].map((field) => (
            <input
              key={field}
              type="date"
              name={field}
              value={formData[field]}
              onChange={handleChange}
              className="border p-2 rounded"
            />
          ))}
        </div>
      )}

      {/* Extra */}
      {activeTab === "extra" && (
        <div className="grid grid-cols-2 gap-4">
          {[
            "employeeMail",
            "personalMail",
            "salaryId",
            "acctNumber",
            "password",
            "qualification",
            "experience",
            "referencePerson",
            "busId",
          ].map((field) => (
            <input
              key={field}
              type="text"
              name={field}
              value={formData[field]}
              onChange={handleChange}
              placeholder={field}
              className="border p-2 rounded"
            />
          ))}
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
