import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Plus, Pencil, Trash, Save, Search, Users, Calendar, ChevronDown, X } from "lucide-react";
import {jwtDecode} from "jwt-decode";
import Swal from 'sweetalert2'

let token     = sessionStorage.getItem("token");
let decoded   = (token)?jwtDecode(token):"";
let userNumber= decoded.userNumber;

const ShiftAllocationMaster = ({ userRole, selectedCompanyId, selectedCompanyName }) => {
  const [shifts, setShifts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedEmps, setSelectedEmps] = useState([]);
  const [allocatedShifts, setAllocatedShifts] = useState({});
  const [existingShifts, setExistingShifts] = useState({});
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [bulkShiftId, setBulkShiftId] = useState(""); // for bulk apply
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  const headers = { headers: { Authorization: `Bearer ${token}` } };

  // Reset selections when company changes
  useEffect(() => {
    setSelectedDepts([]);
    setSelectedEmps([]);
    setAllocatedShifts({});
    setExistingShifts({});
    setEmployees([]);
    setBulkShiftId("");
    setSearch("");
  }, [selectedCompanyId]);

  // Fetch shifts, departments
  useEffect(() => {
    axios.get("http://localhost:5000/api/shifts", headers).then(res => setShifts(res.data));
    let deptUrl = "http://localhost:5000/api/departments";
    if (selectedCompanyId) deptUrl += `?companyId=${selectedCompanyId}`;
    axios.get(deptUrl, headers).then(res => {
      let data = res.data || [];
      if (selectedCompanyId && Array.isArray(data)) {
        data = data.filter((d) => String(d.companyId) === String(selectedCompanyId));
      }
      setDepartments(data);
    });
  }, [selectedCompanyId]);

  // Fetch employees based on selected departments
  useEffect(() => {
    if (selectedDepts.length > 0) {
      const payload = { departments: selectedDepts, active: true };
      if (selectedCompanyId) {
        payload.companyId = selectedCompanyId;
      }
      axios.post("http://localhost:5000/api/employees/byDepartments", payload, headers)
        .then(res => {
          setEmployees(res.data);
          // Set existing shifts
          const mapping = {};
          res.data.forEach(e => {
            mapping[e.employeeNumber] = e.shiftId || "";
          });
          setExistingShifts(mapping);
        });
    } else { 
      setEmployees([]);
      setExistingShifts({});
    }
    setSelectedEmps([]);
    setAllocatedShifts({});
  }, [selectedDepts, selectedCompanyId]);

  const toggleDept = (deptId) => {
    setSelectedDepts(prev =>
      prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]
    );
  };

  const toggleEmp = (empId) => {
    if (selectedEmps.includes(empId)) {
      setSelectedEmps(prev => prev.filter(id => id !== empId));
      setAllocatedShifts(prev => {
        const copy = { ...prev };
        delete copy[empId];
        return copy;
      });
    } else {
      setSelectedEmps(prev => [...prev, empId]);
      setAllocatedShifts(prev => ({ ...prev, [empId]: existingShifts[empId] || "" }));
    }
  };

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

  // Apply bulk shift to all selected employees
  const applyBulkShifts = () => {
    if (!bulkShiftId) return;
    const updated = {};
    selectedEmps.forEach(empId => {
      updated[empId] = bulkShiftId;
    });
    setAllocatedShifts(prev => ({ ...prev, ...updated }));
  };

  // Individual save for a single employee
  const handleIndividualSave = async (empId) => {
    if (userRole === "Super Admin" && !selectedCompanyId) {
      Swal.fire({
        icon: "warning",
        title: "Please select a company first",
      });
      return;
    }
    const shiftId = allocatedShifts[empId];
    if (!shiftId) {
      Swal.fire({
        icon: "warning",
        title: "No shift allocated for this employee",
      });
      return;
    }
    const payload = [{
      employeeNumber: empId,
      shiftId,
      updatedBy: userNumber,
    }];

    try {
      await axios.post("http://localhost:5000/api/shiftAllocation/allocate", { allocations: payload }, headers);
      // Update existing shifts to reflect the change
      setExistingShifts(prev => ({ ...prev, [empId]: shiftId }));
      Swal.fire({
        icon: "success",
        title: "Shift allocated successfully!",
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error saving shift allocation",
      });
    }
  };

  // Save allocations (bulk/global)
  const handleSave = async () => {
    if (userRole === "Super Admin" && !selectedCompanyId) {
      Swal.fire({
        icon: "warning",
        title: "Please select a company first",
      });
      return;
    }
    if (selectedEmps.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Please select employees",
      });
      return;
    }
    const payload = selectedEmps.map(empId => ({
      employeeNumber: empId,
      shiftId: allocatedShifts[empId] || "",
      updatedBy: userNumber,
    })).filter(item => item.shiftId); // Only send if shift is allocated

    if (payload.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No valid shift allocations to save",
      });
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/shiftAllocation/allocate", { allocations: payload }, headers);
      // Update existing shifts for all
      const updatedExisting = { ...existingShifts };
      payload.forEach(item => {
        updatedExisting[item.employeeNumber] = item.shiftId;
      });
      setExistingShifts(updatedExisting);
      Swal.fire({
        icon: "success",
        title: "Shift allocations saved successfully!",
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error saving shift allocations",
      });
    }
  };

  const getShiftName = (shiftId) => {
    const shift = shifts.find(s => s.shiftId === shiftId);
    return shift ? shift.shiftName : "--No Shift--";
  };

  const filteredEmployees = employees.filter(emp =>
    emp.employeeName?.toLowerCase().includes(search.trim().toLowerCase()) ||
    emp.employeeNumber?.toLowerCase().includes(search.trim().toLowerCase())
  );

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
              <h1 className="text-3xl font-bold text-slate-800">Shift Allocation Master</h1>
              <p className="text-slate-500 text-sm mt-1">
                {selectedCompanyName ? selectedCompanyName : "All Companies"}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {/* Departments Selection */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <Users size={18} />
              Select Departments
            </label>
            <div className="relative" ref={dropdownRef}>
              <button
                className="w-full bg-white border-2 border-slate-200 rounded-lg p-3 cursor-pointer flex justify-between items-center hover:border-indigo-400 transition-colors"
                onClick={() => setShowDeptDropdown(prev => !prev)}
              >
                <span className="text-slate-700 font-medium">
                  {selectedDepts.length > 0 
                    ? `${selectedDepts.length} department${selectedDepts.length > 1 ? 's' : ''} selected` 
                    : "Choose departments to view employees"}
                </span>
                <ChevronDown className={`text-slate-400 transition-transform ${showDeptDropdown ? 'rotate-180' : ''}`} size={20} />
              </button>

              {showDeptDropdown && (
                <div className="absolute bg-white border-2 border-slate-200 rounded-lg mt-2 w-full max-h-64 overflow-y-auto z-20 shadow-xl">
                  <div className="sticky top-0 bg-slate-50 p-3 border-b-2 border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                        checked={selectedDepts.length === departments.length && departments.length > 0}
                        onChange={() =>
                          setSelectedDepts(
                            selectedDepts.length === departments.length
                              ? []
                              : departments.map(d => d.departmentId)
                          )
                        }
                      />
                      <span className="font-semibold text-slate-700">Select All Departments</span>
                    </label>
                  </div>
                  {departments.map(dept => (
                    <div key={dept.departmentId} className="p-3 hover:bg-slate-50 transition-colors">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                          checked={selectedDepts.includes(dept.departmentId)}
                          onChange={() => toggleDept(dept.departmentId)}
                        />
                        <span className="text-slate-700">{dept.departmentName}</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedDepts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedDepts.map(deptId => {
                  const dept = departments.find(d => d.departmentId === deptId);
                  return (
                    <span key={deptId} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
                      {dept?.departmentName}
                      <button onClick={() => toggleDept(deptId)} className="hover:bg-indigo-200 rounded-full p-0.5">
                        <X size={14} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

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
                  <select
                    value={bulkShiftId}
                    onChange={(e) => setBulkShiftId(e.target.value)}
                    className="border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none bg-white"
                  >
                    <option value="">Select Shift</option>
                    {shifts.map(shift => (
                      <option key={shift.shiftId} value={shift.shiftId}>
                        {shift.shiftName}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={applyBulkShifts}
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
                          checked={selectedEmps.length === filteredEmployees.length && filteredEmployees.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEmps(filteredEmployees.map(emp => emp.employeeNumber));
                              const allShifts = {};
                              filteredEmployees.forEach(emp => {
                                allShifts[emp.employeeNumber] = existingShifts[emp.employeeNumber] || "";
                              });
                              setAllocatedShifts(allShifts);
                            } else {
                              setSelectedEmps([]);
                              setAllocatedShifts({});
                            }
                          }}
                        />
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-200">Employee Name</th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-200">Employee Number</th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-200">Allocated Shift</th>
                      <th className="p-4 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {[...filteredEmployees].sort((a, b) => {
                      const aSel = selectedEmps.includes(a.employeeNumber);
                      const bSel = selectedEmps.includes(b.employeeNumber);
                      return bSel - aSel;
                    }).map(emp => {
                      const isSelected = selectedEmps.includes(emp.employeeNumber);
                      const currentShiftId = allocatedShifts[emp.employeeNumber] || existingShifts[emp.employeeNumber] || "";
                      return (
                        <tr key={emp.employeeNumber} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50' : ''}`}>
                          <td className="p-4">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                              checked={isSelected}
                              onChange={() => toggleEmp(emp.employeeNumber)}
                            />
                          </td>
                          <td className="p-4 text-slate-700 font-medium">{emp.employeeName}</td>
                          <td className="p-4 text-slate-600">{emp.employeeNumber}</td>
                          <td className="p-4">
                            <select
                              value={currentShiftId}
                              onChange={(e) =>
                                setAllocatedShifts((prev) => ({
                                  ...prev,
                                  [emp.employeeNumber]: e.target.value,
                                }))
                              }
                              disabled={!isSelected}
                              className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                            >
                              <option value="">--Select Shift--</option>
                              {shifts.map((s) => (
                                <option key={s.shiftId} value={s.shiftId}>
                                  {s.shiftName}
                                </option>
                              ))}
                            </select>
                            {!isSelected && currentShiftId && (
                              <span className="text-xs text-slate-500 block mt-1">
                                Current: {getShiftName(currentShiftId)}
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                onClick={() => {
                                  if (!isSelected) toggleEmp(emp.employeeNumber);
                                }}
                                disabled={isSelected}
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                                onClick={() => {
                                  setAllocatedShifts(prev => {
                                    const copy = { ...prev };
                                    delete copy[emp.employeeNumber];
                                    return copy;
                                  });
                                  setSelectedEmps(prev => prev.filter(id => id !== emp.employeeNumber));
                                }}
                                title="Remove"
                              >
                                <Trash size={16} />
                              </button>
                              {isSelected && currentShiftId && (
                                <button
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors"
                                  onClick={() => handleIndividualSave(emp.employeeNumber)}
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
                        <td colSpan="5" className="text-center p-8 text-slate-500">
                          <div className="flex flex-col items-center gap-2">
                            <Users size={48} className="text-slate-300" />
                            <p className="font-medium">
                              {search ? "No employees found matching your search." : "No employees found. Please select departments first."}
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

export default ShiftAllocationMaster;