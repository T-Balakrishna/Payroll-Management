import React, { useEffect, useMemo, useState } from 'react';
import { ListChecks } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../api';
import { useAuth } from '../auth/AuthContext';

import MasterHeader from '../components/common/MasterHeader';
import MasterTable from '../components/common/MasterTable';

const normalizeRole = (role) => String(role || '').replace(/\s+/g, '').toLowerCase();
const toNumber = (value) => Number(value || 0);
const employeeName = (emp) => [emp?.firstName, emp?.middleName, emp?.lastName].filter(Boolean).join(' ') || `#${emp?.staffId || ''}`;
const getErrorMessage = (err, fallback) =>
  err?.response?.data?.error ||
  err?.response?.data?.message ||
  err?.message ||
  fallback;

const defaultFilters = {
  designationId: '',
  employeeGradeId: '',
  leaveTypeId: '',
  leavePolicyId: '',
  status: '',
};

export default function AllotedLeaveMaster({ userRole, selectedCompanyId }) {
  const { user } = useAuth();
  const isSuperAdmin = normalizeRole(userRole || user?.role) === 'superadmin';

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);

  const [designations, setDesignations] = useState([]);
  const [employeeGrades, setEmployeeGrades] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leavePolicies, setLeavePolicies] = useState([]);
  const [leavePeriods, setLeavePeriods] = useState([]);
  const [allocations, setAllocations] = useState([]);

  const effectiveCompanyId = isSuperAdmin
    ? (selectedCompanyId || '')
    : (selectedCompanyId || user?.companyId || user?.company?.companyId || '');

  const designationMap = useMemo(() => new Map((designations || []).map((d) => [String(d.designationId), d.designationName])), [designations]);
  const gradeMap = useMemo(() => new Map((employeeGrades || []).map((g) => [String(g.employeeGradeId), g.employeeGradeName])), [employeeGrades]);
  const leavePeriodMap = useMemo(
    () =>
      new Map(
        (leavePeriods || []).map((p) => [
          `${p.companyId}|${p.startDate}|${p.endDate}`,
          p.name,
        ])
      ),
    [leavePeriods]
  );

  const loadDesignations = async () => {
    try {
      const params = effectiveCompanyId ? { companyId: effectiveCompanyId } : {};
      const res = await API.get('/designations', { params });
      setDesignations((res.data || []).filter((d) => d.status === 'Active'));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load designations'));
    }
  };

  const loadEmployeeGrades = async () => {
    try {
      const params = effectiveCompanyId ? { companyId: effectiveCompanyId } : {};
      const res = await API.get('/employeeGrades', { params });
      setEmployeeGrades((res.data || []).filter((g) => g.status === 'Active'));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load grades'));
    }
  };

  const loadLeaveTypes = async () => {
    try {
      const params = effectiveCompanyId ? { companyId: effectiveCompanyId, status: 'Active' } : { status: 'Active' };
      const res = await API.get('/leaveTypes', { params });
      setLeaveTypes(res.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load leave types'));
    }
  };

  const loadLeavePolicies = async () => {
    try {
      const params = effectiveCompanyId ? { companyId: effectiveCompanyId, status: 'Active' } : { status: 'Active' };
      const res = await API.get('/leavePolicies', { params });
      setLeavePolicies(res.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load leave policies'));
    }
  };

  const loadLeavePeriods = async () => {
    try {
      const params = effectiveCompanyId ? { companyId: effectiveCompanyId } : {};
      const res = await API.get('/leavePeriods', { params });
      setLeavePeriods(res.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load leave periods'));
    }
  };

  const loadAllocations = async () => {
    try {
      setLoading(true);
      const params = {
        ...(effectiveCompanyId ? { companyId: effectiveCompanyId } : {}),
        ...(filters.leaveTypeId ? { leaveTypeId: filters.leaveTypeId } : {}),
        ...(filters.leavePolicyId ? { leavePolicyId: filters.leavePolicyId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      };
      const res = await API.get('/leaveAllocations', { params });
      setAllocations(res.data || []);
    } catch (err) {
      setAllocations([]);
      toast.error(getErrorMessage(err, 'Could not load allocations'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFilters(defaultFilters);
  }, [effectiveCompanyId]);

  useEffect(() => {
    loadDesignations();
    loadEmployeeGrades();
    loadLeaveTypes();
    loadLeavePolicies();
    loadLeavePeriods();
  }, [effectiveCompanyId]);

  useEffect(() => {
    loadAllocations();
  }, [effectiveCompanyId, filters.leaveTypeId, filters.leavePolicyId, filters.status]);

  const filteredAllocations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (allocations || []).filter((row) => {
      const emp = row.employee || {};
      const designationId = String(emp.designationId || '');
      const gradeId = String(emp.employeeGradeId || '');

      if (filters.designationId && designationId !== String(filters.designationId)) return false;
      if (filters.employeeGradeId && gradeId !== String(filters.employeeGradeId)) return false;

      if (!q) return true;
      const available = toNumber(row.carryForwardFromPrevious) + toNumber(row.totalAccruedTillDate) - toNumber(row.usedLeaves);
      return [
        row.employee?.staffNumber,
        employeeName(emp),
        row.leaveType?.name,
        row.leavePolicy?.name,
        row.status,
        designationMap.get(designationId),
        gradeMap.get(gradeId),
        String(available),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [allocations, filters.designationId, filters.employeeGradeId, search, designationMap, gradeMap]);

  return (
    <div className="h-full flex flex-col px-6">
      <MasterHeader
        search={search}
        setSearch={setSearch}
        onAddNew={loadAllocations}
        placeholder="Search allocated leaves..."
        buttonText="Refresh"
        actions={(
          <div className="flex flex-wrap items-center gap-2 max-w-full">
            <select
              value={filters.designationId}
              onChange={(e) => setFilters((p) => ({ ...p, designationId: e.target.value }))}
              className="h-10 w-40 max-w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">All designations</option>
              {designations.map((d) => (
                <option key={d.designationId} value={d.designationId}>{d.designationName}</option>
              ))}
            </select>

            <select
              value={filters.employeeGradeId}
              onChange={(e) => setFilters((p) => ({ ...p, employeeGradeId: e.target.value }))}
              className="h-10 w-40 max-w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">All grades</option>
              {employeeGrades.map((g) => (
                <option key={g.employeeGradeId} value={g.employeeGradeId}>{g.employeeGradeName}</option>
              ))}
            </select>

            <select
              value={filters.leaveTypeId}
              onChange={(e) => setFilters((p) => ({ ...p, leaveTypeId: e.target.value, leavePolicyId: '' }))}
              className="h-10 w-40 max-w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">All leave types</option>
              {leaveTypes.map((lt) => (
                <option key={lt.leaveTypeId} value={lt.leaveTypeId}>{lt.leaveTypeName || lt.name}</option>
              ))}
            </select>

            <select
              value={filters.leavePolicyId}
              onChange={(e) => setFilters((p) => ({ ...p, leavePolicyId: e.target.value }))}
              className="h-10 w-40 max-w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">All policies</option>
              {leavePolicies
                .filter((p) => !filters.leaveTypeId || String(p.leaveTypeId) === String(filters.leaveTypeId))
                .map((p) => (
                  <option key={p.leavePolicyId} value={p.leavePolicyId}>{p.name}</option>
                ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
              className="h-10 w-36 max-w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">All status</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        )}
      />

      <MasterTable
        loading={loading}
        columns={[
          'Employee',
          'Designation',
          'Grade',
          'Policy',
          'Allocated',
          'CarryFwd',
          'Accrued Till Now',
          'Used',
          'Available',
          'Period',
        ]}
      >
        {filteredAllocations.map((row) => {
          const available = toNumber(row.carryForwardFromPrevious) + toNumber(row.totalAccruedTillDate) - toNumber(row.usedLeaves);
          const emp = row.employee || {};
          return (
            <tr key={row.leaveAllocationId} className="border-t hover:bg-gray-50">
              <td className="py-3 px-4">{employeeName(emp)}</td>
              <td className="py-3 px-4">{designationMap.get(String(emp.designationId || '')) || '-'}</td>
              <td className="py-3 px-4">{gradeMap.get(String(emp.employeeGradeId || '')) || '-'}</td>
              <td className="py-3 px-4">{row.leavePolicy?.name || '-'}</td>
              <td className="py-3 px-4">{row.allocatedLeaves}</td>
              <td className="py-3 px-4">{row.carryForwardFromPrevious}</td>
              <td className="py-3 px-4">{row.totalAccruedTillDate}</td>
              <td className="py-3 px-4">{row.usedLeaves}</td>
              <td className="py-3 px-4">{available.toFixed(2)}</td>
              <td className="py-3 px-4">
                {leavePeriodMap.get(`${row.companyId}|${row.effectiveFrom}|${row.effectiveTo}`) || '-'}
              </td>
            </tr>
          );
        })}
      </MasterTable>

      {!loading && filteredAllocations.length === 0 ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <ListChecks className="inline-block w-4 h-4 mr-2" />
          No allocated leave records found for the current filters.
        </div>
      ) : null}
    </div>
  );
}
