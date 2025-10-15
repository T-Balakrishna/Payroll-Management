import React, { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import { Calendar, Users, ChevronDown, X, Search, Save, Pencil, Trash } from "lucide-react";

let token = sessionStorage.getItem("token");
let decoded = token ? jwtDecode(token) : "";
let userNumber = decoded?.userNumber;

const LeaveAllocation = () => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [filteredDesignations, setFilteredDesignations] = useState([]);
  const [employeeGrades, setEmployeeGrades] = useState([]);
  const [filteredEmployeeGrades, setFilteredEmployeeGrades] = useState([]);
  const [employeeTypes, setEmployeeTypes] = useState([]);
  const [filteredEmployeeTypes, setFilteredEmployeeTypes] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedEmps, setSelectedEmps] = useState([]);
  const [selectAllChecked, setSelectAllChecked] = useState(false);

  const [allocatedLeaves, setAllocatedLeaves] = useState({});
  const [existingLeaves, setExistingLeaves] = useState({});
  const [previousLeaves, setPreviousLeaves] = useState({});

  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startYear, setStartYear] = useState("");
  const endYear = startYear ? String(Number(startYear) + 1) : "";
  const period = startYear ? `${startYear}-${endYear}` : "";

  const [filterDept, setFilterDept] = useState("");
  const [filterDesignation, setFilterDesignation] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCompany, setFilterCompany] = useState("");

  const [bulkLeaves, setBulkLeaves] = useState("");
  const [search, setSearch] = useState("");
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);

  useEffect(() => {
    token = sessionStorage.getItem("token");
    decoded = token ? jwtDecode(token) : "";
    userNumber = decoded?.userNumber;
  }, []);

  useEffect(() => {
    axios.get("http://localhost:5000/api/leaveTypes").then(r => setLeaveTypes(r.data)).catch(() => {});
    axios.get("http://localhost:5000/api/departments").then(r => {
      setDepartments(r.data || []);
      setFilteredDepartments(r.data || []);
    }).catch(() => {
      setDepartments([]);
      setFilteredDepartments([]);
    });
  
    axios.get("http://localhost:5000/api/designations").then(r => {
      setDesignations(r.data || []);
      setFilteredDesignations(r.data || []);
    }).catch(() => {
      setDesignations([]);
      setFilteredDesignations([]);
    });
    axios.get("http://localhost:5000/api/employeeGrades").then(r => {
      setEmployeeGrades(r.data || []);
      setFilteredEmployeeGrades(r.data || []);
    }).catch(() => {
      setEmployeeGrades([]);
      setFilteredEmployeeGrades([]);
    });
    axios.get("http://localhost:5000/api/employeeTypes").then(r => {
      setEmployeeTypes(r.data || []);
      setFilteredEmployeeTypes(r.data || []);
    }).catch(() => {
      setEmployeeTypes([]);
      setFilteredEmployeeTypes([]);
    });
    axios.get("http://localhost:5000/api/companies").then(r => setCompanies(r.data || [])).catch(() => setCompanies([]));
    axios.get("http://localhost:5000/api/employees").then(r => setEmployees(r.data || [])).catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    if (filterCompany) {
      setFilteredDepartments(departments.filter(d => String(d.companyId) === String(filterCompany)));
      setFilteredDesignations(designations.filter(d => String(d.companyId) === String(filterCompany)));
      setFilteredEmployeeGrades(employeeGrades.filter(g => String(g.companyId) === String(filterCompany)));
      setFilteredEmployeeTypes(employeeTypes.filter(t => String(t.companyId) === String(filterCompany)));
      setFilterDept("");
      setFilterDesignation("");
      setFilterGrade("");
      setFilterType("");
    } else {
      setFilteredDepartments(departments);
      setFilteredDesignations(designations);
      setFilteredEmployeeGrades(employeeGrades);
      setFilteredEmployeeTypes(employeeTypes);
    }
  }, [filterCompany, departments, designations, employeeGrades, employeeTypes]);

  useEffect(() => {
    if (selectedDepts.length > 0) {
      axios.post("http://localhost:5000/api/employees/byDepartments", { departments: selectedDepts })
        .then(res => setEmployees(res.data || []))
        .catch(() => setEmployees([]));
    } else {
      axios.get("http://localhost:5000/api/employees").then(res => setEmployees(res.data || [])).catch(() => setEmployees([]));
    }
    setSelectedEmps([]);
    setAllocatedLeaves({});
    setSelectAllChecked(false);
  }, [selectedDepts]);

  useEffect(() => {
    let list = [...employees];
    if (filterDept) list = list.filter(e => String(e.departmentId) === String(filterDept));
    if (filterDesignation) list = list.filter(e => String(e.designationId) === String(filterDesignation));
    if (filterGrade) list = list.filter(e => String(e.employeeGradeId) === String(filterGrade));
    if (filterType) list = list.filter(e => String(e.employeeTypeId) === String(filterType));
    if (filterCompany) list = list.filter(e => String(e.companyId) === String(filterCompany));
    if (search) {
      list = list.filter(e => 
        e.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
        e.employeeNumber?.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFilteredEmployees(list);
  }, [employees, filterDept, filterDesignation, filterGrade, filterType, filterCompany, search]);

  const getLeaveType = () => leaveTypes.find(l => String(l.leaveTypeId) === String(leaveTypeId)) || null;

  useEffect(() => {
    if (!leaveTypeId || !startYear) {
      setExistingLeaves({});
      setPreviousLeaves({});
      return;
    }

    const lt = getLeaveType();
    if (!lt) return;

    if (lt.isCarryForward) {
      const prevPeriod = `${Number(startYear) - 1}-${Number(endYear) - 1}`;
      axios.get(`http://localhost:5000/api/leaveAllocations?leaveTypeId=${leaveTypeId}&leavePeriod=${prevPeriod}`)
        .then(res => {
          const prevMapping = {};
          (res.data || []).forEach(r => prevMapping[r.employeeNumber] = r.balance || 0);
          setPreviousLeaves(prevMapping);

          axios.get(`http://localhost:5000/api/leaveAllocations?leaveTypeId=${leaveTypeId}&leavePeriod=${period}`)
            .then(res2 => {
              const mapping = {};
              (res2.data || []).forEach(r => {
                const prev = prevMapping[r.employeeNumber] ?? 0;
                mapping[r.employeeNumber] = (r.allotedLeave || 0) - prev;
              });
              setExistingLeaves(mapping);
              setAllocatedLeaves({});
            })
            .catch(() => setExistingLeaves({}));
        })
        .catch(() => {
          setPreviousLeaves({});
          setExistingLeaves({});
        });
    } else {
      setPreviousLeaves({});
      axios.get(`http://localhost:5000/api/leaveAllocations?leaveTypeId=${leaveTypeId}&leavePeriod=${period}`)
        .then(res => {
          const mapping = {};
          (res.data || []).forEach(r => mapping[r.employeeNumber] = r.allotedLeave || 0);
          setExistingLeaves(mapping);
          setAllocatedLeaves({});
        })
        .catch(() => setExistingLeaves({}));
    }
  }, [leaveTypeId, startYear, endYear, period, leaveTypes]);

  const toggleDept = (deptId) => {
    setSelectedDepts(prev =>
      prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]
    );
  };

  const toggleEmp = (empNum) => {
    if (selectedEmps.includes(empNum)) {
      setSelectedEmps(prev => prev.filter(e => e !== empNum));
      setAllocatedLeaves(prev => {
        const c = { ...prev };
        delete c[empNum];
        return c;
      });
    } else {
      setSelectedEmps(prev => [...prev, empNum]);
      const currentAlloc = existingLeaves[empNum] ?? 0;
      setAllocatedLeaves(prev => ({ ...prev, [empNum]: currentAlloc }));
    }
  };

  const handleSelectAll = () => {
    if (selectAllChecked) {
      setSelectedEmps([]);
      setAllocatedLeaves({});
      setSelectAllChecked(false);
    } else {
      const allIds = filteredEmployees.map(e => e.employeeNumber);
      setSelectedEmps(allIds);
      const mapping = {};
      allIds.forEach(id => {
        mapping[id] = existingLeaves[id] ?? 0;
      });
      setAllocatedLeaves(mapping);
      setSelectAllChecked(true);
    }
  };

  const applyBulkLeaves = () => {
    if (!bulkLeaves) return;

    const parsed = Number(bulkLeaves);
    if (isNaN(parsed)) {
      Swal.fire({
        icon: "error",
        title: "Invalid Input",
        text: "Please enter a valid number for bulk leaves.",
      });
      return;
    }

    const lt = getLeaveType();
    if (lt?.maxAllocationPertype != null && parsed > Number(lt.maxAllocationPertype)) {
      Swal.fire({
        icon: "error",
        title: "Invalid Allocation",
        text: `Bulk allocation cannot exceed ${lt.maxAllocationPertype} for ${lt.leaveTypeName}.`,
      });
      setBulkLeaves(lt.maxAllocationPertype);
      return;
    }

    if (parsed < 0) {
      Swal.fire({
        icon: "error",
        title: "Invalid Allocation",
        text: "Bulk allocation cannot be negative.",
      });
      setBulkLeaves("");
      return;
    }

    const updated = {};
    selectedEmps.forEach(empId => updated[empId] = parsed);
    setAllocatedLeaves(prev => ({ ...prev, ...updated }));
  };

  const handleAllocatedChange = (empNum, val) => {
    const parsed = Number(val);
    if (isNaN(parsed)) {
      setAllocatedLeaves(prev => ({ ...prev, [empNum]: "" }));
      return;
    }

    const lt = getLeaveType();
    if (lt?.maxAllocationPertype != null && parsed > Number(lt.maxAllocationPertype)) {
      Swal.fire({
        icon: "error",
        title: "Invalid Allocation",
        text: `Allocation cannot exceed ${lt.maxAllocationPertype} for ${lt.leaveTypeName}.`,
      });
      setAllocatedLeaves(prev => ({ ...prev, [empNum]: Number(lt.maxAllocationPertype) }));
      return;
    }

    if (parsed < 0) {
      Swal.fire({
        icon: "error",
        title: "Invalid Allocation",
        text: "Allocation cannot be negative.",
      });
      setAllocatedLeaves(prev => ({ ...prev, [empNum]: 0 }));
      return;
    }

    setAllocatedLeaves(prev => ({ ...prev, [empNum]: parsed }));
  };

  const handleIndividualSave = async (empNum) => {
    const lt = getLeaveType();
    if (!lt || !leaveTypeId || !startYear) {
      Swal.fire({
        icon: "error",
        title: "Missing Data",
        text: "Please select a leave type and start year.",
      });
      return;
    }

    const empMap = {};
    filteredEmployees.forEach(emp => {
      empMap[emp.employeeNumber] = emp;
    });

    const emp = empMap[empNum];
    if (!emp) return;
    const companyId = emp.companyId;

    const newAlloc = Number(allocatedLeaves[empNum] ?? 0);
    const oldAlloc = Number(previousLeaves[empNum] ?? 0);

    if (lt.maxAllocationPertype != null && newAlloc > Number(lt.maxAllocationPertype)) {
      Swal.fire({
        icon: "error",
        title: "Invalid Allocation",
        text: `Allocation for ${empNum} cannot exceed ${lt.maxAllocationPertype} for ${lt.leaveTypeName}.`,
      });
      return;
    }

    if (newAlloc < 0) {
      Swal.fire({
        icon: "error",
        title: "Invalid Allocation",
        text: `Allocation for ${empNum} cannot be negative.`,
      });
      return;
    }

    const totalToStore = lt.isCarryForward ? newAlloc + oldAlloc : newAlloc;
    const exists = existingLeaves[empNum] !== undefined;

    try {
      if (exists) {
        await axios.put("http://localhost:5000/api/leaveAllocations", {
          employeeNumber: empNum,
          leaveTypeId,
          startYear,
          endYear,
          leavePeriod: period,
          allotedLeave: totalToStore,
          previousBalance: oldAlloc,
          companyId,
          updatedBy: userNumber,
        });
        Swal.fire({
          icon: "success",
          title: "Updated",
          text: `Allocation updated for ${empNum}`,
        });
      } else {
        await axios.post("http://localhost:5000/api/leaveAllocations", {
          employeeNumber: empNum,
          leaveTypeId,
          startYear,
          endYear,
          leavePeriod: period,
          allotedLeave: totalToStore,
          previousBalance: oldAlloc,
          companyId,
          createdBy: userNumber,
        });
        Swal.fire({
          icon: "success",
          title: "Added",
          text: `Allocation created for ${empNum}`,
        });
      }

      const res = await axios.get(`http://localhost:5000/api/leaveAllocations?leaveTypeId=${leaveTypeId}&leavePeriod=${period}`);
      const mapping = {};
      (res.data || []).forEach(r => {
        const prev = lt.isCarryForward ? previousLeaves[r.employeeNumber] ?? 0 : 0;
        mapping[r.employeeNumber] = (r.allotedLeave || 0) - prev;
      });
      setExistingLeaves(mapping);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to save allocation",
      });
    }
  };

  const handleSave = async () => {
    const lt = getLeaveType();
    if (!lt || !leaveTypeId || !startYear) {
      Swal.fire({
        icon: "error",
        title: "Missing Data",
        text: "Please select a leave type and start year.",
      });
      return;
    }

    const empMap = {};
    filteredEmployees.forEach(emp => {
      empMap[emp.employeeNumber] = emp;
    });

    for (let empNum of selectedEmps) {
      const emp = empMap[empNum];
      if (!emp) continue;
      const companyId = emp.companyId;

      const newAlloc = Number(allocatedLeaves[empNum] ?? 0);
      const oldAlloc = Number(previousLeaves[empNum] ?? 0);

      if (lt.maxAllocationPertype != null && newAlloc > Number(lt.maxAllocationPertype)) {
        Swal.fire({
          icon: "error",
          title: "Invalid Allocation",
          text: `Allocation for ${empNum} cannot exceed ${lt.maxAllocationPertype} for ${lt.leaveTypeName}.`,
        });
        continue;
      }

      if (newAlloc < 0) {
        Swal.fire({
          icon: "error",
          title: "Invalid Allocation",
          text: `Allocation for ${empNum} cannot be negative.`,
        });
        continue;
      }

      const totalToStore = lt.isCarryForward ? newAlloc + oldAlloc : newAlloc;
      const exists = existingLeaves[empNum] !== undefined;

      if (exists) {
        await axios.put("http://localhost:5000/api/leaveAllocations", {
          employeeNumber: empNum,
          leaveTypeId,
          startYear,
          endYear,
          leavePeriod: period,
          allotedLeave: totalToStore,
          previousBalance: oldAlloc,
          companyId,
          updatedBy: userNumber,
        });
      } else {
        await axios.post("http://localhost:5000/api/leaveAllocations", {
          employeeNumber: empNum,
          leaveTypeId,
          startYear,
          endYear,
          leavePeriod: period,
          allotedLeave: totalToStore,
          previousBalance: oldAlloc,
          companyId,
          createdBy: userNumber,
        });
      }
    }

    Swal.fire({
      icon: "success",
      title: "Success",
      text: "All allocations saved successfully!",
    });

    const res = await axios.get(`http://localhost:5000/api/leaveAllocations?leaveTypeId=${leaveTypeId}&leavePeriod=${period}`);
    const mapping = {};
    (res.data || []).forEach(r => {
      const prev = lt.isCarryForward ? previousLeaves[r.employeeNumber] ?? 0 : 0;
      mapping[r.employeeNumber] = (r.allotedLeave || 0) - prev;
    });

    setExistingLeaves(mapping);
    setAllocatedLeaves({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-3 rounded-lg">
              <Calendar className="text-indigo-600" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Leave Allocation Master</h1>
              <p className="text-slate-500 text-sm mt-1">Manage employee leave allocations</p>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Leave Type</label>
              <select 
                value={leaveTypeId} 
                onChange={e => setLeaveTypeId(e.target.value)} 
                className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none transition-colors"
              >
                <option value="">Select Leave Type</option>
                {leaveTypes.map(type => (
                  <option key={type.leaveTypeId} value={type.leaveTypeId}>
                    {type.leaveTypeName} {type.maxAllocationPertype ? `(max ${type.maxAllocationPertype})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Start Year</label>
              <input
                type="number"
                value={startYear}
                onChange={e => setStartYear(e.target.value)}
                placeholder="e.g. 2024"
                className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">End Year</label>
              <input 
                type="text" 
                value={endYear} 
                readOnly 
                className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-600"
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Filters</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <select 
              value={filterCompany} 
              onChange={e => setFilterCompany(e.target.value)} 
              className="border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none transition-colors"
            >
              <option value="">All Companies</option>
              {companies.filter(c => c.companyId !== 1).map(c => 
                <option key={c.companyId} value={c.companyId}>{c.companyName}</option>
              )}
            </select>
            
            <select 
              value={filterDept} 
              onChange={e => setFilterDept(e.target.value)} 
              className="border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none transition-colors"
            >
              <option value="">All Departments</option>
              {filteredDepartments.map(d => 
                <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>
              )}
            </select>

            <select 
              value={filterDesignation} 
              onChange={e => setFilterDesignation(e.target.value)} 
              className="border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none transition-colors"
            >
              <option value="">All Designations</option>
              {filteredDesignations.map(d => 
                <option key={d.designationId} value={d.designationId}>{d.designationAckr}</option>
              )}
            </select>

            <select 
              value={filterGrade} 
              onChange={e => setFilterGrade(e.target.value)} 
              className="border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none transition-colors"
            >
              <option value="">All Grades</option>
              {filteredEmployeeGrades.map(g => 
                <option key={g.employeeGradeId} value={g.employeeGradeId}>{g.employeeGradeAckr}</option>
              )}
            </select>

            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)} 
              className="border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none transition-colors"
            >
              <option value="">All Types</option>
              {filteredEmployeeTypes.map(t => 
                <option key={t.employeeTypeId} value={t.employeeTypeId}>{t.employeeTypeAckr}</option>
              )}
            </select>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {/* Search and Bulk Actions */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name or employee number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-400 focus:outline-none transition-colors"
                />
              </div>
              
              {selectedEmps.length > 0 && (
                <div className="flex gap-3 items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">Bulk Assign:</span>
                  <input
                    type="number"
                    value={bulkLeaves}
                    onChange={e => setBulkLeaves(e.target.value)}
                    placeholder="Leave days"
                    className="w-32 border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none bg-white"
                  />
                  <button
                    onClick={applyBulkLeaves}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
                  >
                    Apply to All
                  </button>
                </div>
              )}
            </div>

            {selectedEmps.length > 0 && (
              <div className="mt-3 text-sm text-slate-600 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100">
                <span className="font-semibold">{selectedEmps.length}</span> employee{selectedEmps.length > 1 ? 's' : ''} selected
              </div>
            )}
          </div>

          {/* Employees Table */}
          <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="p-4 text-left border-b-2 border-slate-200">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                          checked={selectAllChecked}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-200">Employee</th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-200">Dept</th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-200">Designation</th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-200">Grade</th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-200">Type</th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-200">Allocated Leave</th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-200">Prev Year</th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {[...filteredEmployees].sort((a, b) => {
                      const aSel = selectedEmps.includes(a.employeeNumber);
                      const bSel = selectedEmps.includes(b.employeeNumber);
                      return bSel - aSel;
                    }).map(emp => {
                      const empNum = emp.employeeNumber;
                      const isSelected = selectedEmps.includes(empNum);
                      const currentAlloc = allocatedLeaves[empNum] ?? existingLeaves[empNum] ?? 0;
                      const prevYear = previousLeaves[empNum] ?? 0;

                      return (
                        <tr key={empNum} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50' : ''}`}>
                          <td className="p-4">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                              checked={isSelected}
                              onChange={() => toggleEmp(empNum)}
                            />
                          </td>
                          <td className="p-4 text-slate-700 font-medium">{emp.employeeNumber}</td>
                          <td className="p-4 text-slate-600">{emp.department?.departmentName || "-"}</td>
                          <td className="p-4 text-slate-600">{emp.designation?.designationName || "-"}</td>
                          <td className="p-4 text-slate-600">{emp.grade?.gradeName || "-"}</td>
                          <td className="p-4 text-slate-600">{emp.type?.typeName || "-"}</td>
                          <td className="p-4">
                            <input
                              type="number"
                              className="w-24 border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                              value={currentAlloc}
                              onChange={(e) => handleAllocatedChange(empNum, e.target.value)}
                              disabled={!isSelected}
                            />
                            {!isSelected && currentAlloc > 0 && (
                              <span className="text-xs text-slate-500 block mt-1">
                                Current: {currentAlloc}
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-slate-600">{prevYear}</td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                onClick={() => {
                                  if (!isSelected) toggleEmp(empNum);
                                }}
                                disabled={isSelected}
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                                onClick={() => {
                                  setAllocatedLeaves(prev => {
                                    const copy = { ...prev };
                                    delete copy[empNum];
                                    return copy;
                                  });
                                  setSelectedEmps(prev => prev.filter(id => id !== empNum));
                                }}
                                title="Remove"
                              >
                                <Trash size={16} />
                              </button>
                              {isSelected && (
                                <button
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors"
                                  onClick={() => handleIndividualSave(empNum)}
                                  title="Save Individual"
                                >
                                  <Save size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredEmployees.length === 0 && (
                      <tr>
                        <td colSpan="9" className="text-center p-8 text-slate-500">
                          <div className="flex flex-col items-center gap-2">
                            <Users size={48} className="text-slate-300" />
                            <p className="font-medium">
                              {search ? "No employees found matching your search." : "No employees found."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {selectedEmps.length > 0 && (
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-slate-600">
                Ready to save allocations for {selectedEmps.length} employee{selectedEmps.length > 1 ? 's' : ''}
              </div>
              <button
                onClick={handleSave}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold shadow-sm hover:shadow transition-all flex items-center gap-2"
              >
                <Save size={20} />
                Save All Allocations
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveAllocation;