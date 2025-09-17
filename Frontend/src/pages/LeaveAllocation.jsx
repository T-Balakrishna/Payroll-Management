import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Plus } from "lucide-react";

const LeaveAllocation = () => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidayPlans, setHolidayPlans] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedEmps, setSelectedEmps] = useState([]);
  const [allocatedLeaves, setAllocatedLeaves] = useState({});
  const [existingLeaves, setExistingLeaves] = useState({});
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [leavePeriod, setLeavePeriod] = useState("");
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [bulkLeaves, setBulkLeaves] = useState(""); // new state for bulk apply
  const userNumber = sessionStorage.getItem("userNumber");
  const dropdownRef = useRef(null);

  // Fetch leave types, holiday plans, departments
  useEffect(() => {
    axios.get("http://localhost:5000/api/leaveTypes").then(res => setLeaveTypes(res.data));
    axios.get("http://localhost:5000/api/holidayPlans").then(res => setHolidayPlans(res.data));
    axios.get("http://localhost:5000/api/departments").then(res => setDepartments(res.data));
  }, []);

  // Fetch employees based on selected departments
  useEffect(() => {
    if (selectedDepts.length > 0) {
      axios.post("http://localhost:5000/api/employees/byDepartments", { departments: selectedDepts })
        .then(res => setEmployees(res.data));
    } else { 
      setEmployees([]);
    }
    setSelectedEmps([]);
    setAllocatedLeaves({});
  }, [selectedDepts]);

  // Fetch existing allocated leaves for the selected leave type
  useEffect(() => {
    if (leaveTypeId && leavePeriod) {
      axios.get(`http://localhost:5000/api/leaveAllocations?leaveTypeId=${leaveTypeId}&leavePeriod=${leavePeriod}`)
        .then(res => {
          const mapping = {};
          res.data.forEach(e => {
            mapping[e.employeeNumber] = e.allotedLeave; // make sure key matches your backend
          });
          setExistingLeaves(mapping);
        });
    } else {
      setExistingLeaves({});
    }
  }, [leaveTypeId, leavePeriod]);


  const toggleDept = (deptId) => {
    setSelectedDepts(prev =>
      prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]
    );
  };

  const toggleEmp = (empId) => {
    if (selectedEmps.includes(empId)) {
      setSelectedEmps(prev => prev.filter(id => id !== empId));
      setAllocatedLeaves(prev => {
        const copy = { ...prev };
        delete copy[empId];
        return copy;
      });
    } else {
      setSelectedEmps(prev => [...prev, empId]);
      setAllocatedLeaves(prev => ({ ...prev, [empId]: existingLeaves[empId] || 1 }));
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

  // Apply bulk leaves to all selected employees
  const applyBulkLeaves = () => {
    if (!bulkLeaves) return;
    const updated = {};
    selectedEmps.forEach(empId => {
      updated[empId] = Number(bulkLeaves);
    });
    setAllocatedLeaves(prev => ({ ...prev, ...updated }));
  };

  // Save allocations
  const handleSave = async () => {
    if (!leaveTypeId || !leavePeriod) {
      alert("Please select Leave Type and Period");
      return;
    }
    const payload = selectedEmps.map(empId => ({
      employeeNumber: empId,
      leaveTypeId,
      leavePeriod,
      allotedLeave: allocatedLeaves[empId] || 0,
      createdBy: userNumber,
    }));

    try {
      await axios.post("http://localhost:5000/api/leaveAllocations", payload);
      alert("✅ Leave allocations saved successfully!");
    } catch (err) {
      console.error(err);
      alert("❌ Error saving leave allocations");
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Leave Allocation</h1>

      {/* Leave Type */}
      <div>
        <label className="block font-medium mb-2">Leave Type</label>
        <select
          value={leaveTypeId}
          onChange={(e) => setLeaveTypeId(e.target.value)}
          className="border rounded-lg p-2 w-full"
        >
          <option value="">Select Leave Type</option>
          {leaveTypes.map(type => (
            <option key={type.leaveTypeId} value={type.leaveTypeId}>
              {type.leaveTypeName}
            </option>
          ))}
        </select>
      </div>

      {/* Holiday Plan */}
      <div>
        <label className="block font-medium mb-2">Leave Period</label>
        <select
          value={leavePeriod}
          onChange={(e) => setLeavePeriod(e.target.value)}
          className="border rounded-lg p-2 w-full"
        >
          <option value="">Select Holiday Plan</option>
          {holidayPlans.map(plan => (
            <option key={plan.holidayPlanId} value={plan.holidayPlanId}>
              {plan.holidayPlanName}
            </option>
          ))}
        </select>
      </div>

      {/* Departments Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <label className="block font-medium mb-2">Departments</label>
        <div
          className="border rounded-lg p-2 cursor-pointer flex justify-between items-center"
          onClick={() => setShowDeptDropdown(prev => !prev)}
        >
          <span>{selectedDepts.length > 0 ? `${selectedDepts.length} selected` : "Select Departments"}</span>
          <Plus size={18} />
        </div>

        {showDeptDropdown && (
          <div className="absolute bg-white border rounded-lg mt-1 w-full max-h-40 overflow-y-auto z-20 shadow-lg">
            <div className="p-2 border-b">
              <input
                type="checkbox"
                checked={selectedDepts.length === departments.length && departments.length > 0}
                onChange={() =>
                  setSelectedDepts(
                    selectedDepts.length === departments.length
                      ? []
                      : departments.map(d => d.departmentId)
                  )
                }
              />
              <span className="ml-2 font-medium">Select All</span>
            </div>
            {departments.map(dept => (
              <div key={dept.departmentId} className="p-2">
                <input
                  type="checkbox"
                  checked={selectedDepts.includes(dept.departmentId)}
                  onChange={() => toggleDept(dept.departmentId)}
                />
                <span className="ml-2">{dept.departmentName}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Employees Table */}
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-bold mb-2">Selected Employees</h2>

        {/* Bulk leaves input */}
        {selectedEmps.length > 0 && (
          <div className="mb-4 flex gap-2 items-center">
            <input
              type="number"
              value={bulkLeaves}
              onChange={(e) => setBulkLeaves(e.target.value)}
              placeholder="Set leaves for all"
              className="border rounded px-2 py-1 w-40"
            />
            <button
              onClick={applyBulkLeaves}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded"
            >
              Apply to All
            </button>
          </div>
        )}

        <div className="max-h-60 overflow-y-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">
                  <input
                    type="checkbox"
                    checked={selectedEmps.length === employees.length && employees.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEmps(employees.map(emp => emp.employeeNumber));
                        const allLeaves = {};
                        employees.forEach(emp => {
                          allLeaves[emp.employeeNumber] = existingLeaves[emp.employeeNumber] || 1;
                        });
                        setAllocatedLeaves(allLeaves);
                      } else {
                        setSelectedEmps([]);
                        setAllocatedLeaves({});
                      }
                    }}
                  />
                </th>
                <th className="border p-2">Employee Name</th>
                <th className="border p-2">Employee Number</th>
                <th className="border p-2">Allocated Leaves</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...employees].sort((a, b) => {
                const aSel = selectedEmps.includes(a.employeeNumber);
                const bSel = selectedEmps.includes(b.employeeNumber);
                return bSel - aSel;
              }).map(emp => (
                <tr key={emp.employeeNumber} className="hover:bg-gray-50">
                  <td className="border p-2">
                    <input
                      type="checkbox"
                      checked={selectedEmps.includes(emp.employeeNumber)}
                      onChange={() => toggleEmp(emp.employeeNumber)}
                    />
                  </td>
                  <td className="border p-2">{emp.employeeName}</td>
                  <td className="border p-2">{emp.employeeNumber}</td>
                  <td className="border p-2">
                    <input
                        type="number"
                        className="border rounded px-2 py-1 w-20"
                        value={allocatedLeaves[emp.employeeNumber] ?? existingLeaves[emp.employeeNumber] ?? ""}
                        onChange={(e) =>
                          setAllocatedLeaves((prev) => ({
                            ...prev,
                            [emp.employeeNumber]: Number(e.target.value),
                          }))
                        }
                        disabled={!selectedEmps.includes(emp.employeeNumber)}
                        placeholder={
                          existingLeaves[emp.employeeNumber]
                            ? `Already ${existingLeaves[emp.employeeNumber]}`
                            : ""
                        }
                      />

                  </td>
                  <td className="border p-2 flex gap-2">
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded"
                      onClick={() => {
                        const leaves = allocatedLeaves[emp.employeeNumber] || 1;
                        setAllocatedLeaves(prev => ({ ...prev, [emp.employeeNumber]: leaves }));
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="bg-red-500 hover:bg-red-600 text-white p-1 rounded"
                      onClick={() => {
                        setAllocatedLeaves(prev => {
                          const copy = { ...prev };
                          delete copy[emp.employeeNumber];
                          return copy;
                        });
                        setSelectedEmps(prev => prev.filter(id => id !== emp.employeeNumber));
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center p-2 text-gray-500">
                    No employees selected
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Button */}
      {selectedEmps.length > 0 && (
        <button
          onClick={handleSave}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded"
        >
          Save Allocations
        </button>
      )}
    </div>
  );
};

export default LeaveAllocation;
