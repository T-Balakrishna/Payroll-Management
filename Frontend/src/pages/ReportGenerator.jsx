import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { jwtDecode } from "jwt-decode";

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
  const [biometricToEmployee, setBiometricToEmployee] = useState({});
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [departmentsLoaded, setDepartmentsLoaded] = useState(false);
  const [employeesLoaded, setEmployeesLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const dropdownRef = useRef(null);
  const dropdownContentRef = useRef(null);

  let token = sessionStorage.getItem("token");
  let decoded = (token) ? jwtDecode(token) : "";
  let userNumber = decoded.userNumber;
  const headers = { headers: { Authorization: `Bearer ${token}` } };

  // Define fields for each model with user-friendly labels
  const modelFields = {
    attendance: [
      { name: 'employeeName', label: 'Employee Name' },
      { name: 'employeeNumber', label: 'Employee Number' },
      { name: 'attendanceId', label: 'Attendance ID' },
      { name: 'attendanceDate', label: 'Date' },
      { name: 'attendanceStatus', label: 'Status' },
    ],
    punches: [
      { name: 'employeeName', label: 'Employee Name' },
      { name: 'employeeNumber', label: 'Employee Number' },
      { name: 'punchId', label: 'Punch ID' },
      { name: 'biometricNumber', label: 'Biometric Number' },
      { name: 'deviceIp', label: 'Device IP' },
      { name: 'punchTimestamp', label: 'Punch Timestamp' },
    ],
    leaves: [
      { name: 'employeeName', label: 'Employee Name' },
      { name: 'employeeNumber', label: 'Employee Number' },
      { name: 'leaveId', label: 'Leave ID' },
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
    setNumberToName({});
    setNameToNumber({});
    setNumberToDepartment({});
    setBiometricToEmployee({});
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

      async function getEmployeeData(biometricNumber) {
      try {
        const res = await axios.get(`/api/employees/by-biometric/${biometricNumber}`);
        console.log({empDept:res.departmentId,empNum:res.employeeNumber});
        return res.json({empDept:res.departmentId,empNum:res.employeeNumber}); // { employeeNumber, departmentId }
      } catch (err) {
        console.error(err);
        return null;
      }
    }

    // Example usage in a React component
    useEffect(() => {
      const fetchData = async () => {
        const empData = await getEmployeeData(punch.biometricNumber);
        console.log(empData); // { employeeNumber: "...", departmentId: ... }
      };
      fetchData();
    }, []);

  // Close dropdown when clicking outside
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
      
      // Create mappings
      const numToName = {};
      const nameToNum = {};
      const numToDept = {};
      const bioToEmp = {};
      
      processedEmployees.forEach(emp => {
        if (emp.employeeNumber && emp.employeeName) {
          numToName[emp.employeeNumber] = emp.employeeName;
          nameToNum[emp.employeeName] = emp.employeeNumber;
          numToDept[emp.employeeNumber] = Number(emp.departmentId);
        }
        // Create biometric to employee mapping for punches
        if (emp.biometricNumber) {
          bioToEmp[emp.biometricNumber] = {
            employeeNumber: emp.employeeNumber,
            employeeName: emp.employeeName,
            departmentId: Number(emp.departmentId)
          };
        }
      });
      
      setNumberToName(numToName);
      setNameToNumber(nameToNum);
      setNumberToDepartment(numToDept);
      setBiometricToEmployee(bioToEmp);
      setRetryCount(0);
      
      console.log('Employee Mappings:', { 
        numToName, 
        nameToNum, 
        numToDept, 
        bioToEmp,
        employees: processedEmployees 
      });
      
      showToast('Employees loaded successfully', 'success');
    } catch (error) {
      console.error('Error fetching employees:', error);
      const errorMessage = `Failed to load employees: ${error.message}`;
      setError(errorMessage);
      showToast(errorMessage, 'error');
      setEmployeesLoaded(false);
      
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
    setSelectedFields(['employeeName', 'employeeNumber']);
    setData([]);
    setError(null);
    setSelectedDepartments([]);
    setSelectedEmployees([]);
    setEmployeeSearch('');
    const initialReportType = model === 'punches' ? 'monthly' : (model === 'leaves' ? 'monthly' : 'all');
    setReportType(initialReportType);
    setDateFilter(new Date().toISOString().split('T')[0]);
    setMonthFilter('1');
    setYearFilter(new Date().getFullYear().toString());
    showToast(`Selected ${model} model`, 'info');
  };

  const handleFieldToggle = (fieldName) => {
    if (fieldName === 'employeeName' || fieldName === 'employeeNumber') return;
    setSelectedFields((prev) =>
      prev.includes(fieldName)
        ? prev.filter((f) => f !== fieldName)
        : [...prev, fieldName]
    );
  };

  const handleSelectAllFields = () => {
    const defaults = ['employeeName', 'employeeNumber'];
    if (selectedFields.length === modelFields[selectedModel]?.length) {
      setSelectedFields(defaults);
      showToast('Non-default fields deselected', 'info');
    } else {
      const allNonDefaults = modelFields[selectedModel].filter(field => !defaults.includes(field.name)).map(field => field.name);
      setSelectedFields([...defaults, ...allNonDefaults]);
      showToast('All fields selected', 'success');
    }
  };

  const handleSelectAllDepartments = () => {
    if (selectedDepartments.length === departments.length) {
      setSelectedDepartments([]);
      showToast('All departments deselected', 'info');
    } else {
      const deptIds = departments.map(dept => Number(dept.departmentId));
      setSelectedDepartments(deptIds);
      showToast('All departments selected', 'success');
    }
    setShowDeptDropdown(false);
  };

  const handleToggleDepartment = (id) => {
    const numId = Number(id);
    setSelectedDepartments(prev => {
      const newSelected = prev.includes(numId)
        ? prev.filter(d => d !== numId)
        : [...prev, numId];
      const deptName = departments.find(d => Number(d.departmentId) === numId)?.departmentName || 'Unknown';
      showToast(`${deptName} ${newSelected.includes(numId) ? 'selected' : 'deselected'}`, 'info');
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

      // For punches, we'll filter frontend based on biometric mapping
      if (selectedModel !== 'punches' && targetEmpNums.length > 0) {
        params.employeeNumber = targetEmpNums;
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

      // Validation for punches
      if (selectedModel === 'punches' && !params.date && !params.startDate && !params.endDate) {
        const errorMessage = 'Please select a date range (daily/monthly/yearly) for punches - "All Time" fetches too much data.';
        setError(errorMessage);
        showToast(errorMessage, 'warning');
        Swal.fire({
          title: 'Validation Error',
          text: errorMessage,
          icon: 'warning',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3085d6',
        });
        setLoading(false);
        return;
      }

      console.log('Fetching data with params:', params);

      let retryAttempts = 0;
      const maxRetries = 2;
      let response;
      
      while (retryAttempts <= maxRetries) {
        try {
          console.log(endpoint);
          response = await axios.get(endpoint, {
            params,
            ...headers,
            // timeout: 30000
          });
          break;
        } catch (fetchError) {
          if (fetchError.code === 'ECONNABORTED' || (fetchError.response?.status === 500 && retryAttempts < maxRetries)) {
            retryAttempts++;
            showToast(`Retry ${retryAttempts}/${maxRetries + 1} for slow query...`, 'warning');
            await new Promise(resolve => setTimeout(resolve, 2000 * retryAttempts));
          } else {
            throw fetchError;
          }
        }
      }

      let fetchedData = response.data;

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

      if (selectedModel === 'punches' && fetchedData.length > 10000) {
        fetchedData = fetchedData.slice(0, 10000);
        showToast('Capped at 10k records for preview - use filters for more.', 'warning');
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

      // Frontend filtering and enriching
      let filteredData = fetchedData;
      
      if (selectedModel === 'punches') {
        // Match punches with employees using biometricNumber
        filteredData = fetchedData
          .map(punch => {
            const empData = biometricToEmployee[punch.biometricNumber];
            if (!empData) {
              console.warn(`No employee found for biometric number: ${punch.biometricNumber}`);
              return null;
            }
            return {
              ...punch,
              employeeName: empData.employeeName,
              employeeNumber: empData.employeeNumber,
              departmentId: empData.departmentId
            };
          })
          .filter(punch => {
            if (!punch) return false;
            
            // const empDept = punch.biometricNumber;
            // const empNum = punch.biom;
            const {empDept,empNum} = getEmployeeData(punch.biometricNumber);
            
            // Filter by selected departments
            const inDepts = selectedDepartments.length === 0 || selectedDepartments.includes(empDept);
            // Filter by selected employees
            const inEmps = selectedEmployees.length === 0 || selectedEmployees.includes(empNum);
            
            return inDepts && inEmps;
          });
          console.log(filteredData)
      } else {
        // For other models (attendance, leaves)
        filteredData = fetchedData.filter(item => {
          const empNum = item.employeeNumber;
          const empDept = Number(numberToDepartment[empNum]);
          const inDepts = selectedDepartments.length === 0 || selectedDepartments.includes(empDept);
          const inEmps = selectedEmployees.length === 0 || selectedEmployees.includes(empNum);
          return inDepts && inEmps;
        }).map(record => ({
          ...record,
          employeeName: numberToName[record.employeeNumber] || '',
        }));
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
      const headers = selectedFields.map(fieldName => {
        const field = modelFields[selectedModel].find(f => f.name === fieldName);
        return field ? field.label : fieldName;
      });

      const rows = data.map(record => {
        const row = {};
        selectedFields.forEach(fieldName => {
          let value = record[fieldName];
          row[fieldName] = value || '';
        });
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
      const colWidths = headers.map(h => ({ wch: Math.max(10, h.length + 2) }));
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');

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

  const handleReportTypeChange = (type) => {
    setReportType(type);
    showToast(`Report type changed to ${type}`, 'info');
  };

  const handleDateChange = (e) => {
    setDateFilter(e.target.value);
  };

  const handleMonthChange = (e) => {
    setMonthFilter(e.target.value);
  };

  const handleYearChange = (e) => {
    setYearFilter(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Model Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Select Report Type
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.keys(modelFields).map(model => (
              <button
                key={model}
                onClick={() => handleModelSelect(model)}
                className={`p-6 rounded-lg border-2 transition-all transform hover:scale-105 ${
                  selectedModel === model
                    ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                }`}
              >
                <div className="text-4xl mb-3">
                  {model === 'attendance' && '📋'}
                  {model === 'punches' && '👆'}
                  {model === 'leaves' && '🍃'}
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2 capitalize">{model}</h3>
                <p className="text-gray-600 text-sm">{modelFields[model].length} fields available</p>
              </button>
            ))}
          </div>
        </div>

        {selectedModel && (
          <>
            {/* Fields Selection */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Select Fields to Include
              </h2>
              <button
                onClick={handleSelectAllFields}
                className="mb-4 px-6 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-lg hover:from-gray-200 hover:to-gray-300 font-medium transition-all shadow-sm"
              >
                {selectedFields.length > 2 ? '✓ Deselect Non-Defaults' : '☐ Select All Fields'}
              </button>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {modelFields[selectedModel].map(field => (
                  <label 
                    key={field.name} 
                    className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedFields.includes(field.name)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${(field.name === 'employeeName' || field.name === 'employeeNumber') ? 'opacity-100' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.name)}
                      onChange={() => handleFieldToggle(field.name)}
                      disabled={field.name === 'employeeName' || field.name === 'employeeNumber'}
                      className="mr-3 w-4 h-4 text-green-600"
                    />
                    <span className="font-medium text-gray-700">{field.label}</span>
                    {(field.name === 'employeeName' || field.name === 'employeeNumber') && (
                      <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Required</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
              </h2>
              
              {/* Date Filters */}
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">Time Period</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                    <select
                      value={reportType}
                      onChange={(e) => handleReportTypeChange(e.target.value)}
                      className="w-full p-2.5 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                    >
                      {selectedModel !== 'punches' && <option value="all">All Time</option>}
                      <option value="daily">📅 Daily</option>
                      <option value="monthly">📊 Monthly</option>
                      <option value="yearly">📈 Yearly</option>
                    </select>
                  </div>
                  {reportType === 'daily' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                      <input
                        type="date"
                        value={dateFilter}
                        onChange={handleDateChange}
                        className="w-full p-2.5 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                      />
                    </div>
                  )}
                  {reportType === 'monthly' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                        <select
                          value={monthFilter}
                          onChange={handleMonthChange}
                          className="w-full p-2.5 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                        >
                          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, i) => (
                            <option key={i + 1} value={(i + 1).toString()}>{month}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                        <select
                          value={yearFilter}
                          onChange={handleYearChange}
                          className="w-full p-2.5 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                      <select
                        value={yearFilter}
                        onChange={handleYearChange}
                        className="w-full p-2.5 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                      >
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return <option key={year} value={year.toString()}>{year}</option>;
                        })}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Departments Filter */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">Departments</h3>
                <div ref={dropdownRef} className="relative">
                  <button
                    onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg flex justify-between items-center hover:border-blue-500 transition-all bg-white"
                  >
                    <span className="font-medium text-gray-700">
                      {selectedDepartments.length > 0
                        ? `${selectedDepartments.length} department${selectedDepartments.length > 1 ? 's' : ''} selected`
                        : 'Select Departments (Optional)'}
                    </span>
                    <svg className={`w-5 h-5 transition-transform ${showDeptDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showDeptDropdown && (
                    <div ref={dropdownContentRef} className="absolute z-20 w-full bg-white border-2 border-blue-500 rounded-lg shadow-xl max-h-60 overflow-y-auto mt-2">
                      <button
                        onClick={handleSelectAllDepartments}
                        className="w-full p-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-left transition-all"
                      >
                        {selectedDepartments.length === departments.length ? '✓ Deselect All' : '☐ Select All Departments'}
                      </button>
                      {departmentsLoaded ? (
                        departments.map(dept => (
                          <label 
                            key={dept.departmentId} 
                            className="flex items-center p-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100"
                          >
                            <input
                              type="checkbox"
                              checked={selectedDepartments.includes(Number(dept.departmentId))}
                              onChange={() => handleToggleDepartment(dept.departmentId)}
                              className="mr-3 w-4 h-4 text-blue-600"
                            />
                            <span className="font-medium text-gray-700">{dept.departmentName}</span>
                          </label>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          Loading departments...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Employees Filter */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">Employees</h3>
                <input
                  type="text"
                  placeholder="🔍 Search employees by name or number..."
                  value={employeeSearch}
                  onChange={handleEmployeeSearchChange}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg mb-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                />
                <div className="max-h-60 overflow-y-auto border-2 border-gray-200 rounded-lg bg-white">
                  {employeesLoaded ? (
                    filteredEmployees.length > 0 ? (
                      filteredEmployees.map(emp => (
                        <label 
                          key={emp.employeeNumber} 
                          className="flex items-center p-3 hover:bg-green-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={selectedEmployees.includes(emp.employeeNumber)}
                            onChange={() => handleToggleEmployee(emp.employeeNumber)}
                            className="mr-3 w-4 h-4 text-green-600"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-800">{emp.employeeName}</div>
                            <div className="text-xs text-gray-500">ID: {emp.employeeNumber}</div>
                          </div>
                        </label>
                      ))
                    ) : (
                      <p className="p-4 text-center text-gray-500">No employees found matching your search.</p>
                    )
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
                      Loading employees...
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSelectAllEmployees}
                  className="mt-3 w-full p-3 bg-gradient-to-r from-green-100 to-emerald-100 text-gray-800 rounded-lg hover:from-green-200 hover:to-emerald-200 font-medium transition-all shadow-sm"
                  disabled={!employeesLoaded || filteredEmployees.length === 0}
                >
                  {selectedEmployees.length >= filteredEmployees.length && filteredEmployees.length > 0 ? '✓ Deselect All Visible' : '☐ Select All Visible'}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={loadPreview}
                  disabled={loading || !employeesLoaded}
                  className="flex-1 min-w-[200px] px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed font-semibold text-lg shadow-lg transform hover:scale-105 transition-all flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Loading...
                    </>
                  ) : !employeesLoaded ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Employees Loading...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Load Preview
                    </>
                  )}
                </button>
                <button
                  onClick={generateExcelReport}
                  disabled={loading || data.length === 0}
                  className="flex-1 min-w-[200px] px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed font-semibold text-lg shadow-lg transform hover:scale-105 transition-all flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generate Excel Report
                </button>
                {!employeesLoaded && (
                  <button
                    onClick={handleRetryEmployees}
                    className="px-6 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 font-semibold shadow-lg transform hover:scale-105 transition-all flex items-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Retry Load Employees
                  </button>
                )}
              </div>
            </div>

            {/* Preview Table */}
            {data.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Data Preview
                  </h2>
                  <span className="px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 rounded-lg font-semibold">
                    {data.length} records
                  </span>
                </div>
                <div className="overflow-x-auto rounded-lg border-2 border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        {selectedFields.map(fieldName => {
                          const field = modelFields[selectedModel].find(f => f.name === fieldName);
                          return (
                            <th key={fieldName} className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                              {field ? field.label : fieldName}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.slice(0, 50).map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          {selectedFields.map(fieldName => {
                            let value = record[fieldName];
                            return (
                              <td key={fieldName} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {value || <span className="text-gray-400">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.length > 50 && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 text-center border-t-2 border-gray-200">
                      <p className="text-gray-700 font-medium">
                        Showing first 50 of {data.length} records. Generate Excel to view all data.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  if (!selectedCompanyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Generator</h1>
            <p className="text-gray-600">Please select a company first to generate reports.</p>
          </div>
        </div>
      </div>
    );
  }
};

export default ReportGenerator;