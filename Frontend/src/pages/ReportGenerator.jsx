import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import {jwtDecode} from "jwt-decode";

// Enhanced Toast implementation with stacking
let toastCounter = 0;
const activeToasts = new Set();

const showToast = (message, type = 'info') => {
  const toastId = ++toastCounter;
  const toast = document.createElement('div');
  
  const position = activeToasts.size;
  const topOffset = 16 + (position * 80);
  
  toast.className = `fixed z-50 px-6 py-3 rounded-lg shadow-lg bg-white text-black transform transition-all duration-300 translate-x-full min-w-64 max-w-sm`;
  toast.style.top = `${topOffset}px`;
  toast.style.right = '16px';
  
  const iconColor = type === 'success' ? 'text-green-500' : 
                    type === 'error' ? 'text-red-500' : 
                    type === 'warning' ? 'text-yellow-500' : 'text-blue-500';
  
  const progressColor = type === 'success' ? 'bg-green-500' : 
                        type === 'error' ? 'bg-red-500' : 
                        type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';
  
  const icon = type === 'success' ? '✓' : 
               type === 'error' ? '✕' : 
               type === 'warning' ? '⚠' : 'ℹ';
  
  toast.innerHTML = `
    <div class="flex items-center">
      <span class="text-lg mr-3 ${iconColor}">${icon}</span>
      <span class="text-sm font-medium">${message}</span>
    </div>
    <div class="h-1 w-full ${progressColor} rounded-b-lg animate-progress"></div>
  `;
  
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes progress {
      from { width: 100%; }
      to { width: 0; }
    }
    .animate-progress {
      animation: progress 4s linear forwards;
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(toast);
  activeToasts.add(toastId);
  
  setTimeout(() => {
    toast.classList.remove('translate-x-full');
  }, 100);
  
  setTimeout(() => {
    removeToast(toast, toastId);
  }, 4000);
  
  toast.onclick = () => {
    removeToast(toast, toastId);
  };
  
  return toastId;
};

const removeToast = (toast, toastId) => {
  if (!activeToasts.has(toastId)) return;
  
  toast.classList.add('translate-x-full');
  activeToasts.delete(toastId);
  
  setTimeout(() => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast);
    }
    repositionToasts();
  }, 300);
};

const repositionToasts = () => {
  const remainingToasts = document.querySelectorAll('.fixed.z-50.px-6.py-3.rounded-lg.shadow-lg.bg-white.text-black');
  remainingToasts.forEach((toast, index) => {
    const newTopOffset = 16 + (index * 80);
    toast.style.top = `${newTopOffset}px`;
  });
};

const ReportGenerator = ({ userRole, selectedCompanyId, selectedCompanyName }) => {
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('all');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [monthFilter, setMonthFilter] = useState('1');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [departments, setDepartments] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [numberToName, setNumberToName] = useState({});
  const [nameToNumber, setNameToNumber] = useState({});
  const [numberToDepartment, setNumberToDepartment] = useState({});
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [departmentsLoaded, setDepartmentsLoaded] = useState(false);
  const [employeesLoaded, setEmployeesLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const dropdownRef = useRef(null);

  let token     = sessionStorage.getItem("token");
  let decoded   = (token)?jwtDecode(token):"";
  let userNumber= decoded.userNumber;
  const headers = { headers: { Authorization: `Bearer ${token}` } };

  // Define fields for each model with user-friendly labels
  const modelFields = {
    attendance: [
      { name: 'attendanceId', label: 'Attendance ID' },
      { name: 'employeeNumber', label: 'Employee Number' },
      { name: 'attendanceDate', label: 'Date' },
      { name: 'attendanceStatus', label: 'Status' },
    ],
    biometrics: [
      { name: 'biometricId', label: 'Biometric ID' },
      { name: 'biometricNumber', label: 'Biometric Number' },
      { name: 'employeeNumber', label: 'Employee Number' },
    ],
    leaves: [
      { name: 'leaveId', label: 'Leave ID' },
      { name: 'employeeNumber', label: 'Employee Number' },
      { name: 'leaveTypeId', label: 'Leave Type ID' },
      { name: 'startDate', label: 'Start Date' },
      { name: 'endDate', label: 'End Date' },
      { name: 'status', label: 'Status' },
      { name: 'reason', label: 'Reason' },
      { name: 'createdBy', label: 'Created By' },
      { name: 'updatedBy', label: 'Updated By' },
    ],
  };

  // Reset selections when company changes
  useEffect(() => {
    setSelectedDepartments([]);
    setSelectedEmployees([]);
    setSelectedFields([]);
    setData([]);
    setError(null);
    setEmployeeSearch('');
    setReportType('all');
    setDateFilter(new Date().toISOString().split('T')[0]);
    setMonthFilter('1');
    setYearFilter(new Date().getFullYear().toString());
    setShowDeptDropdown(false);
    setDepartmentsLoaded(false);
    setEmployeesLoaded(false);
    setRetryCount(0);
  }, [selectedCompanyId]);

  // Fetch data only when selectedCompanyId is present
  useEffect(() => {
    if (selectedCompanyId) {
      fetchDepartments();
      fetchAllEmployees();
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (allEmployees.length > 0) {
      setEmployees(allEmployees);
      setEmployeesLoaded(true);
    }
  }, [allEmployees]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDeptDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDepartments = async () => {
    if (!selectedCompanyId) return;
    try {
      setDepartmentsLoaded(false);
      let deptUrl = "http://localhost:5000/api/departments";
      deptUrl += `?companyId=${selectedCompanyId}`;
      const response = await axios.get(deptUrl, headers);
      let data = response.data || [];
      if (selectedCompanyId && Array.isArray(data)) {
        data = data.filter((d) => String(d.companyId) === String(selectedCompanyId));
      }
      setDepartments(data);
      setDepartmentsLoaded(true);
      showToast('Departments loaded successfully', 'success');
    } catch (error) {
      console.error('Error fetching departments:', error);
      const errorMessage = `Failed to load departments: ${error.message}`;
      setError(errorMessage);
      showToast(errorMessage, 'error');
      setDepartmentsLoaded(false);
    }
  };

  const fetchAllEmployees = async (retry = false) => {
    if (!selectedCompanyId) return;
    try {
      setEmployeesLoaded(false);
      let empUrl = "http://localhost:5000/api/employees";
      empUrl += `?companyId=${selectedCompanyId}`;
      const response = await axios.get(empUrl, headers);
      if (!Array.isArray(response.data)) {
        throw new Error('Employees data is not an array');
      }
      const processedEmployees = response.data.map(emp => ({
        ...emp,
        employeeName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
      }));
      setAllEmployees(processedEmployees);
      const numToName = {};
      const nameToNum = {};
      const numToDept = {};
      processedEmployees.forEach(emp => {
        if (emp.employeeNumber && emp.employeeName) {
          numToName[emp.employeeNumber] = emp.employeeName;
          nameToNum[emp.employeeName] = emp.employeeNumber;
          numToDept[emp.employeeNumber] = emp.departmentId;
        }
      });
      setNumberToName(numToName);
      setNameToNumber(nameToNum);
      setNumberToDepartment(numToDept);
      setEmployees(processedEmployees);
      setRetryCount(0);
      console.log('Employee Mappings:', { numToName, nameToNum, numToDept, employees: processedEmployees });
      showToast('Employees loaded successfully', 'success');
    } catch (error) {
      console.error('Error fetching employees:', error);
      const errorMessage = `Failed to load employees: ${error.message}`;
      setError(errorMessage);
      showToast(errorMessage, 'error');
      setEmployeesLoaded(false);
      // Auto-retry up to 3 times on 500
      if (error.response?.status === 500 && retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchAllEmployees(true);
          showToast(`Retrying employees fetch (${retryCount + 1}/3)...`, 'warning');
        }, 2000);
      }
      // Fallback mock data if max retries exceeded
      else if (retryCount >= 3) {
        const mockEmployees = [
          { employeeNumber: 'EMP001', firstName: 'John', lastName: 'Doe', departmentId: 1, companyId: selectedCompanyId, employeeName: 'John Doe' },
          { employeeNumber: 'EMP002', firstName: 'Jane', lastName: 'Smith', departmentId: 1, companyId: selectedCompanyId, employeeName: 'Jane Smith' },
          { employeeNumber: 'EMP003', firstName: 'Bob', lastName: 'Johnson', departmentId: 2, companyId: selectedCompanyId, employeeName: 'Bob Johnson' },
        ];
        setAllEmployees(mockEmployees);
        setEmployees(mockEmployees);
        setEmployeesLoaded(true);
        const numToName = { 'EMP001': 'John Doe', 'EMP002': 'Jane Smith', 'EMP003': 'Bob Johnson' };
        const nameToNum = { 'John Doe': 'EMP001', 'Jane Smith': 'EMP002', 'Bob Johnson': 'EMP003' };
        const numToDept = { 'EMP001': 1, 'EMP002': 1, 'EMP003': 2 };
        setNumberToName(numToName);
        setNameToNumber(nameToNum);
        setNumberToDepartment(numToDept);
        showToast('Using mock employee data (backend failed after retries)', 'warning');
      }
    }
  };

  const handleRetryEmployees = () => {
    setRetryCount(0);
    fetchAllEmployees();
  };

  const handleModelSelect = (model) => {
    setSelectedModel(model);
    setSelectedFields([]);
    setData([]);
    setError(null);
    setSelectedDepartments([]);
    setSelectedEmployees([]);
    setEmployeeSearch('');
    setReportType('all');
    setDateFilter(new Date().toISOString().split('T')[0]);
    setMonthFilter('1');
    setYearFilter(new Date().getFullYear().toString());
    showToast(`Selected ${model} model`, 'info');
  };

  const handleFieldToggle = (fieldName) => {
    setSelectedFields((prev) =>
      prev.includes(fieldName)
        ? prev.filter((f) => f !== fieldName)
        : [...prev, fieldName]
    );
  };

  const handleSelectAllFields = () => {
    if (selectedFields.length === modelFields[selectedModel]?.length) {
      setSelectedFields([]);
      showToast('All fields deselected', 'info');
    } else {
      setSelectedFields(modelFields[selectedModel].map((field) => field.name));
      showToast('All fields selected', 'success');
    }
  };

  const handleSelectAllDepartments = () => {
    if (selectedDepartments.length === departments.length) {
      setSelectedDepartments([]);
      showToast('All departments deselected', 'info');
    } else {
      setSelectedDepartments(departments.map(dept => dept.departmentId));
      showToast('All departments selected', 'success');
    }
  };

  const handleToggleDepartment = (id) => {
    setSelectedDepartments(prev => {
      const newSelected = prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id];
      showToast(`${departments.find(d => d.departmentId === id)?.departmentName} ${newSelected.includes(id) ? 'selected' : 'deselected'}`, 'info');
      return newSelected;
    });
  };

  const handleSelectAllEmployees = () => {
    const filteredEmployeeNumbers = filteredEmployees.map(emp => emp.employeeNumber);
    const isAllSelected = filteredEmployeeNumbers.every(id => selectedEmployees.includes(id));
    if (isAllSelected) {
      setSelectedEmployees(prev => prev.filter(id => !filteredEmployeeNumbers.includes(id)));
      showToast('All visible employees deselected', 'info');
    } else {
      setSelectedEmployees(prev => [...new Set([...prev, ...filteredEmployeeNumbers])]);
      showToast('All visible employees selected', 'success');
    }
  };

  const handleToggleEmployee = (id) => {
    setSelectedEmployees(prev => {
      const newSelected = prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id];
      const empName = employees.find(e => e.employeeNumber === id)?.employeeName || id;
      showToast(`${empName} ${newSelected.includes(id) ? 'selected' : 'deselected'}`, 'info');
      return newSelected;
    });
  };

  const handleEmployeeSearchChange = (e) => {
    setEmployeeSearch(e.target.value);
  };

  const filteredEmployees = employees.filter(emp => 
    emp.employeeName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.employeeNumber.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const loadPreview = async () => {
    if (!selectedModel || selectedFields.length === 0) {
      const errorMessage = 'Please select a model and at least one field.';
      setError(errorMessage);
      showToast(errorMessage, 'warning');
      Swal.fire({
        title: 'Validation Error',
        text: errorMessage,
        icon: 'warning',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    if (Object.keys(numberToName).length === 0) {
      const errorMessage = 'Employee name mappings not loaded. Please try again or check backend.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      Swal.fire({
        title: 'Error',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    setLoading(true);
    setError(null);
    setData([]);
    showToast('Loading preview...', 'info');
    
    try {
      const endpoint = `http://localhost:5000/api/${selectedModel.toLowerCase()}`;
      let params = {};

      if (reportType === 'daily' && dateFilter) {
        params.date = dateFilter;
      } else if (reportType === 'monthly') {
        const startDate = `${yearFilter}-${monthFilter.padStart(2, '0')}-01`;
        const endDate = new Date(yearFilter, monthFilter, 0).toISOString().split('T')[0];
        params.startDate = startDate;
        params.endDate = endDate;
      } else if (reportType === 'yearly') {
        params.startDate = `${yearFilter}-01-01`;
        params.endDate = `${yearFilter}-12-31`;
      }

      console.log('Fetching data with params:', params);
      const response = await axios.get(endpoint, { params, headers });
      if (!Array.isArray(response.data) || response.data.length === 0) {
        const errorMessage = `No ${selectedModel} data found for the selected filters.`;
        setError(errorMessage);
        setData([]);
        setLoading(false);
        showToast(errorMessage, 'warning');
        Swal.fire({
          title: 'No Data Found',
          text: errorMessage,
          icon: 'warning',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      const filteredData = response.data.filter(item => {
        const empNum = item.employeeNumber;
        const empDept = numberToDepartment[empNum];
        const inDepts = selectedDepartments.length === 0 || (empDept && selectedDepartments.includes(empDept));
        const inEmps = selectedEmployees.length === 0 || selectedEmployees.includes(empNum);
        return inDepts && inEmps;
      });

      setData(filteredData);
      showToast('Preview loaded successfully!', 'success');
    } catch (error) {
      console.error(`Error fetching ${selectedModel} data:`, error);
      let errorMessage = '';
      
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = `${selectedModel} endpoint not found. Please check backend configuration.`;
        } else {
          errorMessage = `Failed to fetch ${selectedModel} data: ${error.response.data.message || 'Server error'}.`;
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please ensure the backend is running on http://localhost:5000.';
      } else {
        errorMessage = `Error: ${error.message}`;
      }
      
      setError(errorMessage);
      showToast(errorMessage, 'error');
      Swal.fire({
        title: 'Error!',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateExcelReport = () => {
    if (!Array.isArray(data) || data.length === 0) {
      const errorMessage = `No data available to generate a report. Please load preview first.`;
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return;
    }

    if (Object.keys(numberToName).length === 0) {
      const errorMessage = 'Employee name mappings not available. Cannot generate report.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return;
    }

    const reportData = data.map((item) => {
      if (!item) return {};
      const empNum = item.employeeNumber ?? 'N/A';
      const empName = numberToName[empNum] || 'Unknown';
      const row = {
        'Employee Number': empNum,
        'Employee Name': empName,
      };
      selectedFields.forEach((field) => {
        if (field !== 'employeeNumber') {
          const fieldLabel = modelFields[selectedModel].find((f) => f.name === field)?.label || field;
          row[fieldLabel] = item[field] ?? 'N/A';
        }
      });
      return row;
    });

    console.log('Excel Data:', reportData);

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${selectedModel} Report`);
    const reportName = `${selectedModel}_Report_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, reportName);

    showToast('Report generated successfully!', 'success');
    Swal.fire({
      title: 'Success!',
      text: 'Report has been generated and downloaded successfully.',
      icon: 'success',
      confirmButtonText: 'OK',
      confirmButtonColor: '#3085d6',
    });
  };

  const isAllDepartmentsSelected = departments.length > 0 && selectedDepartments.length === departments.length;

  const isAllEmployeesSelected = filteredEmployees.length > 0 && filteredEmployees.every(emp => selectedEmployees.includes(emp.employeeNumber));

  if (userRole === "Super Admin" && !selectedCompanyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Report Generator</h1>
          <p className="text-gray-500">Please select a company to generate reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Report Generator{selectedCompanyName ? ` - ${selectedCompanyName}` : ""}</h1>
              <p className="mt-1 text-sm text-gray-600">Generate comprehensive reports for attendance, biometrics, and leaves</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-green-400"></div>
              <span className="text-sm text-gray-500">System Online</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Model Selection Cards */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Data Model</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['attendance', 'biometrics', 'leaves'].map((model) => (
              <div
                key={model}
                className={`relative group cursor-pointer transform transition-all duration-200 hover:scale-105 ${
                  selectedModel === model ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleModelSelect(model)}
              >
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      selectedModel === model ? 'bg-blue-500' : 'bg-gray-300 group-hover:bg-blue-400'
                    }`}>
                      {model.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{model.charAt(0).toUpperCase() + model.slice(1)}</h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                    {model === 'attendance' && 'Track employee attendance records and status.'}
                    {model === 'biometrics' && 'Manage biometric authentication data.'}
                    {model === 'leaves' && 'Handle leave requests and approvals.'}
                  </p>
                  {selectedModel === model && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedModel && (
          <>
            {/* Field Selection */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Fields</h2>
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Available Fields</h3>
                  <button
                    onClick={handleSelectAllFields}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    {selectedFields.length === modelFields[selectedModel]?.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                  {modelFields[selectedModel]?.map((field) => (
                    <label key={field.name} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field.name)}
                        onChange={() => handleFieldToggle(field.name)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Filters Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Report Type & Date Filters */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Report Filters</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                    <select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Records</option>
                      <option value="daily">Daily</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                  {reportType === 'daily' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                      <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {reportType === 'monthly' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                        <select
                          value={monthFilter}
                          onChange={(e) => setMonthFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                        <select
                          value={yearFilter}
                          onChange={(e) => setYearFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {Array.from({ length: 10 }, (_, i) => {
                            const year = new Date().getFullYear() - i;
                            return <option key={year} value={year}>{year}</option>;
                          })}
                        </select>
                      </div>
                    </>
                  )}

                  {reportType === 'yearly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                      <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return <option key={year} value={year}>{year}</option>;
                        })}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Department Selection */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Departments {departmentsLoaded ? `(${departments.length})` : '(Loading...)'} </h3>
                <div className="relative">
                  <button
                    onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                    ref={dropdownRef}
                    disabled={!departmentsLoaded}
                    className="w-full flex justify-between items-center px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <span>{selectedDepartments.length === 0 ? 'All Departments' : `${selectedDepartments.length} selected`}</span>
                    <svg className={`w-4 h-4 transition-transform ${showDeptDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showDeptDropdown && departmentsLoaded && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-y-auto z-10">
                      <div className="p-2">
                        <button
                          onClick={handleSelectAllDepartments}
                          className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 rounded"
                        >
                          {isAllDepartmentsSelected ? 'Deselect All' : 'Select All'}
                        </button>
                        {departments.length === 0 ? (
                          <p className="text-gray-500 text-sm p-2 text-center">No departments available.</p>
                        ) : (
                          departments.map((dept) => (
                            <label key={dept.departmentId} className="flex items-center space-x-2 p-2 cursor-pointer hover:bg-gray-50 rounded">
                              <input
                                type="checkbox"
                                checked={selectedDepartments.includes(dept.departmentId)}
                                onChange={() => handleToggleDepartment(dept.departmentId)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{dept.departmentName}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  {!departmentsLoaded && (
                    <p className="text-gray-500 text-sm p-2 text-center">Loading departments...</p>
                  )}
                </div>
                {error && (
                  <button
                    onClick={fetchDepartments}
                    className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                  >
                    Retry Departments
                  </button>
                )}
              </div>
            </div>

            {/* Employee Selection */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Employees {employeesLoaded ? `(${employees.length})` : '(Loading...)'} </h3>
              <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex gap-4 mb-4">
                    <input
                      type="text"
                      placeholder="Search employees by name or number..."
                      value={employeeSearch}
                      onChange={handleEmployeeSearchChange}
                      disabled={!employeesLoaded}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                    <button
                      onClick={handleSelectAllEmployees}
                      disabled={!employeesLoaded || filteredEmployees.length === 0}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400"
                    >
                      {isAllEmployeesSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {!employeesLoaded ? (
                      <p className="text-gray-500 text-sm p-2 text-center">Loading employees...</p>
                    ) : filteredEmployees.length === 0 ? (
                      <p className="text-gray-500 text-sm p-2 text-center">
                        {employees.length === 0 ? 'No employees found. Check backend.' : 'No matching employees.'}
                      </p>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <label key={emp.employeeNumber} className="flex items-center space-x-2 p-2 cursor-pointer hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            checked={selectedEmployees.includes(emp.employeeNumber)}
                            onChange={() => handleToggleEmployee(emp.employeeNumber)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {emp.employeeName} ({emp.employeeNumber})
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  {error && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-red-600">Employees fetch failed: {error}</span>
                      <button
                        onClick={handleRetryEmployees}
                        className="px-4 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Load Preview Button */}
            <div className="flex justify-center mb-8">
              <button
                onClick={loadPreview}
                disabled={loading || !employeesLoaded || !departmentsLoaded}
                className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 transition-colors font-medium"
              >
                {loading ? 'Loading...' : 'Load Preview'}
              </button>
            </div>

            {/* Error Display */}
            {error && !employeesLoaded && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Data Preview Table */}
            {data.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 mb-8">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Data Preview ({data.length} records)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
                        {selectedFields.map((field) => {
                          const fieldInfo = modelFields[selectedModel].find((f) => f.name === field);
                          if (!fieldInfo || field === 'employeeNumber') return null;
                          return (
                            <th key={field} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {fieldInfo.label}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.slice(0, 50).map((item, index) => { // Limit to 50 for preview
                        const empNum = item.employeeNumber ?? 'N/A';
                        const empName = numberToName[empNum] || 'Unknown';
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{empNum}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{empName}</td>
                            {selectedFields.map((field) => {
                              const fieldInfo = modelFields[selectedModel].find((f) => f.name === field);
                              if (!fieldInfo || field === 'employeeNumber') return null;
                              return (
                                <td key={field} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {item[field] ?? 'N/A'}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                      {data.length > 50 && (
                        <tr>
                          <td colSpan={selectedFields.length + 2} className="px-6 py-4 text-center text-sm text-gray-500">
                            Showing first 50 records. Full data will be in the report.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Generate Report Button */}
            {data.length > 0 && (
              <div className="flex justify-center">
                <button
                  onClick={generateExcelReport}
                  className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Generate Excel Report
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportGenerator;