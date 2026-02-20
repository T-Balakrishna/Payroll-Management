import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileBarChart, Search, Upload, Users } from 'lucide-react';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import API from '../api';
import { useAuth } from '../auth/AuthContext';

import Modal from '../components/ui/Modal';

const normalizeRole = (role) => String(role || '').replace(/\s+/g, '').toLowerCase();
const normalizeLookupKey = (value) => String(value || '').trim().toLowerCase();
const HIDDEN_ROLE_KEYS = new Set(['admin', 'superadmin']);
const getEmployeeUserNumber = (emp) =>
  normalizeLookupKey(emp?.staffNumber || emp?.user?.userNumber || emp?.userNumber || '');

const defaultFilters = {
  departmentId: '',
  designationId: '',
  employeeGradeId: '',
  roleName: '',
  experienceBand: '',
};

const defaultForm = {
  leavePolicyId: '',
  allocatedLeaves: 0,
  notes: '',
};

const employeeName = (emp) => [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(' ') || `#${emp.staffId}`;
const getErrorMessage = (err, fallback) =>
  err?.response?.data?.error ||
  err?.response?.data?.message ||
  err?.message ||
  fallback;
const toDateOnly = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};
const isInRange = (dateOnly, startDate, endDate) =>
  Boolean(dateOnly && startDate && endDate && dateOnly >= startDate && dateOnly <= endDate);
const getExperienceYears = (dateOfJoining) => {
  const raw = String(dateOfJoining || '').trim();
  if (!raw) return null;
  const doj = new Date(raw);
  if (Number.isNaN(doj.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - doj.getFullYear();
  const m = now.getMonth() - doj.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < doj.getDate())) years -= 1;
  return Math.max(0, years);
};
const matchesExperienceBand = (years, band) => {
  if (!band) return true;
  if (years === null) return false;
  if (band === 'lt1') return years < 1;
  if (band === '1to3') return years >= 1 && years <= 3;
  if (band === '3to5') return years >= 3 && years <= 5;
  if (band === '5plus') return years >= 5;
  return true;
};
const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current.trim());
  return values.map((v) => v.replace(/^"(.*)"$/, '$1').trim());
};
const parseCsvText = (text) => {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((acc, key, idx) => {
      acc[key] = values[idx] ?? '';
      return acc;
    }, {});
  });
};
const csvValue = (value) => {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

export default function LeaveAllocation({ userRole, selectedCompanyId }) {
  const { user } = useAuth();
  const isSuperAdmin = normalizeRole(userRole || user?.role) === 'superadmin';
  const currentUserId = user?.userId ?? user?.id ?? null;

  const [companyScope, setCompanyScope] = useState(selectedCompanyId || user?.companyId || '');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(defaultFilters);

  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [employeeGrades, setEmployeeGrades] = useState([]);
  const [leavePolicies, setLeavePolicies] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [activeLeavePeriod, setActiveLeavePeriod] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const effectiveCompanyId = isSuperAdmin
    ? (companyScope || selectedCompanyId || '')
    : (selectedCompanyId || user?.companyId || user?.company?.companyId || '');

  const designationMap = useMemo(() => new Map((designations || []).map((d) => [String(d.designationId), d.designationName])), [designations]);
  const gradeMap = useMemo(() => new Map((employeeGrades || []).map((g) => [String(g.employeeGradeId), g.employeeGradeName])), [employeeGrades]);
  const roleNameById = useMemo(
    () => new Map((roles || []).map((r) => [String(r.roleId || ''), String(r.roleName || '')])),
    [roles]
  );
  const roleMap = useMemo(
    () => {
      const entries = [];
      (users || []).forEach((u) => {
        const roleName = String(u.role?.roleName || roleNameById.get(String(u.roleId || '')) || '').trim();
        if (!roleName) return;
        if (HIDDEN_ROLE_KEYS.has(normalizeRole(roleName))) return;
        const key = normalizeLookupKey(u.userNumber);
        if (!key) return;
        entries.push([key, roleName]);
      });
      return new Map(entries);
    },
    [users, roleNameById]
  );

  const getEmployeeRoleName = (emp) => {
    const directRole = String(emp?.user?.role?.roleName || roleNameById.get(String(emp?.user?.roleId || '')) || '').trim();
    if (directRole && !HIDDEN_ROLE_KEYS.has(normalizeRole(directRole))) return directRole;
    const fromMap = roleMap.get(getEmployeeUserNumber(emp)) || '';
    if (fromMap && !HIDDEN_ROLE_KEYS.has(normalizeRole(fromMap))) return fromMap;
    return '';
  };

  const loadCompanies = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await API.get('/companies');
      setCompanies(res.data || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
      toast.error(getErrorMessage(err, 'Could not load companies'));
    }
  };

  const loadDesignations = async () => {
    try {
      const params = effectiveCompanyId ? { companyId: effectiveCompanyId } : {};
      const res = await API.get('/designations', { params });
      const rows = (res.data || []).filter((d) => !d.deletedAt && d.status === 'Active');
      setDesignations(rows);
    } catch (err) {
      console.error('Error fetching designations:', err);
      toast.error(getErrorMessage(err, 'Could not load designations'));
    }
  };
  const loadDepartments = async () => {
    try {
      const params = effectiveCompanyId ? { companyId: effectiveCompanyId } : {};
      const res = await API.get('/departments', { params });
      const rows = (res.data || []).filter((d) => !d.deletedAt && d.status === 'Active');
      setDepartments(rows);
    } catch (err) {
      console.error('Error fetching departments:', err);
      toast.error(getErrorMessage(err, 'Could not load departments'));
    }
  };

  const loadEmployeeGrades = async () => {
    try {
      const params = effectiveCompanyId ? { companyId: effectiveCompanyId } : {};
      const res = await API.get('/employeeGrades', { params });
      const rows = (res.data || []).filter((g) => g.status === 'Active');
      setEmployeeGrades(rows);
    } catch (err) {
      console.error('Error fetching employee grades:', err);
      toast.error(getErrorMessage(err, 'Could not load employee grades'));
    }
  };

  const loadLeavePolicies = async () => {
    try {
      const params = effectiveCompanyId ? { companyId: effectiveCompanyId, status: 'Active' } : { status: 'Active' };
      const res = await API.get('/leavePolicies', { params });
      setLeavePolicies(res.data || []);
    } catch (err) {
      console.error('Error fetching leave policies:', err);
      toast.error(getErrorMessage(err, 'Could not load leave policies'));
    }
  };

  const loadLeaveTypes = async () => {
    try {
      const params = effectiveCompanyId ? { companyId: effectiveCompanyId, status: 'Active' } : { status: 'Active' };
      const res = await API.get('/leaveTypes', { params });
      setLeaveTypes(res.data || []);
    } catch (err) {
      console.error('Error fetching leave types:', err);
      toast.error(getErrorMessage(err, 'Could not load leave types'));
    }
  };

  const loadEmployees = async () => {
    try {
      const params = {
        status: 'Active',
        ...(effectiveCompanyId ? { companyId: effectiveCompanyId } : {}),
      };
      const res = await API.get('/employees', { params });
      setEmployees(res.data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
      toast.error(getErrorMessage(err, 'Could not load employees'));
    }
  };

  const loadRoles = async () => {
    try {
      const res = await API.get('/roles');
      setRoles(res.data || []);
    } catch (err) {
      console.error('Error fetching roles:', err);
      toast.error(getErrorMessage(err, 'Could not load roles'));
    }
  };
  const loadUsers = async () => {
    try {
      const res = await API.get('/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error(getErrorMessage(err, 'Could not load users'));
    }
  };

  const resolveActiveLeavePeriod = async (companyId) => {
    if (!companyId) return null;
    try {
      const activeRes = await API.get('/leavePeriods/active', { params: { companyId } });
      if (activeRes?.data?.startDate && activeRes?.data?.endDate) {
        return activeRes.data;
      }
    } catch (err) {
      // fallback below
    }

    const listRes = await API.get('/leavePeriods', {
      params: { companyId, status: 'Active' },
    });
    const rows = Array.isArray(listRes.data) ? listRes.data : [];
    if (!rows.length) return null;

    const today = toDateOnly(new Date());
    const windowMatch = rows.find((p) => isInRange(today, p.startDate, p.endDate));
    if (windowMatch) return windowMatch;

    const sorted = [...rows].sort((a, b) => String(b.startDate || '').localeCompare(String(a.startDate || '')));
    return sorted[0] || null;
  };

  useEffect(() => {
    loadCompanies();
  }, [isSuperAdmin]);

  useEffect(() => {
    setCompanyScope(selectedCompanyId || user?.companyId || '');
  }, [selectedCompanyId, user?.companyId]);

  useEffect(() => {
    setFilters(defaultFilters);
    setSelectedEmployeeIds([]);
    setForm(defaultForm);
  }, [effectiveCompanyId]);

  useEffect(() => {
    loadDepartments();
    loadDesignations();
    loadEmployeeGrades();
    loadLeavePolicies();
    loadLeaveTypes();
    loadRoles();
    loadUsers();
  }, [effectiveCompanyId]);

  useEffect(() => {
    loadEmployees();
  }, [effectiveCompanyId]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((emp) => {
      const roleName = getEmployeeRoleName(emp);
      const experienceYears = getExperienceYears(emp.dateOfJoining);
      const designationOk = !filters.designationId || String(emp.designationId || '') === String(filters.designationId);
      const gradeOk = !filters.employeeGradeId || String(emp.employeeGradeId || '') === String(filters.employeeGradeId);
      const deptOk = !filters.departmentId || String(emp.departmentId || emp.department?.departmentId || '') === String(filters.departmentId);
      const roleOk = !filters.roleName || roleName === filters.roleName;
      const experienceOk = matchesExperienceBand(experienceYears, filters.experienceBand);
      if (!designationOk || !gradeOk || !deptOk || !roleOk || !experienceOk) return false;
      if (!q) return true;
      return [employeeName(emp), emp.staffNumber, emp.personalEmail, emp.mobileNumber]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [employees, filters.departmentId, filters.designationId, filters.employeeGradeId, filters.experienceBand, filters.roleName, roleMap, roleNameById, search]);

  const roleOptions = useMemo(() => {
    const fromRoles = (roles || [])
      .filter((r) => String(r.status || '').toLowerCase() !== 'inactive')
      .map((r) => String(r.roleName || '').trim())
      .filter((name) => name && !HIDDEN_ROLE_KEYS.has(normalizeRole(name)));
    if (fromRoles.length > 0) {
      return [...new Set(fromRoles)].sort((a, b) => a.localeCompare(b));
    }

    const values = new Set();
    employees.forEach((emp) => {
      const roleName = getEmployeeRoleName(emp);
      if (roleName) values.add(roleName);
    });
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [employees, roles, roleMap, roleNameById]);

  const sortedEmployees = useMemo(() => {
    return [...filteredEmployees].sort((a, b) => {
      const aSel = selectedEmployeeIds.includes(a.staffId);
      const bSel = selectedEmployeeIds.includes(b.staffId);
      return Number(bSel) - Number(aSel);
    });
  }, [filteredEmployees, selectedEmployeeIds]);

  const allVisibleSelected = filteredEmployees.length > 0 && filteredEmployees.every((emp) => selectedEmployeeIds.includes(emp.staffId));

  const handleToggleAllVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(filteredEmployees.map((e) => e.staffId));
      setSelectedEmployeeIds((prev) => prev.filter((id) => !visibleIds.has(id)));
      return;
    }

    const merged = new Set(selectedEmployeeIds);
    filteredEmployees.forEach((e) => merged.add(e.staffId));
    setSelectedEmployeeIds(Array.from(merged));
  };

  const handleToggleOne = (staffId) => {
    setSelectedEmployeeIds((prev) => (prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]));
  };

  const openAllocation = () => {
    if (!selectedEmployeeIds.length) {
      toast.error('Select at least one employee');
      return;
    }
    setForm(defaultForm);
    setShowAllocateModal(true);
  };

  const handlePolicyChange = (leavePolicyId) => {
    const selectedPolicy = leavePolicies.find((p) => String(p.leavePolicyId) === String(leavePolicyId));
    setForm((prev) => ({
      ...prev,
      leavePolicyId,
      leaveTypeId: selectedPolicy?.leaveTypeId ? String(selectedPolicy.leaveTypeId) : '',
    }));
  };

  const allocateForOneEmployee = async (staffId, payload) => {
    await API.post('/leaveAllocations', {
      ...payload,
      staffId,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    try {
      if (!selectedEmployeeIds.length) {
        Swal.fire('No employees selected', 'Select at least one employee and try again.', 'warning');
        return;
      }

      if (!form.leavePolicyId) {
        Swal.fire('Missing fields', 'Leave policy is required.', 'warning');
        return;
      }

      const selectedPolicy = leavePolicies.find((p) => String(p.leavePolicyId) === String(form.leavePolicyId));
      const derivedLeaveTypeId = selectedPolicy?.leaveTypeId;
      const resolvedCompanyId = selectedPolicy?.companyId || effectiveCompanyId;
      const selectedLeaveType = leaveTypes.find((lt) => String(lt.leaveTypeId) === String(derivedLeaveTypeId));

      if (!derivedLeaveTypeId) {
        Swal.fire('Invalid policy', 'Selected leave policy is not linked to a leave type.', 'warning');
        return;
      }
      if (!resolvedCompanyId) {
        Swal.fire('Invalid policy', 'Selected leave policy is not linked to a company.', 'warning');
        return;
      }

      const activePeriod = await resolveActiveLeavePeriod(resolvedCompanyId);
      if (!activePeriod?.startDate || !activePeriod?.endDate) {
        Swal.fire('No active leave period', 'Create or activate a leave period for this company first.', 'warning');
        return;
      }

      const mismatchedEmployees = employees.filter(
        (emp) =>
          selectedEmployeeIds.includes(emp.staffId) &&
          emp.department?.companyId &&
          String(emp.department.companyId) !== String(resolvedCompanyId)
      );
      if (mismatchedEmployees.length > 0) {
        Swal.fire('Company mismatch', 'Selected employees include records outside the policy company.', 'warning');
        return;
      }

      const requestedLeaves = Number(form.allocatedLeaves || 0);
      const maxAllocation = selectedLeaveType?.maxAllocationPertype;
      const overAllocationAllowed = Boolean(selectedLeaveType?.allowOverAllocation);

      if (
        !overAllocationAllowed &&
        maxAllocation !== null &&
        maxAllocation !== undefined &&
        requestedLeaves > Number(maxAllocation)
      ) {
        Swal.fire('Over limit', `Allocated leaves cannot exceed max allocation (${maxAllocation}).`, 'warning');
        return;
      }

      const payload = {
        companyId: Number(resolvedCompanyId),
        leaveTypeId: Number(derivedLeaveTypeId),
        leavePolicyId: Number(form.leavePolicyId),
        allocatedLeaves: Number(form.allocatedLeaves || 0),
        effectiveFrom: activePeriod.startDate,
        effectiveTo: activePeriod.endDate,
        notes: form.notes || null,
        status: 'Active',
      };

      setSaving(true);
      const results = await Promise.allSettled(selectedEmployeeIds.map((staffId) => allocateForOneEmployee(staffId, payload)));
      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failCount = results.length - successCount;
      const failureMessages = Array.from(
        new Set(
          results
            .filter((r) => r.status === 'rejected')
            .map((r) => getErrorMessage(r.reason, 'Allocation failed'))
            .filter(Boolean)
        )
      );

      if (successCount > 0) {
        Swal.fire('Done', `Leave allocated for ${successCount} employee(s).`, 'success');
      }
      if (failCount > 0) {
        const errorText = failureMessages.join(' | ');
        toast.error(errorText || `${failCount} employee(s) could not be allocated.`);
        Swal.fire('Partial failure', `${failCount} employee(s) could not be updated.${errorText ? `\n${errorText}` : ''}`, 'warning');
      }

      setShowAllocateModal(false);
      setSelectedEmployeeIds([]);
    } catch (err) {
      console.error('Leave allocation submit failed:', err);
      const msg = getErrorMessage(err, 'Allocation failed');
      toast.error(msg);
      Swal.fire('Error', String(msg), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseCsvText(text);
      if (rows.length === 0) {
        toast.error('CSV file is empty or invalid');
        return;
      }

      const employeeByStaffNumber = new Map(
        employees.map((emp) => [String(emp.staffNumber || '').trim().toLowerCase(), emp])
      );
      const employeeByStaffId = new Map(employees.map((emp) => [String(emp.staffId || '').trim(), emp]));
      const policiesById = new Map(leavePolicies.map((p) => [String(p.leavePolicyId), p]));
      const policiesByName = new Map(
        leavePolicies.map((p) => [String(p.name || '').trim().toLowerCase(), p])
      );

      const activePeriodCache = new Map();
      const payloads = [];
      let skipped = 0;

      for (const row of rows) {
        const staffKey = String(row.staffNumber || '').trim().toLowerCase();
        const staffIdKey = String(row.staffId || '').trim();
        const policyIdKey = String(row.leavePolicyId || '').trim();
        const policyNameKey = String(row.leavePolicyName || '').trim().toLowerCase();
        const allocatedLeaves = Number(row.allocatedLeaves);

        const employee = employeeByStaffNumber.get(staffKey) || employeeByStaffId.get(staffIdKey);
        const policy = policiesById.get(policyIdKey) || policiesByName.get(policyNameKey);
        if (!employee || !policy || !Number.isFinite(allocatedLeaves) || allocatedLeaves < 0) {
          skipped += 1;
          continue;
        }

        const companyId = Number(policy.companyId || effectiveCompanyId);
        if (!companyId) {
          skipped += 1;
          continue;
        }

        if (!activePeriodCache.has(String(companyId))) {
          const period = await resolveActiveLeavePeriod(companyId);
          activePeriodCache.set(String(companyId), period || null);
        }
        const activePeriod = activePeriodCache.get(String(companyId));
        if (!activePeriod?.startDate || !activePeriod?.endDate) {
          skipped += 1;
          continue;
        }

        payloads.push({
          companyId,
          staffId: Number(employee.staffId),
          leaveTypeId: Number(policy.leaveTypeId),
          leavePolicyId: Number(policy.leavePolicyId),
          allocatedLeaves,
          effectiveFrom: activePeriod.startDate,
          effectiveTo: activePeriod.endDate,
          notes: String(row.notes || '').trim() || null,
          status: 'Active',
          createdBy: currentUserId,
          updatedBy: currentUserId,
        });
      }

      if (payloads.length === 0) {
        toast.error('No valid rows found in CSV');
        return;
      }

      const results = await Promise.allSettled(payloads.map((payload) => API.post('/leaveAllocations', payload)));
      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failCount = results.length - successCount;
      const suffix = skipped > 0 ? `, ${skipped} skipped` : '';

      if (failCount === 0) {
        Swal.fire('Uploaded!', `${successCount} leave allocations uploaded successfully${suffix}`, 'success');
      } else {
        Swal.fire('Completed with errors', `${successCount} uploaded, ${failCount} failed${suffix}`, 'warning');
      }
    } catch (err) {
      console.error('Bulk upload failed:', err);
      toast.error('Bulk upload failed');
    }
  };

  const downloadSampleTemplate = () => {
    const samplePolicy = leavePolicies[0];
    const headers = ['staffNumber', 'leavePolicyName', 'allocatedLeaves', 'notes'];
    const rows = [
      [
        'EMP001',
        String(samplePolicy?.name || 'Annual Leave Policy'),
        '12',
        'Annual allocation',
      ],
      [
        'EMP002',
        String(samplePolicy?.name || 'Annual Leave Policy'),
        '8',
        'Manual adjustment',
      ],
    ];

    const csv = [headers.join(','), ...rows.map((row) => row.map(csvValue).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'leave_allocation_bulk_upload_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const fetchActiveLeavePeriod = async () => {
      if (!form.leavePolicyId) {
        setActiveLeavePeriod(null);
        return;
      }

      const selectedPolicy = leavePolicies.find((p) => String(p.leavePolicyId) === String(form.leavePolicyId));
      const companyId = selectedPolicy?.companyId || effectiveCompanyId;
      if (!companyId) {
        setActiveLeavePeriod(null);
        return;
      }

      try {
        const resolved = await resolveActiveLeavePeriod(companyId);
        setActiveLeavePeriod(resolved || null);
      } catch (err) {
        setActiveLeavePeriod(null);
        toast.error(getErrorMessage(err, 'Could not resolve active leave period'));
      }
    };

    fetchActiveLeavePeriod();
  }, [form.leavePolicyId, leavePolicies, effectiveCompanyId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isSuperAdmin && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                <select
                  value={companyScope}
                  onChange={(e) => setCompanyScope(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none bg-white"
                >
                  <option value="">All companies</option>
                  {companies.map((company) => (
                    <option key={company.companyId} value={company.companyId}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Department</label>
              <select
                value={filters.departmentId}
                onChange={(e) => setFilters((p) => ({ ...p, departmentId: e.target.value }))}
                className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none bg-white"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.departmentId} value={d.departmentId}>
                    {d.departmentName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Role</label>
              <select
                value={filters.roleName}
                onChange={(e) => setFilters((p) => ({ ...p, roleName: e.target.value }))}
                className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none bg-white"
              >
                <option value="">All Roles</option>
                {roleOptions.map((roleName) => (
                  <option key={roleName} value={roleName}>
                    {roleName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Grade</label>
              <select
                value={filters.employeeGradeId}
                onChange={(e) => setFilters((p) => ({ ...p, employeeGradeId: e.target.value }))}
                className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none bg-white"
              >
                <option value="">All Grades</option>
                {employeeGrades.map((g) => (
                  <option key={g.employeeGradeId} value={g.employeeGradeId}>
                    {g.employeeGradeName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Designation</label>
              <select
                value={filters.designationId}
                onChange={(e) => setFilters((p) => ({ ...p, designationId: e.target.value }))}
                className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none bg-white"
              >
                <option value="">All Designations</option>
                {designations.map((d) => (
                  <option key={d.designationId} value={d.designationId}>
                    {d.designationName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Experience</label>
              <select
                value={filters.experienceBand}
                onChange={(e) => setFilters((p) => ({ ...p, experienceBand: e.target.value }))}
                className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:outline-none bg-white"
              >
                <option value="">All Experience</option>
                <option value="lt1">Below 1 Year</option>
                <option value="1to3">1 to 3 Years</option>
                <option value="3to5">3 to 5 Years</option>
                <option value="5plus">5+ Years</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, staff number, email or mobile..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-400 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleBulkUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm whitespace-nowrap"
                >
                  <Upload size={16} /> Upload CSV
                </button>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg shadow-sm whitespace-nowrap"
                >
                  <Download size={16} /> Download Sample
                </button>
                <button
                  type="button"
                  onClick={openAllocation}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm whitespace-nowrap"
                >
                  <FileBarChart size={16} /> Allocate ({selectedEmployeeIds.length})
                </button>
              </div>
            </div>

            {selectedEmployeeIds.length > 0 && (
              <div className="mt-3 text-sm text-slate-600 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100">
                <span className="font-semibold">{selectedEmployeeIds.length}</span> employee
                {selectedEmployeeIds.length > 1 ? 's' : ''} selected
              </div>
            )}
          </div>

          <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
            <div className="hidden md:block">
              <div className="max-h-[28rem] overflow-y-auto">
                <table className="w-full table-fixed">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 text-left border-b-2 border-slate-200 w-12">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                          checked={allVisibleSelected}
                          onChange={handleToggleAllVisible}
                          aria-label="Select all"
                        />
                      </th>
                      <th className="p-3 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-200">Employee</th>
                      <th className="p-3 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-200">Role</th>
                      <th className="p-3 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-200">Designation</th>
                      <th className="p-3 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-200">Grade</th>
                      <th className="p-3 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-200">Department</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {sortedEmployees.map((emp) => (
                      <tr
                        key={emp.staffId}
                        className={`hover:bg-slate-50 transition-colors ${selectedEmployeeIds.includes(emp.staffId) ? 'bg-indigo-50' : ''}`}
                      >
                        <td className="p-3 align-top">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                            checked={selectedEmployeeIds.includes(emp.staffId)}
                            onChange={() => handleToggleOne(emp.staffId)}
                            aria-label={`Select ${employeeName(emp)}`}
                          />
                        </td>
                        <td className="p-3 text-slate-700 font-medium break-words">{employeeName(emp)}</td>
                        <td className="p-3 text-slate-600 break-words">{getEmployeeRoleName(emp) || '-'}</td>
                        <td className="p-3 text-slate-600 break-words">{designationMap.get(String(emp.designationId || '')) || '-'}</td>
                        <td className="p-3 text-slate-600 break-words">{gradeMap.get(String(emp.employeeGradeId || '')) || '-'}</td>
                        <td className="p-3 text-slate-600 break-words">{emp.department?.departmentName || '-'}</td>
                      </tr>
                    ))}
                    {sortedEmployees.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center p-8 text-slate-500">
                          <div className="flex flex-col items-center gap-2">
                            <Users size={44} className="text-slate-300" />
                            <p className="font-medium">No employees found for the selected filters.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="md:hidden divide-y divide-slate-100">
              {sortedEmployees.map((emp) => (
                <label
                  key={emp.staffId}
                  className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                    checked={selectedEmployeeIds.includes(emp.staffId)}
                    onChange={() => handleToggleOne(emp.staffId)}
                    aria-label={`Select ${employeeName(emp)}`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 break-words">{employeeName(emp)}</p>
                    <p className="text-xs text-slate-600 mt-1 break-words">
                      {getEmployeeRoleName(emp) || '-'} | {designationMap.get(String(emp.designationId || '')) || '-'}
                    </p>
                    <p className="text-xs text-slate-600 break-words">
                      {gradeMap.get(String(emp.employeeGradeId || '')) || '-'} | {emp.department?.departmentName || '-'}
                    </p>
                  </div>
                </label>
              ))}
              {sortedEmployees.length === 0 && (
                <div className="text-center p-8 text-slate-500">
                  <Users size={40} className="text-slate-300 mx-auto mb-2" />
                  <p className="font-medium">No employees found for the selected filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showAllocateModal}
        onClose={() => setShowAllocateModal(false)}
        title="Allocate Leave"
        icon={FileBarChart}
      >
        <form onSubmit={handleAllocate} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Leave Policy</label>
              <select
                value={form.leavePolicyId}
                onChange={(e) => handlePolicyChange(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select policy</option>
                {leavePolicies.map((p) => (
                  <option key={p.leavePolicyId} value={p.leavePolicyId}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type</label>
              <input
                value={
                  leavePolicies.find((p) => String(p.leavePolicyId) === String(form.leavePolicyId))?.leaveType?.leaveTypeName ||
                  leavePolicies.find((p) => String(p.leavePolicyId) === String(form.leavePolicyId))?.leaveType?.name ||
                  '-'
                }
                readOnly
                className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-slate-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Allocated Leaves</label>
              <input
                type="number"
                min={0}
                step="0.5"
                value={form.allocatedLeaves}
                onChange={(e) => setForm((p) => ({ ...p, allocatedLeaves: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Carry Forward</label>
              <input
                value="Auto-calculated from previous leave period"
                readOnly
                className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-slate-600"
              />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Active Leave Period: {activeLeavePeriod?.name || '-'} ({activeLeavePeriod?.startDate || '-'} to {activeLeavePeriod?.endDate || '-'})
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              placeholder="Optional"
            />
          </div>

          <div className="text-sm text-slate-600">Selected employees: <span className="font-semibold">{selectedEmployeeIds.length}</span></div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAllocateModal(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Allocate'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
