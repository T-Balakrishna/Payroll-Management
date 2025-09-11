import React, { useState } from "react";
import { 
  User, Calendar, Phone, Mail, MapPin, CreditCard, Building, Award,
  Heart, Users, DollarSign, FileX, Eye, FileText, Clock
} from "lucide-react";

const EmployeeProfile = () => {
  const [activeTab, setActiveTab] = useState("viewOnly");

  const [formData, setFormData] = useState({
    // View-only data
    empId: "EMP001",
    collegeMail: "john@college.com",
    doj: "2023-06-01",
    weeklyOff: "Sunday",
    deptId: "IT",
    desgId: "Developer",
    empType: "Full-Time",
    shiftTypeId: "Morning",
    salaryTypeId: "Monthly",

    // Mandatory
    phone: "+91 9876543210",
    aadharNo: "1234 5678 9012",
    personalMail: "john.doe@gmail.com",
    accountNo: "123456789012",
    bloodGrp: "O+",
    empName: "John Doe",
    dob: "1995-05-15",
    address: "123 Main Street, City",
    photo: null,
    password: "",
    role: "Developer",

    // Company
    departmentOrderNumber: "IT001",
    shiftRequestApprover: "Manager A",
    expenseApprover: "Finance Head",
    leaveApprover: "HR Manager",

    // Personal
    maritalStatus: "Single",
    gender: "Male",
    religion: "Hindu",
    caste: "General",
    qualification: "B.Tech",
    experience: "3 years",
    pfNumber: "PF123456",
    pfNominee: "Jane Doe",
    busNumber: "B101",
    refPersonId: "REF001",
    esiNumber: "ESI123456",

    // Salary
    costToCompany: "₹8,00,000",
    salaryCurrency: "INR",
    salaryMode: "Bank Transfer",
    payrollCostCenter: "CC001",
    panNumber: "ABCDE1234F",
    providentFundAccount: "PF789012",
    asiNumber: "ASI123",
    uanNumber: "UAN456789",
    salaryRegisterFormat: "Standard",

    // Exit
    resignationLetterDate: "",
    relievingDate: "",
    exitInterviewDate: "",
    newWorkplace: "",
    leaveEncashed: "",
    reasonForLeaving: "",
    feedback: "",
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Updated Employee Data:", formData);
    alert("Changes Saved Successfully!");
  };

  const tabs = [
    { key: "viewOnly", label: "Overview", icon: Eye },
    { key: "mandatoryInfo", label: "Personal", icon: User },
    { key: "companyInfo", label: "Company", icon: Building },
    { key: "personalInfo", label: "Details", icon: FileText },
    { key: "salaryInfo", label: "Salary", icon: DollarSign },
    { key: "exitInfo", label: "Exit", icon: FileX },
  ];

  const ViewOnly = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[
        { label: "Employee ID", value: formData.empId, icon: <User className="w-5 h-5" /> },
        { label: "College Mail", value: formData.collegeMail, icon: <Mail className="w-5 h-5" /> },
        { label: "Date of Joining", value: formData.doj, icon: <Calendar className="w-5 h-5" /> },
        { label: "Weekly Off", value: formData.weeklyOff, icon: <Clock className="w-5 h-5" /> },
        { label: "Department", value: formData.deptId, icon: <Building className="w-5 h-5" /> },
        { label: "Designation", value: formData.desgId, icon: <Award className="w-5 h-5" /> },
        { label: "Employee Type", value: formData.empType, icon: <Users className="w-5 h-5" /> },
        { label: "Shift Type", value: formData.shiftTypeId, icon: <Clock className="w-5 h-5" /> },
        { label: "Salary Type", value: formData.salaryTypeId, icon: <DollarSign className="w-5 h-5" /> },
      ].map((f, i) => (
        <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-blue-600">{f.icon}</div>
            <span className="text-sm font-medium text-gray-600">{f.label}</span>
          </div>
          <div className="text-gray-900 font-semibold">{f.value}</div>
        </div>
      ))}
    </div>
  );

  const MandatoryInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[
        { name: "empName", label: "Full Name", icon: <User className="w-5 h-5" /> },
        { name: "phone", label: "Phone Number", icon: <Phone className="w-5 h-5" /> },
        { name: "personalMail", label: "Personal Email", icon: <Mail className="w-5 h-5" /> },
        { name: "dob", label: "Date of Birth", type: "date", icon: <Calendar className="w-5 h-5" /> },
        { name: "aadharNo", label: "Aadhar Number", icon: <CreditCard className="w-5 h-5" /> },
        { name: "accountNo", label: "Bank Account", icon: <CreditCard className="w-5 h-5" /> },
        { name: "bloodGrp", label: "Blood Group", icon: <Heart className="w-5 h-5" /> },
        { name: "address", label: "Address", icon: <MapPin className="w-5 h-5" /> },
        { name: "password", label: "Password", type: "password", icon: <User className="w-5 h-5" /> },
        { name: "role", label: "Role", icon: <Award className="w-5 h-5" /> },
      ].map((f, i) => (
        <div key={i} className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <div className="text-blue-600">{f.icon}</div>
            {f.label}
          </label>
          <input
            type={f.type || "text"}
            name={f.name}
            value={formData[f.name]}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 bg-white"
            required
          />
        </div>
      ))}
    </div>
  );

  const CompanyInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[
        { name: "departmentOrderNumber", label: "Department Order Number", icon: <Building className="w-5 h-5" /> },
        { name: "shiftRequestApprover", label: "Shift Request Approver", icon: <User className="w-5 h-5" /> },
        { name: "expenseApprover", label: "Expense Approver", icon: <DollarSign className="w-5 h-5" /> },
        { name: "leaveApprover", label: "Leave Approver", icon: <FileText className="w-5 h-5" /> },
      ].map((f, i) => (
        <div key={i} className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <div className="text-blue-600">{f.icon}</div>
            {f.label}
          </label>
          <input
            type="text"
            name={f.name}
            value={formData[f.name]}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 bg-white"
          />
        </div>
      ))}
    </div>
  );

  const PersonalInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[
        { name: "maritalStatus", label: "Marital Status", icon: <Heart className="w-5 h-5" /> },
        { name: "gender", label: "Gender", icon: <User className="w-5 h-5" /> },
        { name: "religion", label: "Religion", icon: <User className="w-5 h-5" /> },
        { name: "caste", label: "Caste", icon: <User className="w-5 h-5" /> },
        { name: "qualification", label: "Qualification", icon: <Award className="w-5 h-5" /> },
        { name: "experience", label: "Experience", icon: <Briefcase className="w-5 h-5" /> },
        { name: "pfNumber", label: "PF Number", icon: <CreditCard className="w-5 h-5" /> },
        { name: "pfNominee", label: "PF Nominee", icon: <User className="w-5 h-5" /> },
        { name: "busNumber", label: "Bus Number", icon: <Building className="w-5 h-5" /> },
        { name: "refPersonId", label: "Reference Person ID", icon: <User className="w-5 h-5" /> },
        { name: "esiNumber", label: "ESI Number", icon: <CreditCard className="w-5 h-5" /> },
      ].map((f, i) => (
        <div key={i} className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <div className="text-blue-600">{f.icon}</div>
            {f.label}
          </label>
          <input
            type="text"
            name={f.name}
            value={formData[f.name]}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 bg-white"
          />
        </div>
      ))}
    </div>
  );

  const SalaryInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[
        { name: "costToCompany", label: "Cost to Company", icon: <DollarSign className="w-5 h-5" /> },
        { name: "salaryCurrency", label: "Salary Currency", icon: <DollarSign className="w-5 h-5" /> },
        { name: "salaryMode", label: "Salary Mode", icon: <CreditCard className="w-5 h-5" /> },
        { name: "payrollCostCenter", label: "Payroll Cost Center", icon: <Building className="w-5 h-5" /> },
        { name: "panNumber", label: "PAN Number", icon: <CreditCard className="w-5 h-5" /> },
        { name: "providentFundAccount", label: "Provident Fund Account", icon: <CreditCard className="w-5 h-5" /> },
        { name: "asiNumber", label: "ASI Number", icon: <CreditCard className="w-5 h-5" /> },
        { name: "uanNumber", label: "UAN Number", icon: <CreditCard className="w-5 h-5" /> },
        { name: "salaryRegisterFormat", label: "Salary Register Format", icon: <FileText className="w-5 h-5" /> },
      ].map((f, i) => (
        <div key={i} className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <div className="text-blue-600">{f.icon}</div>
            {f.label}
          </label>
          <input
            type="text"
            name={f.name}
            value={formData[f.name]}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 bg-white"
          />
        </div>
      ))}
    </div>
  );

  const ExitInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[
        { name: "resignationLetterDate", label: "Resignation Letter Date", type: "date", icon: <Calendar className="w-5 h-5" /> },
        { name: "relievingDate", label: "Relieving Date", type: "date", icon: <Calendar className="w-5 h-5" /> },
        { name: "exitInterviewDate", label: "Exit Interview Date", type: "date", icon: <Calendar className="w-5 h-5" /> },
        { name: "newWorkplace", label: "New Workplace", icon: <Building className="w-5 h-5" /> },
        { name: "leaveEncashed", label: "Leave Encashed", icon: <DollarSign className="w-5 h-5" /> },
        { name: "reasonForLeaving", label: "Reason for Leaving", icon: <FileText className="w-5 h-5" /> },
      ].map((f, i) => (
        <div key={i} className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <div className="text-blue-600">{f.icon}</div>
            {f.label}
          </label>
          <input
            type={f.type || "text"}
            name={f.name}
            value={formData[f.name]}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 bg-white"
          />
        </div>
      ))}
      <div className="md:col-span-2 space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <div className="text-blue-600"><FileText className="w-5 h-5" /></div>
          Feedback
        </label>
        <textarea
          name="feedback"
          value={formData.feedback}
          onChange={handleChange}
          rows="4"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 bg-white"
          placeholder="Enter your feedback..."
        />
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "viewOnly":
        return <ViewOnly />;
      case "mandatoryInfo":
        return <MandatoryInfo />;
      case "companyInfo":
        return <CompanyInfo />;
      case "personalInfo":
        return <PersonalInfo />;
      case "salaryInfo":
        return <SalaryInfo />;
      case "exitInfo":
        return <ExitInfo />;
      default:
        return <div className="text-center py-12 text-gray-500">Content not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Employee Profile</h1>
              <p className="text-gray-600">Manage your personal information</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-gray-50 rounded-xl p-2 mb-8">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === tab.key
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white border border-gray-100 rounded-2xl p-8">
            {renderTabContent()}
          </div>

          {/* Save Button */}
          {activeTab !== "viewOnly" && (
            <div className="flex justify-center">
              <button
                type="submit"
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Save Changes
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default EmployeeProfile;