import React, { useEffect, useState } from "react";
import axios from "axios";


const LeaveAllocation = () => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidayPlans, setHolidayPlans] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedEmps, setSelectedEmps] = useState([]);
  const [leaveTypeId, setLeaveTypeId] = useState("");

  // Fetch leaveTypes, holidayPlans, departments
  useEffect(() => {
  axios.get("http://localhost:5000/api/leaveTypes").then(res => {
    setLeaveTypes(Array.isArray(res.data) ? res.data : res.data.data || []);
  });

  axios.get("http://localhost:5000/api/holidayPlans").then(res => {
    setHolidayPlans(Array.isArray(res.data) ? res.data : res.data.data || []);
  });

  axios.get("http://localhost:5000/api/departments").then(res => {
    setDepartments(Array.isArray(res.data) ? res.data : res.data.data || []);
  });
}, []);


  // Fetch employees based on selected departments
  useEffect(() => {
    if (selectedDepts.length > 0) {
      axios.post("http://localhost:5000/api/employees/byDepartments", { departments: selectedDepts })
        .then(res => setEmployees(res.data));
    } else {
      setEmployees([]);
    }
  }, [selectedDepts]);

  // Toggle department selection
  const toggleDept = (deptId) => {
    setSelectedDepts(prev =>
      prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]
    );
  };

  // Toggle employee selection
  const toggleEmp = (empId) => {
    setSelectedEmps(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Leave Assignment</h1>

      {/* LeaveTypeId */}
      <div>
        <label className="block font-medium">Leave Type</label>
        {/* <p>{leaveTypes}</p> */}
        <select
          value={leaveTypeId}
          onChange={(e) => setLeaveTypeId(e.target.value)}
          className="border rounded p-2 w-full"
        >
          <option value="">Select Leave Type</option>
          {leaveTypes.map(type => (
            <option key={type.leaveTypeId} value={type.leaveTypeId}>
              {type.leaveTypeName}
            </option>
          ))}
        </select>
      </div>

      {/* Leave Period */}
      <div>
        <button onClick={()=>{
          console.log(holidayPlans);
          
        }}>  show </button>
        <label className="block font-medium">Leave Period</label>
        <select className="border rounded p-2 w-full">
          <option value="">Select Holiday Plan</option>
          {holidayPlans.map(plan => (
            <option key={plan.holidayPlanId} value={plan.holidayPlanId}>
              {plan.holidayPlanName}
            </option>
          ))}
        </select>
      </div>

      {/* Departments */}
      <div>
        <label className="block font-medium">Departments</label>
        <div className="border rounded p-2">
          <div>
            <input
              type="checkbox"
              checked={selectedDepts.length === departments.length}
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
            <div key={dept.departmentId}>
              <input
                type="checkbox"
                checked={selectedDepts.includes(dept.departmentId)}
                onChange={() => toggleDept(dept.departmentId)}
              />
              <span className="ml-2">{dept.departmentName}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Employees */}
      <div>
        <label className="block font-medium">Employees</label>
        <div className="border rounded p-2 max-h-40 overflow-y-auto">
          <div>
            <input
              type="checkbox"
              checked={selectedEmps.length === employees.length}
              onChange={() =>
                setSelectedEmps(
                  selectedEmps.length === employees.length
                    ? []
                    : employees.map(e => e.employeeNumber)
                )
              }
            />
            <span className="ml-2 font-medium">Select All</span>
          </div>
          {employees.map(emp => (
            <div key={emp.employeeNumber}>
              <input
                type="checkbox"
                checked={selectedEmps.includes(emp.employeeNumber)}
                onChange={() => toggleEmp(emp.employeeNumber)}
              />
              <span className="ml-2">{emp.employeeName}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Employee Table */}
      <div className="border rounded p-4">
        <h2 className="text-lg font-bold mb-2">Selected Employees</h2>
        <table className="w-full border-collapse border">
          <thead>
            <tr>
              <th className="border p-2">
                <input
                  type="checkbox"
                  checked={selectedEmps.length === employees.length}
                  onChange={() =>
                    setSelectedEmps(
                      selectedEmps.length === employees.length
                        ? []
                        : employees.map(e => e.employeeNumber)
                    )
                  }
                />
              </th>
              <th className="border p-2">Employee Name</th>
              <th className="border p-2">Employee Number</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.employeeNumber}>
                <td className="border p-2">
                  <input
                    type="checkbox"
                    checked={selectedEmps.includes(emp.employeeNumber)}
                    onChange={() => toggleEmp(emp.employeeNumber)}
                  />
                </td>
                <td className="border p-2">{emp.employeeName}</td>
                <td className="border p-2">{emp.employeeNumber}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaveAllocation;
