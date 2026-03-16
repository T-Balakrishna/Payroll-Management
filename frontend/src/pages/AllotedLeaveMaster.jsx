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
const toDateOnly = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};
const isInRange = (dateOnly, startDate, endDate) =>
  Boolean(dateOnly && startDate && endDate && dateOnly >= startDate && dateOnly <= endDate);
const toggleValue = (values, value) => {
  const key = String(value);
  return values.includes(key) ? values.filter((v) => v !== key) : [...values, key];
};
const buildQueryParams = (params) => {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value
        .map((v) => String(v))
        .filter((v) => v !== '')
        .forEach((v) => search.append(key, v));
      return;
    }
    const text = String(value).trim();
    if (!text) return;
    search.append(key, text);
  });
  return search;
};

const defaultFilters = {
  designationIds: [],
  employeeGradeIds: [],
  leaveTypeIds: [],
  leavePolicyIds: [],
  statuses: [],
};

export default function AllotedLeaveMaster({ userRole, selectedCompanyId }) {
  const { user } = useAuth();
  const isSuperAdmin = normalizeRole(userRole || user?.role) === 'superadmin';

  const [companyScope, setCompanyScope] = useState(selectedCompanyId || user?.companyId || '');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);

  const [companies, setCompanies] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [employeeGrades, setEmployeeGrades] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leavePolicies, setLeavePolicies] = useState([]);
  const [leavePeriods, setLeavePeriods] = useState([]);
  const [allocations, setAllocations] = useState([]);

  const effectiveCompanyId = isSuperAdmin
    ? (companyScope || selectedCompanyId || '')
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
  const activeLeavePeriod = useMemo(() => {
    if (!effectiveCompanyId) return null;
    const today = toDateOnly(new Date());
    const candidates = (leavePeriods || []).filter(
      (p) => String(p.companyId || '') === String(effectiveCompanyId) && (!p.status || p.status === 'Active')
    );
    if (!candidates.length) return null;
    const match = candidates.find((p) => isInRange(today, p.startDate, p.endDate));
    if (match) return match;
    const sorted = [...candidates].sort((a, b) => String(b.startDate || '').localeCompare(String(a.startDate || '')));
    return sorted[0] || null;
  }, [leavePeriods, effectiveCompanyId]);
  const hasActiveLeavePeriod = Boolean(activeLeavePeriod?.startDate && activeLeavePeriod?.endDate);

  const loadCompanies = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await API.get('/companies');
      setCompanies(res.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load companies'));
    }
  };

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

  const loadAllocations = async (nextFilters = appliedFilters) => {
    try {
      setLoading(true);
      const params = buildQueryParams({
        ...(effectiveCompanyId ? { companyId: effectiveCompanyId } : {}),
        leaveTypeId: nextFilters.leaveTypeIds,
        leavePolicyId: nextFilters.leavePolicyIds,
        status: nextFilters.statuses,
      });
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
    loadCompanies();
  }, [isSuperAdmin]);

  useEffect(() => {
    setCompanyScope(selectedCompanyId || user?.companyId || '');
  }, [selectedCompanyId, user?.companyId]);

  useEffect(() => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setAllocations([]);
  }, [effectiveCompanyId]);

  useEffect(() => {
    loadDesignations();
    loadEmployeeGrades();
    loadLeaveTypes();
    loadLeavePolicies();
    loadLeavePeriods();
  }, [effectiveCompanyId]);

  const filteredAllocations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (allocations || []).filter((row) => {
      const emp = row.employee || {};
      const designationId = String(emp.designationId || '');
      const gradeId = String(emp.employeeGradeId || '');

      if (!hasActiveLeavePeriod) return false;
      if (
        String(row.effectiveFrom || '') !== String(activeLeavePeriod.startDate) ||
        String(row.effectiveTo || '') !== String(activeLeavePeriod.endDate)
      ) {
        return false;
      }

      if (appliedFilters.designationIds.length > 0 && !appliedFilters.designationIds.includes(designationId)) return false;
      if (appliedFilters.employeeGradeIds.length > 0 && !appliedFilters.employeeGradeIds.includes(gradeId)) return false;

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
  }, [allocations, appliedFilters.designationIds, appliedFilters.employeeGradeIds, search, designationMap, gradeMap, activeLeavePeriod, hasActiveLeavePeriod]);

  const handleApplyFilters = async () => {
    setAppliedFilters(filters);
    await loadAllocations(filters);
  };

  return (
    <div className="h-full flex flex-col px-6">
      <MasterHeader
        search={search}
        setSearch={setSearch}
        onAddNew={handleApplyFilters}
        onRefresh={handleApplyFilters}
        placeholder="Search allocated leaves..."
        buttonText="Apply Filters"
      />

      <div className="mb-4 flex flex-wrap items-start gap-6">
        {isSuperAdmin && (
          <div className="min-w-[220px] flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
            <div className="flex flex-wrap gap-3">
              {companies.map((company) => (
                <label key={company.companyId} className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                    checked={String(companyScope) === String(company.companyId)}
                    onChange={() =>
                      setCompanyScope((prev) =>
                        String(prev) === String(company.companyId) ? '' : String(company.companyId)
                      )
                    }
                  />
                  <span>{company.companyName}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="min-w-[220px] flex-1">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Designation</label>
          <div className="flex flex-wrap gap-2">
            {designations.map((d) => (
              <label key={d.designationId} className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                  checked={filters.designationIds.includes(String(d.designationId))}
                  onChange={() =>
                    setFilters((p) => ({
                      ...p,
                      designationIds: toggleValue(p.designationIds, String(d.designationId)),
                    }))
                  }
                />
                <span>{d.designationName}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="min-w-[220px] flex-1">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Grade</label>
          <div className="flex flex-wrap gap-2">
            {employeeGrades.map((g) => (
              <label key={g.employeeGradeId} className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                  checked={filters.employeeGradeIds.includes(String(g.employeeGradeId))}
                  onChange={() =>
                    setFilters((p) => ({
                      ...p,
                      employeeGradeIds: toggleValue(p.employeeGradeIds, String(g.employeeGradeId)),
                    }))
                  }
                />
                <span>{g.employeeGradeName}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="min-w-[220px] flex-1">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Leave Type</label>
          <div className="flex flex-wrap gap-2">
            {leaveTypes.map((lt) => (
              <label key={lt.leaveTypeId} className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                  checked={filters.leaveTypeIds.includes(String(lt.leaveTypeId))}
                  onChange={() =>
                    setFilters((p) => ({
                      ...p,
                      leaveTypeIds: toggleValue(p.leaveTypeIds, String(lt.leaveTypeId)),
                      leavePolicyIds: [],
                    }))
                  }
                />
                <span>{lt.leaveTypeName || lt.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="min-w-[220px] flex-1">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Leave Policy</label>
          <div className="flex flex-wrap gap-2">
            {leavePolicies
              .filter((p) =>
                filters.leaveTypeIds.length === 0 ||
                filters.leaveTypeIds.includes(String(p.leaveTypeId))
              )
              .map((p) => (
                <label key={p.leavePolicyId} className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                    checked={filters.leavePolicyIds.includes(String(p.leavePolicyId))}
                    onChange={() =>
                      setFilters((prev) => ({
                        ...prev,
                        leavePolicyIds: toggleValue(prev.leavePolicyIds, String(p.leavePolicyId)),
                      }))
                    }
                  />
                  <span>{p.name}</span>
                </label>
              ))}
          </div>
        </div>

        <div className="min-w-[200px] flex-1">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
          <div className="flex flex-wrap gap-2">
            {['Active', 'Expired', 'Cancelled'].map((status) => (
              <label key={status} className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                  checked={filters.statuses.includes(status)}
                  onChange={() =>
                    setFilters((prev) => ({
                      ...prev,
                      statuses: toggleValue(prev.statuses, status),
                    }))
                  }
                />
                <span>{status}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilters(defaultFilters)}
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleApplyFilters}
          className="h-9 rounded-lg bg-indigo-600 px-3 text-sm text-white"
        >
          Apply
        </button>
      </div>

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
          {hasActiveLeavePeriod
            ? `No allocated leave records found for the current active leave period${activeLeavePeriod?.name ? ` (${activeLeavePeriod.name})` : ''}.`
            : 'No active leave period found for the selected company.'}
        </div>
      ) : null}
    </div>
  );
}
