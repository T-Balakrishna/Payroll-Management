import React, { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

let token = sessionStorage.getItem("token");
let decoded = token ? jwtDecode(token) : "";
let userNumber = decoded?.userNumber;

const LeaveAllocation = () => {
  const { t } = useTranslation();
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
    setFilteredEmployees(list);
  }, [employees, filterDept, filterDesignation, filterGrade, filterType, filterCompany]);

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
        title: t("invalidInput"),
        text: t("invalidInputMessage"),
      });
      return;
    }

    const lt = getLeaveType();
    if (lt?.maxAllocationPertype != null && parsed > Number(lt.maxAllocationPertype)) {
      Swal.fire({
        icon: "error",
        title: t("invalidAllocation"),
        text: t("invalidAllocationMessage", { max: lt.maxAllocationPertype, name: lt.leaveTypeName }),
      });
      setBulkLeaves(lt.maxAllocationPertype);
      return;
    }

    if (parsed < 0) {
      Swal.fire({
        icon: "error",
        title: t("invalidAllocation"),
        text: t("negativeAllocation"),
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
        title: t("invalidAllocation"),
        text: t("invalidAllocationMessage", { max: lt.maxAllocationPertype, name: lt.leaveTypeName }),
      });
      setAllocatedLeaves(prev => ({ ...prev, [empNum]: Number(lt.maxAllocationPertype) }));
      return;
    }

    if (parsed < 0) {
      Swal.fire({
        icon: "error",
        title: t("invalidAllocation"),
        text: t("negativeAllocation"),
      });
      setAllocatedLeaves(prev => ({ ...prev, [empNum]: 0 }));
      return;
    }

    setAllocatedLeaves(prev => ({ ...prev, [empNum]: parsed }));
  };

  const handleSave = async () => {
    const lt = getLeaveType();
    if (!lt || !leaveTypeId || !startYear) {
      Swal.fire({
        icon: "error",
        title: t("missingData"),
        text: t("missingDataMessage"),
      });
      return;
    }

    for (let empNum of selectedEmps) {
      const newAlloc = Number(allocatedLeaves[empNum] ?? 0);
      const oldAlloc = Number(previousLeaves[empNum] ?? 0);

      if (lt.maxAllocationPertype != null && newAlloc > Number(lt.maxAllocationPertype)) {
        Swal.fire({
          icon: "error",
          title: t("invalidAllocation"),
          text: t("invalidAllocationMessage", { max: lt.maxAllocationPertype, name: lt.leaveTypeName }),
        });
        continue;
      }

      if (newAlloc < 0) {
        Swal.fire({
          icon: "error",
          title: t("invalidAllocation"),
          text: t("negativeAllocation"),
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
          title: t("allocationUpdated"),
          text: t("allocationUpdated", { employeeNumber: empNum }),
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
          title: t("allocationCreated"),
          text: t("allocationCreated", { employeeNumber: empNum }),
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
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t("leaveAllocation")}</h1>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block font-medium mb-2">{t("leaveType")}</label>
          <select value={leaveTypeId} onChange={e => setLeaveTypeId(e.target.value)} className="border rounded-lg p-2 w-full">
            <option value="">{t("selectLeaveType")}</option>
            {leaveTypes.map(type => (
              <option key={type.leaveTypeId} value={type.leaveTypeId}>
                {type.leaveTypeName} {type.maxAllocationPertype ? (`${t("max")} ${type.maxAllocationPertype}`) : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium mb-2">{t("startYear")}</label>
          <input
            type="number"
            value={startYear}
            onChange={e => setStartYear(e.target.value)}
            placeholder={t("startYearPlaceholder")}
            className="border rounded-lg p-2 w-full"
          />
        </div>

        <div>
          <label className="block font-medium mb-2">{t("endYear")}</label>
          <input type="text" value={endYear} readOnly className="border rounded-lg p-2 w-full bg-gray-50" />
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="border rounded p-2">
          <option value="">{t("allCompanies")}</option>
          {companies.filter(c => c.companyId !== 1).map(c => <option key={c.companyId} value={c.companyId}>{c.companyName}</option>)}
        </select>
        
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="border rounded p-2">
          <option value="">{t("allDepartments")}</option>
          {filteredDepartments.map(d => <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>)}
        </select>

        <select value={filterDesignation} onChange={e => setFilterDesignation(e.target.value)} className="border rounded p-2">
          <option value="">{t("allDesignations")}</option>
          {filteredDesignations.map(d => <option key={d.designationId} value={d.designationId}>{d.designationAckr}</option>)}
        </select>

        <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="border rounded p-2">
          <option value="">{t("allGrades")}</option>
          {filteredEmployeeGrades.map(g => <option key={g.employeeGradeId} value={g.employeeGradeId}>{g.employeeGradeAckr}</option>)}
        </select>

        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border rounded p-2">
          <option value="">{t("allTypes")}</option>
          {filteredEmployeeTypes.map(t => <option key={t.employeeTypeId} value={t.employeeTypeId}>{t.employeeTypeAckr}</option>)}
        </select>
      </div>

      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">{t("employeesCount", { count: filteredEmployees.length })}</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={selectAllChecked} onChange={handleSelectAll} />
              {t("selectAll")}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={bulkLeaves}
                onChange={e => setBulkLeaves(e.target.value)}
                placeholder={t("setLeavesForSelected")}
                className="border rounded px-2 py-1 w-44"
              />
              <button onClick={applyBulkLeaves} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded">
                {t("apply")}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border text-left">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-3">{t("select")}</th>
                <th className="py-2 px-3">{t("employeeNumber")}</th>
                <th className="py-2 px-3">{t("department")}</th>
                <th className="py-2 px-3">{t("designation")}</th>
                <th className="py-2 px-3">{t("grade")}</th>
                <th className="py-2 px-3">{t("employeeType")}</th>
                <th className="py-2 px-3">{t("allocatedLeave")}</th>
                <th className="py-2 px-3">{t("previousYear")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">{t("noEmployeesFound")}</td>
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
            {t("saveAllocations")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveAllocation;