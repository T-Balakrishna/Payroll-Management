// LeaveAllocation.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

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

  const [allocatedLeaves, setAllocatedLeaves] = useState({});  // only current input
  const [existingLeaves, setExistingLeaves] = useState({});    // current period
  const [previousLeaves, setPreviousLeaves] = useState({});    // previous year

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

  // ---------- Initial fetch ----------
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

  // ---------- Filter dropdowns by company ----------
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

  // ---------- Fetch employees by department ----------
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

  // ---------- Filter employees ----------
  useEffect(() => {
    let list = [...employees];
    if (filterDept) list = list.filter(e => String(e.departmentId) === String(filterDept));
    if (filterDesignation) list = list.filter(e => String(e.designationId) === String(filterDesignation));
    if (filterGrade) list = list.filter(e => String(e.employeeGradeId) === String(filterGrade));
    if (filterType) list = list.filter(e => String(e.employeeTypeId) === String(filterType));
    if (filterCompany) list = list.filter(e => String(e.companyId) === String(filterCompany));
    setFilteredEmployees(list);
  }, [employees, filterDept, filterDesignation, filterGrade, filterType, filterCompany]);

  const getLeaveType = () => leaveTypes.find(l => String(l.leaveTypeId) === String(leaveTypeId)) || null;

  // ---------- Fetch existing allocations ----------
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

  // ---------- Toggle employee ----------
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

  // ---------- Select all ----------
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

  // ---------- Bulk apply ----------
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

  // ---------- Handle input change ----------
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

  // ---------- Save allocations ----------
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

    for (let empNum of selectedEmps) {
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
          createdBy: userNumber,
        });
        Swal.fire({
          icon: "success",
          title: "Added",
          text: `Allocation created for ${empNum}`,
        });
      }
    }

    const res = await axios.get(`http://localhost:5000/api/leaveAllocations?leaveTypeId=${leaveTypeId}&leavePeriod=${period}`);
    const mapping = {};
    (res.data || []).forEach(r => {
      const prev = lt.isCarryForward ? previousLeaves[r.employeeNumber] ?? 0 : 0;
      mapping[r.employeeNumber] = (r.allotedLeave || 0) - prev;
    });

    setExistingLeaves(mapping);
    setAllocatedLeaves({});
    // setSelectAllChecked(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Leave Allocation</h1>

      {/* Leave Type & Start Year */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block font-medium mb-2">Leave Type</label>
          <select value={leaveTypeId} onChange={e => setLeaveTypeId(e.target.value)} className="border rounded-lg p-2 w-full">
            <option value="">Select Leave Type</option>
            {leaveTypes.map(type => (
              <option key={type.leaveTypeId} value={type.leaveTypeId}>
                {type.leaveTypeName} {type.maxAllocationPertype ? (`max ${type.maxAllocationPertype}`) : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium mb-2">Start Year</label>
          <input
            type="number"
            value={startYear}
            onChange={e => setStartYear(e.target.value)}
            placeholder="e.g. 2024"
            className="border rounded-lg p-2 w-full"
          />
        </div>

        <div>
          <label className="block font-medium mb-2">End Year</label>
          <input type="text" value={endYear} readOnly className="border rounded-lg p-2 w-full bg-gray-50" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="border rounded p-2">
          <option value="">All Companies</option>
          {companies.filter(c => c.companyId !== 1).map(c => <option key={c.companyId} value={c.companyId}>{c.companyName}</option>)}
        </select>
        
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="border rounded p-2">
          <option value="">All Departments</option>
          {filteredDepartments.map(d => <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>)}
        </select>

        <select value={filterDesignation} onChange={e => setFilterDesignation(e.target.value)} className="border rounded p-2">
          <option value="">All Designations</option>
          {filteredDesignations.map(d => <option key={d.designationId} value={d.designationId}>{d.designationAckr}</option>)}
        </select>

        <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="border rounded p-2">
          <option value="">All Grades</option>
          {filteredEmployeeGrades.map(g => <option key={g.employeeGradeId} value={g.employeeGradeId}>{g.employeeGradeAckr}</option>)}
        </select>

        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border rounded p-2">
          <option value="">All Types</option>
          {filteredEmployeeTypes.map(t => <option key={t.employeeTypeId} value={t.employeeTypeId}>{t.employeeTypeAckr}</option>)}
        </select>
        
      </div>

      {/* Employee Table */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Employees ({filteredEmployees.length})</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={selectAllChecked} onChange={handleSelectAll} />
              Select All
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={bulkLeaves}
                onChange={e => {
                  const val = e.target.value;
                  setBulkLeaves(val);
                  // applyBulkLeaves(val);
                }}

                placeholder="Set leaves for selected"
                className="border rounded px-2 py-1 w-44"
              />
              <button onClick={applyBulkLeaves} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded">
                Apply
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border text-left">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-3">Select</th>
                <th className="py-2 px-3">Employee</th>
                <th className="py-2 px-3">Dept</th>
                <th className="py-2 px-3">Designation</th>
                <th className="py-2 px-3">Grade</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Allocated Leave</th>
                <th className="py-2 px-3">Prev Year (if carry)</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">No employees found</td>
                </tr>
              ) : (
                filteredEmployees.map(emp => {
                  const empNum = emp.employeeNumber;
                  const currentAlloc = allocatedLeaves[empNum] ?? existingLeaves[empNum] ?? 0;
                  const prevYear = previousLeaves[empNum] ?? 0;

                  return (
                    <tr key={empNum} className="border-t">
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={selectedEmps.includes(empNum)}
                          onChange={() => toggleEmp(empNum)}
                        />
                      </td>
                      <td className="py-2 px-3">{emp.employeeNumber}</td>
                      <td className="py-2 px-3">{emp.department?.departmentName || "-"}</td>
                      <td className="py-2 px-3">{emp.designation?.designationName || "-"}</td>
                      <td className="py-2 px-3">{emp.grade?.gradeName || "-"}</td>
                      <td className="py-2 px-3">{emp.type?.typeName || "-"}</td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          className="border rounded px-2 py-1 w-24"
                          value={currentAlloc}
                          onChange={(e) => handleAllocatedChange(empNum, e.target.value)}
                          disabled={!selectedEmps.includes(empNum)}
                        />
                      </td>
                      <td className="py-2 px-3 text-gray-600">{prevYear}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            Save Allocations
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveAllocation;
