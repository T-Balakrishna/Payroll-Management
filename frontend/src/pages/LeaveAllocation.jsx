import React, { useEffect, useMemo, useState } from 'react';
import { FileBarChart } from 'lucide-react';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import API from '../api';
import { useAuth } from '../auth/AuthContext';

import Modal from '../components/ui/Modal';
import MasterHeader from '../components/common/MasterHeader';
import MasterTable from '../components/common/MasterTable';

const normalizeRole = (role) => String(role || '').replace(/\s+/g, '').toLowerCase();

const defaultFilters = {
  designationId: '',
  employeeGradeId: '',
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

export default function LeaveAllocation({ userRole, selectedCompanyId }) {
  const { user } = useAuth();
  const isSuperAdmin = normalizeRole(userRole || user?.role) === 'superadmin';
  const currentUserId = user?.userId ?? user?.id ?? null;

  const [companyScope, setCompanyScope] = useState(selectedCompanyId || user?.companyId || '');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(defaultFilters);

  const [companies, setCompanies] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [employeeGrades, setEmployeeGrades] = useState([]);
  const [leavePolicies, setLeavePolicies] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [activeLeavePeriod, setActiveLeavePeriod] = useState(null);
  const [saving, setSaving] = useState(false);

  const effectiveCompanyId = isSuperAdmin
    ? (companyScope || selectedCompanyId || '')
    : (selectedCompanyId || user?.companyId || user?.company?.companyId || '');

  const designationMap = useMemo(() => new Map((designations || []).map((d) => [String(d.designationId), d.designationName])), [designations]);
  const gradeMap = useMemo(() => new Map((employeeGrades || []).map((g) => [String(g.employeeGradeId), g.employeeGradeName])), [employeeGrades]);

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
        ...(filters.designationId ? { designationId: filters.designationId } : {}),
        ...(filters.employeeGradeId ? { employeeGradeId: filters.employeeGradeId } : {}),
      };
      const res = await API.get('/employees', { params });
      setEmployees(res.data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
      toast.error(getErrorMessage(err, 'Could not load employees'));
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
    loadDesignations();
    loadEmployeeGrades();
    loadLeavePolicies();
    loadLeaveTypes();
  }, [effectiveCompanyId]);

  useEffect(() => {
    loadEmployees();
  }, [effectiveCompanyId, filters.designationId, filters.employeeGradeId]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) =>
      [employeeName(emp), emp.staffNumber, emp.personalEmail, emp.mobileNumber]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [employees, search]);

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
    <div className="h-full flex flex-col px-6">
      <MasterHeader
        search={search}
        setSearch={setSearch}
        onAddNew={openAllocation}
        placeholder="Search employee..."
        buttonText={`Allocate to Selected (${selectedEmployeeIds.length})`}
        actions={
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <select
                value={companyScope}
                onChange={(e) => setCompanyScope(e.target.value)}
                className="h-10 min-w-40 rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">All companies</option>
                {companies.map((company) => (
                  <option key={company.companyId} value={company.companyId}>
                    {company.companyName}
                  </option>
                ))}
              </select>
            )}

            <select
              value={filters.designationId}
              onChange={(e) => setFilters((p) => ({ ...p, designationId: e.target.value }))}
              className="h-10 min-w-40 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">All designations</option>
              {designations.map((d) => (
                <option key={d.designationId} value={d.designationId}>
                  {d.designationName}
                </option>
              ))}
            </select>

            <select
              value={filters.employeeGradeId}
              onChange={(e) => setFilters((p) => ({ ...p, employeeGradeId: e.target.value }))}
              className="h-10 min-w-40 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">All grades</option>
              {employeeGrades.map((g) => (
                <option key={g.employeeGradeId} value={g.employeeGradeId}>
                  {g.employeeGradeName}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <MasterTable
        columns={[
          <input type="checkbox" checked={allVisibleSelected} onChange={handleToggleAllVisible} aria-label="Select all" />,
          'Staff #',
          'Employee',
          'Designation',
          'Grade',
          'Department',
          'Status',
        ]}
      >
        {filteredEmployees.map((emp) => (
          <tr key={emp.staffId} className="border-t hover:bg-gray-50">
            <td className="py-3 px-4">
              <input
                type="checkbox"
                checked={selectedEmployeeIds.includes(emp.staffId)}
                onChange={() => handleToggleOne(emp.staffId)}
                aria-label={`Select ${employeeName(emp)}`}
              />
            </td>
            <td className="py-3 px-4">{emp.staffNumber || '-'}</td>
            <td className="py-3 px-4">{employeeName(emp)}</td>
            <td className="py-3 px-4">{designationMap.get(String(emp.designationId || '')) || '-'}</td>
            <td className="py-3 px-4">{gradeMap.get(String(emp.employeeGradeId || '')) || '-'}</td>
            <td className="py-3 px-4">{emp.department?.departmentName || '-'}</td>
            <td className="py-3 px-4">{emp.status || '-'}</td>
          </tr>
        ))}
      </MasterTable>

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
