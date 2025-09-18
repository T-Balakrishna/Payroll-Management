import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Plus } from "lucide-react";

const ShiftAllocationMaster = () => {
  const [shifts, setShifts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedEmps, setSelectedEmps] = useState([]);
  const [allocatedShifts, setAllocatedShifts] = useState({});
  const [existingShifts, setExistingShifts] = useState({});
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [bulkShiftId, setBulkShiftId] = useState(""); // for bulk apply
  const userNumber = sessionStorage.getItem("userNumber");
  const dropdownRef = useRef(null);

  // Fetch shifts, departments
  useEffect(() => {
    axios.get("http://localhost:5000/api/shifts").then(res => setShifts(res.data));
    axios.get("http://localhost:5000/api/departments").then(res => setDepartments(res.data));
  }, []);

  // Fetch employees based on selected departments
  useEffect(() => {
    if (selectedDepts.length > 0) {
      axios.post("http://localhost:5000/api/employees/byDepartments", { departments: selectedDepts })
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
  }, [selectedDepts]);

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

  // Save allocations
  const handleSave = async () => {
    if (selectedEmps.length === 0) {
      alert("Please select employees");
      return;
    }
    const payload = selectedEmps.map(empId => ({
      employeeNumber: empId,
      shiftId: allocatedShifts[empId] || "",
      updatedBy: userNumber,
    })).filter(item => item.shiftId); // Only send if shift is allocated

    if (payload.length === 0) {
      alert("No valid shift allocations to save");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/shiftAllocation/allocate", { allocations: payload });
      alert("✅ Shift allocations saved successfully!");
    } catch (err) {
      console.error(err);
      alert("❌ Error saving shift allocations");
    }
  };

  const getShiftName = (shiftId) => {
    const shift = shifts.find(s => s.shiftId === shiftId);
    return shift ? shift.shiftName : "--No Shift--";
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Shift Allocation Master</h1>

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
        <h2 className="text-lg font-bold mb-2">Employees</h2>

        {/* Bulk shift dropdown */}
        {selectedEmps.length > 0 && (
          <div className="mb-4 flex gap-2 items-center">
            <select
              value={bulkShiftId}
              onChange={(e) => setBulkShiftId(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="">Select Shift for Bulk</option>
              {shifts.map(shift => (
                <option key={shift.shiftId} value={shift.shiftId}>
                  {shift.shiftName}
                </option>
              ))}
            </select>
            <button
              onClick={applyBulkShifts}
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
                        const allShifts = {};
                        employees.forEach(emp => {
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
                <th className="border p-2">Employee Name</th>
                <th className="border p-2">Employee Number</th>
                <th className="border p-2">Allocated Shift</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...employees].sort((a, b) => {
                const aSel = selectedEmps.includes(a.employeeNumber);
                const bSel = selectedEmps.includes(b.employeeNumber);
                return bSel - aSel;
              }).map(emp => {
                const isSelected = selectedEmps.includes(emp.employeeNumber);
                const currentShiftId = allocatedShifts[emp.employeeNumber] || existingShifts[emp.employeeNumber] || "";
                return (
                  <tr key={emp.employeeNumber} className="hover:bg-gray-50">
                    <td className="border p-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleEmp(emp.employeeNumber)}
                      />
                    </td>
                    <td className="border p-2">{emp.employeeName}</td>
                    <td className="border p-2">{emp.employeeNumber}</td>
                    <td className="border p-2">
                      <select
                        value={currentShiftId}
                        onChange={(e) =>
                          setAllocatedShifts((prev) => ({
                            ...prev,
                            [emp.employeeNumber]: e.target.value,
                          }))
                        }
                        disabled={!isSelected}
                        className="border rounded px-2 py-1 w-full disabled:bg-gray-100"
                      >
                        <option value="">--Select Shift--</option>
                        {shifts.map((s) => (
                          <option key={s.shiftId} value={s.shiftId}>
                            {s.shiftName}
                          </option>
                        ))}
                      </select>
                      {!isSelected && currentShiftId && (
                        <span className="text-sm text-gray-500 block mt-1">
                          Current: {getShiftName(currentShiftId)}
                        </span>
                      )}
                    </td>
                    <td className="border p-2 flex gap-2">
                      <button
                        className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded"
                        onClick={() => {
                          // Optional: toggle edit, but since always editable when selected, maybe remove or repurpose
                          if (!isSelected) toggleEmp(emp.employeeNumber);
                        }}
                        disabled={isSelected}
                      >
                        {isSelected ? "Editing" : "Edit"}
                      </button>
                      <button
                        className="bg-red-500 hover:bg-red-600 text-white p-1 rounded"
                        onClick={() => {
                          setAllocatedShifts(prev => {
                            const copy = { ...prev };
                            delete copy[emp.employeeNumber];
                            return copy;
                          });
                          setSelectedEmps(prev => prev.filter(id => id !== emp.employeeNumber));
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center p-2 text-gray-500">
                    No employees found. Select departments first.
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

export default ShiftAllocationMaster;