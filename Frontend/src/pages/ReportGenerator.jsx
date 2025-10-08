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
  const [employees, setEmployees] = useState([]);  // Filtered employees based on selected departments
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [numberToName, setNumberToName] = useState({});
  const [nameToNumber, setNameToNumber] = useState({});
  const [numberToDepartment, setNumberToDepartment] = useState({});
  const [biometricToName, setBiometricToName] = useState({});
  const [biometricToEmpNum, setBiometricToEmpNum] = useState({});
  const [empNumToBiometric, setEmpNumToBiometric] = useState({});
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [departmentsLoaded, setDepartmentsLoaded] = useState(false);
  const [employeesLoaded, setEmployeesLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const dropdownRef = useRef(null);
  const dropdownContentRef = useRef(null);

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
    punches: [
      { name: 'punchId', label: 'Punch ID' },
      { name: 'biometricNumber', label: 'Biometric Number (Employee Name)' },
      { name: 'deviceIp', label: 'Device IP' },
      { name: 'punchTimestamp', label: 'Punch Timestamp' },
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
    setBiometricToName({});
    setBiometricToEmpNum({});
    setEmpNumToBiometric({});
  }, [selectedCompanyId]);

  // Fetch data only when selectedCompanyId is present
  useEffect(() => {
    if (selectedCompanyId) {
      fetchDepartments();
      fetchAllEmployees();
    }
  }, [selectedCompanyId]);

  // Filter employees based on selected departments
  useEffect(() => {
    let filtered = allEmployees;
    if (selectedDepartments.length > 0) {
      filtered = allEmployees.filter(emp => 
        selectedDepartments.includes(Number(emp.departmentId))
      );
      showToast(`Filtered to ${filtered.length} employees from selected departments`, 'info');
    } else if (allEmployees.length > 0) {
      showToast(`Showing all ${allEmployees.length} employees`, 'info');
    }
    setEmployees(filtered);
  }, [allEmployees, selectedDepartments]);

  useEffect(() => {
    if (allEmployees.length > 0) {
      setEmployeesLoaded(true);
    }
  }, [allEmployees]);

  // Close dropdown when clicking outside (improved with content ref)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          dropdownContentRef.current && !dropdownContentRef.current.contains(event.target)) {
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
      // Ensure departmentId is number
      data = data.map(dept => ({ ...dept, departmentId: Number(dept.departmentId) }));
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
      const biometricToName = {};
      const biometricToEmpNum = {};
      const empNumToBiometric = {};
      processedEmployees.forEach(emp => {
        if (emp.employeeNumber && emp.employeeName) {
          numToName[emp.employeeNumber] = emp.employeeName;
          nameToNum[emp.employeeName] = emp.employeeNumber;
          // Ensure departmentId is number
          numToDept[emp.employeeNumber] = Number(emp.departmentId);
        }
        if (emp.biometricNumber && emp.employeeNumber && emp.employeeName) {
          biometricToName[emp.biometricNumber] = emp.employeeName;
          biometricToEmpNum[emp.biometricNumber] = emp.employeeNumber;
          empNumToBiometric[emp.employeeNumber] = emp.biometricNumber;
        }
      });
      setNumberToName(numToName);
      setNameToNumber(nameToNum);
      setNumberToDepartment(numToDept);
      setBiometricToName(biometricToName);
      setBiometricToEmpNum(biometricToEmpNum);
      setEmpNumToBiometric(empNumToBiometric);
      setRetryCount(0);
      console.log('Employee Mappings:', { numToName, nameToNum, numToDept, biometricToName, biometricToEmpNum, empNumToBiometric, employees: processedEmployees });
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
    const initialReportType = model === 'leaves' ? 'monthly' : 'all';
    setReportType(initialReportType);
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
      const deptIds = departments.map(dept => Number(dept.departmentId));  // Ensure numbers
      setSelectedDepartments(deptIds);
      showToast('All departments selected', 'success');
    }
    setShowDeptDropdown(false);  // Close dropdown after action
  };

  const handleToggleDepartment = (id) => {
    const numId = Number(id);  // Ensure number
    setSelectedDepartments(prev => {
      const newSelected = prev.includes(numId) 
        ? prev.filter(d => d !== numId) 
        : [...prev, numId];
      const deptName = departments.find(d => Number(d.departmentId) === numId)?.departmentName || 'Unknown';
      showToast(`${deptName} ${newSelected.includes(numId) ? 'selected' : 'deselected'}`, 'info');
      return newSelected;
    });
    // Optional: close dropdown after toggle for better UX
    // setShowDeptDropdown(false);
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
      const endpoint = `http://localhost:5000/api/${selectedModel}`;
      let params = { companyId: selectedCompanyId };

      // Determine target employee numbers based on selections
      let targetEmpNums = [];
      if (selectedEmployees.length > 0) {
        targetEmpNums = selectedEmployees;
      } else if (selectedDepartments.length > 0) {
        targetEmpNums = allEmployees
          .filter(emp => selectedDepartments.includes(Number(emp.departmentId)))
          .map(emp => emp.employeeNumber);
      }

      if (selectedModel === 'punches') {
        // For punches, collect biometricNumbers from targetEmpNums
        if (targetEmpNums.length > 0) {
          const biometricNumbers = targetEmpNums
            .map(empNum => empNumToBiometric[empNum])
            .filter(bio => bio);
          if (biometricNumbers.length > 0) {
            params.biometricNumber = biometricNumbers;
          } else {
            // No biometrics for selected, treat as no data
            throw new Error('No biometric numbers found for selected employees/departments.');
          }
        }
      } else {
        // For other models, use employeeNumber
        if (targetEmpNums.length > 0) {
          params.employeeNumber = targetEmpNums;
        }
        // Add department filter if selected (as array for backend)
        if (selectedDepartments.length > 0 && targetEmpNums.length === 0) {
          params.departmentId = selectedDepartments;  // Backend can handle array
        }
      }

      // Model-specific time filters
      if (selectedModel === 'attendance' || selectedModel === 'punches') {
        if (reportType === 'daily') {
          params.date = dateFilter;
        } else if (reportType === 'monthly') {
          params.startDate = `${yearFilter}-${monthFilter.padStart(2, '0')}-01`;
          params.endDate = new Date(yearFilter, monthFilter, 0).toISOString().split('T')[0];
        } else if (reportType === 'yearly') {
          params.startDate = `${yearFilter}-01-01`;
          params.endDate = `${yearFilter}-12-31`;
        }
      } else if (selectedModel === 'leaves') {
        if (reportType === 'daily') {
          params.startDate = dateFilter;
          params.endDate = dateFilter;
        } else if (reportType === 'monthly') {
          params.month = monthFilter;
          params.year = yearFilter;
        } else if (reportType === 'yearly') {
          params.year = yearFilter;
        }
      }

      console.log('Fetching data with params:', params);
      const response = await axios.get(endpoint, { params, headers });
      let fetchedData = response.data;

      // Handle cases where data might be wrapped inside an object
      if (!Array.isArray(fetchedData)) {
        if (Array.isArray(fetchedData.data)) {
          fetchedData = fetchedData.data;
        } else if (Array.isArray(fetchedData.punches)) {
          fetchedData = fetchedData.punches;
        } else if (Array.isArray(fetchedData.newLogs)) {
          fetchedData = fetchedData.newLogs;
        } else {
          console.error("Invalid response format:", fetchedData);
          throw new Error(`${selectedModel} data is not an array`);
        }
      }
      if (fetchedData.length === 0) {
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

      // Frontend filtering as fallback (ensure numbers for comparison)
      let filteredData = fetchedData;
      if (selectedModel === 'punches') {
        filteredData = fetchedData.filter(item => {
          const bioNum = item.biometricNumber;
          const empNumFromBio = biometricToEmpNum[bioNum];
          const empNum = empNumFromBio || item.employeeNumber;
          const empDept = empNum ? Number(numberToDepartment[empNum]) : null;
          const inDepts = selectedDepartments.length === 0 || (empDept && selectedDepartments.includes(empDept));
          const inEmps = selectedEmployees.length === 0 || selectedEmployees.includes(empNum);
          return inDepts && inEmps;
        });
      } else {
        filteredData = fetchedData.filter(item => {
          const empNum = item.employeeNumber;
          const empDept = Number(numberToDepartment[empNum]);  // Ensure number
          const inDepts = selectedDepartments.length === 0 || selectedDepartments.includes(empDept);
          const inEmps = selectedEmployees.length === 0 || selectedEmployees.includes(empNum);
          return inDepts && inEmps;
        });
      }

      setData(filteredData);
      showToast(`${filteredData.length} records loaded successfully!`, 'success');
    } catch (error) {
      console.error(`Error fetching ${selectedModel} data:`, error);
      let errorMessage = '';
      
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = `${selectedModel} endpoint not found. Please check backend configuration.`;
        } else {
          errorMessage = `Failed to fetch ${selectedModel} data: ${error.response.data?.message || error.response.data || 'Server error'}.`;
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
      const errorMessage = 'No data available to export. Please load preview first.';
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

    if (selectedFields.length === 0) {
      const errorMessage = 'No fields selected for export.';
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

    try {
      // Prepare headers
      const headers = selectedFields.map(fieldName => {
        const field = modelFields[selectedModel].find(f => f.name === fieldName);
        return field ? field.label : fieldName;
      });

      // Prepare data rows, optionally replace employeeNumber or biometricNumber with name if mapping exists
      const rows = data.map(record => {
        const row = {};
        selectedFields.forEach(fieldName => {
          let value = record[fieldName];
          if (fieldName === 'employeeNumber' && numberToName[value]) {
            value = numberToName[value];  // Replace number with name
          } else if (fieldName === 'biometricNumber' && biometricToName[value]) {
            value = biometricToName[value];  // Replace biometric with name
          }
          row[fieldName] = value || '';
        });
        return row;
      });

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

      // Auto-fit columns (optional)
      const colWidths = headers.map(h => ({ wch: Math.max(10, h.length + 2) }));
      ws['!cols'] = colWidths;

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');

      // Generate filename with filters
      const now = new Date().toISOString().split('T')[0];
      let filename = `${selectedModel}_report_${now}`;
      if (reportType !== 'all') {
        filename += `_${reportType}`;
        if (reportType === 'daily') filename += `_${dateFilter}`;
        else if (reportType === 'monthly') filename += `_${monthFilter}-${yearFilter}`;
        else if (reportType === 'yearly') filename += `_${yearFilter}`;
      }
      if (selectedDepartments.length > 0) filename += '_depts';
      if (selectedEmployees.length > 0) filename += '_emps';
      filename += '.xlsx';

      // Download
      XLSX.writeFile(wb, filename);
      showToast(`Excel report "${filename}" generated successfully!`, 'success');
      Swal.fire({
        title: 'Success!',
        text: `Report exported as ${filename}`,
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
      });
    } catch (error) {
      console.error('Error generating Excel:', error);
      const errorMessage = `Failed to generate Excel: ${error.message}`;
      setError(errorMessage);
      showToast(errorMessage, 'error');
      Swal.fire({
        title: 'Error!',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  // Handle report type change
  const handleReportTypeChange = (type) => {
    setReportType(type);
    showToast(`Report type changed to ${type}`, 'info');
  };

  // Handle date change
  const handleDateChange = (e) => {
    setDateFilter(e.target.value);
  };

  // Handle month change
  const handleMonthChange = (e) => {
    setMonthFilter(e.target.value);
  };

  // Handle year change
  const handleYearChange = (e) => {
    setYearFilter(e.target.value);
  };

  if (!selectedCompanyId) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Report Generator</h1>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600">Please select a company first.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Report Generator - {selectedCompanyName}</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button onClick={() => setError(null)} className="float-right text-red-700 hover:text-red-900">×</button>
          </div>
        )}

        {/* Model Selection */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Select Model</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['attendance', 'punches', 'leaves'].map(model => (
              <button
                key={model}
                onClick={() => handleModelSelect(model)}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  selectedModel === model
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {model.charAt(0).toUpperCase() + model.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {selectedModel && (
          <>
            {/* Fields Selection */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h2 className="text-xl font-semibold mb-4">Select Fields</h2>
              <button
                onClick={handleSelectAllFields}
                className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                {selectedFields.length === modelFields[selectedModel].length ? 'Deselect All' : 'Select All'}
              </button>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                {modelFields[selectedModel].map(field => (
                  <label key={field.name} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.name)}
                      onChange={() => handleFieldToggle(field.name)}
                      className="mr-2"
                    />
                    {field.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Report Type and Date Filters */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h2 className="text-xl font-semibold mb-4">Filters</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Report Type</label>
                  <select
                    value={reportType}
                    onChange={(e) => handleReportTypeChange(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="all">All Time</option>
                    <option value="daily">Daily</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                {reportType === 'daily' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={handleDateChange}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                )}
                {reportType === 'monthly' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Month</label>
                      <select
                        value={monthFilter}
                        onChange={handleMonthChange}
                        className="w-full p-2 border rounded"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={(i + 1).toString()}>{i + 1}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Year</label>
                      <select
                        value={yearFilter}
                        onChange={handleYearChange}
                        className="w-full p-2 border rounded"
                      >
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return <option key={year} value={year.toString()}>{year}</option>;
                        })}
                      </select>
                    </div>
                  </>
                )}
                {reportType === 'yearly' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Year</label>
                    <select
                      value={yearFilter}
                      onChange={handleYearChange}
                      className="w-full p-2 border rounded"
                    >
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return <option key={year} value={year.toString()}>{year}</option>;
                      })}
                    </select>
                  </div>
                )}
              </div>

              {/* Departments Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Departments</label>
                <div ref={dropdownRef} className="relative">
                  <button
                    onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                    className="w-full p-2 border rounded flex justify-between items-center"
                  >
                    {selectedDepartments.length > 0
                      ? `${selectedDepartments.length} selected`
                      : 'Select Departments'}
                  </button>
                  {showDeptDropdown && (
                    <div ref={dropdownContentRef} className="absolute z-10 w-full bg-white border rounded shadow-lg max-h-60 overflow-y-auto mt-1">
                      <button
                        onClick={handleSelectAllDepartments}
                        className="w-full p-2 bg-gray-100 hover:bg-gray-200 text-left"
                      >
                        {selectedDepartments.length === departments.length ? 'Deselect All' : 'Select All'}
                      </button>
                      {departmentsLoaded ? (
                        departments.map(dept => (
                          <label key={dept.departmentId} className="flex items-center p-2 hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={selectedDepartments.includes(Number(dept.departmentId))}
                              onChange={() => handleToggleDepartment(dept.departmentId)}
                              className="mr-2"
                            />
                            {dept.departmentName}
                          </label>
                        ))
                      ) : (
                        <p className="p-2 text-gray-500">Loading departments...</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Employees Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Employees</label>
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={employeeSearch}
                  onChange={handleEmployeeSearchChange}
                  className="w-full p-2 border rounded mb-2"
                />
                <div className="max-h-40 overflow-y-auto border rounded">
                  {employeesLoaded ? (
                    filteredEmployees.map(emp => (
                      <label key={emp.employeeNumber} className="flex items-center p-2 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(emp.employeeNumber)}
                          onChange={() => handleToggleEmployee(emp.employeeNumber)}
                          className="mr-2"
                        />
                        {emp.employeeName} ({emp.employeeNumber})
                      </label>
                    ))
                  ) : (
                    <p className="p-2 text-gray-500">Loading employees...</p>
                  )}
                </div>
                {employeesLoaded && filteredEmployees.length === 0 && (
                  <p className="p-2 text-gray-500 text-sm">No employees found.</p>
                )}
                <button
                  onClick={handleSelectAllEmployees}
                  className="mt-2 w-full p-2 bg-gray-200 rounded hover:bg-gray-300"
                  disabled={!employeesLoaded || filteredEmployees.length === 0}
                >
                  {selectedEmployees.length >= filteredEmployees.length ? 'Deselect All Visible' : 'Select All Visible'}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white p-6 rounded-lg shadow mb-6 flex gap-4">
              <button
                onClick={loadPreview}
                disabled={loading}
                className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load Preview'}
              </button>
              <button
                onClick={generateExcelReport}
                disabled={loading || data.length === 0}
                className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                Generate Excel Report
              </button>
              {!employeesLoaded && (
                <button
                  onClick={handleRetryEmployees}
                  className="px-6 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Retry Load Employees
                </button>
              )}
            </div>

            {/* Preview Table */}
            {data.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Data Preview ({data.length} records)</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-300">
                    <thead>
                      <tr>
                        {selectedFields.map(fieldName => {
                          const field = modelFields[selectedModel].find(f => f.name === fieldName);
                          return <th key={fieldName} className="px-4 py-2 border-b bg-gray-100 font-semibold">{field ? field.label : fieldName}</th>;
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 50).map((record, index) => (
                        <tr key={index}>
                          {selectedFields.map(fieldName => {
                            let value = record[fieldName];
                            if (fieldName === 'employeeNumber' && numberToName[value]) {
                              value = numberToName[value];
                            } else if (fieldName === 'biometricNumber' && biometricToName[value]) {
                              value = biometricToName[value];
                            }
                            return <td key={fieldName} className="px-4 py-2 border-b">{value || ''}</td>;
                          })}
                        </tr>
                      ))}
                      {data.length > 50 && (
                        <tr>
                          <td colSpan={selectedFields.length} className="px-4 py-2 text-center text-gray-500">
                            Showing first 50 of {data.length} records...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportGenerator;