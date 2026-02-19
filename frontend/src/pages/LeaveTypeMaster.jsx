import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import API from '../api';
import { useAuth } from '../auth/AuthContext';

import Modal from '../components/ui/Modal';
import MasterHeader from '../components/common/MasterHeader';
import MasterTable from '../components/common/MasterTable';
import ActionButtons from '../components/common/ActionButton';

const normalizeRole = (role) => String(role || '').replace(/\s+/g, '').toLowerCase();

const defaultForm = {
  name: '',
  leaveTypeName: '',
  description: '',
  maxAllocationPertype: '',
  allowApplicationAfterDays: '',
  minWorkingDaysForLeave: '',
  isPaid: false,
  isWithoutPay: false,
  isLeaveWithoutPay: false,
  isPartiallyPaidLeave: false,
  isOptionalLeave: false,
  allowNegativeBalance: false,
  allowOverAllocation: false,
  isCarryForwardEnabled: false,
  isCarryForward: false,
  countHolidaysAsLeave: false,
  includeHolidaysAsLeave: false,
  isCompensatory: false,
  allowEncashment: false,
  isEarnedLeave: false,
  maxConsecutiveLeaves: 0,
  status: 'Active',
  companyId: '',
};

export default function LeaveTypeMaster({ userRole, selectedCompanyId }) {
  const { user } = useAuth();
  const isSuperAdmin = normalizeRole(userRole || user?.role) === 'superadmin';
  const currentUserId = user?.userId ?? user?.id ?? null;

  const [types, setTypes] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [companyScope, setCompanyScope] = useState(selectedCompanyId || user?.companyId || '');

  const effectiveCompanyId = isSuperAdmin
    ? (companyScope || selectedCompanyId || '')
    : (selectedCompanyId || user?.companyId || user?.company?.companyId || '');

  const loadCompanies = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await API.get('/companies');
      setCompanies(res.data || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const fetchTypes = async () => {
    try {
      const params = effectiveCompanyId ? { companyId: effectiveCompanyId } : {};
      const res = await API.get('/leaveTypes', { params });
      setTypes(res.data || []);
    } catch (err) {
      console.error('Error fetching leave types:', err);
      toast.error('Could not load leave types');
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [isSuperAdmin]);

  useEffect(() => {
    setCompanyScope(selectedCompanyId || user?.companyId || '');
  }, [selectedCompanyId, user?.companyId]);

  useEffect(() => {
    fetchTypes();
  }, [effectiveCompanyId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return types.filter((row) =>
      [row.name, row.leaveTypeName, row.description, row.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [types, search]);

  const resetForm = () => {
    setForm({ ...defaultForm, companyId: effectiveCompanyId || '' });
    setEditData(null);
  };

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (row) => {
    setEditData(row);
    setForm({
      name: row.name || row.leaveTypeName || '',
      leaveTypeName: row.leaveTypeName || row.name || '',
      description: row.description || '',
      maxAllocationPertype: row.maxAllocationPertype ?? '',
      allowApplicationAfterDays: row.allowApplicationAfterDays ?? '',
      minWorkingDaysForLeave: row.minWorkingDaysForLeave ?? '',
      isPaid: Boolean(row.isPaid),
      isWithoutPay: Boolean(row.isWithoutPay),
      isLeaveWithoutPay: Boolean(row.isLeaveWithoutPay ?? row.isWithoutPay),
      isPartiallyPaidLeave: Boolean(row.isPartiallyPaidLeave),
      isOptionalLeave: Boolean(row.isOptionalLeave),
      allowNegativeBalance: Boolean(row.allowNegativeBalance),
      allowOverAllocation: Boolean(row.allowOverAllocation),
      isCarryForwardEnabled: Boolean(row.isCarryForwardEnabled),
      isCarryForward: Boolean(row.isCarryForward ?? row.isCarryForwardEnabled),
      countHolidaysAsLeave: Boolean(row.countHolidaysAsLeave),
      includeHolidaysAsLeave: Boolean(row.includeHolidaysAsLeave ?? row.countHolidaysAsLeave),
      isCompensatory: Boolean(row.isCompensatory),
      allowEncashment: Boolean(row.allowEncashment),
      isEarnedLeave: Boolean(row.isEarnedLeave),
      maxConsecutiveLeaves: Number(row.maxConsecutiveLeaves || 0),
      status: row.status || 'Active',
      companyId: row.companyId || effectiveCompanyId || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      name: form.name || form.leaveTypeName,
      leaveTypeName: form.leaveTypeName || form.name,
      maxAllocationPertype: form.maxAllocationPertype === '' ? null : Number(form.maxAllocationPertype),
      allowApplicationAfterDays: form.allowApplicationAfterDays === '' ? null : Number(form.allowApplicationAfterDays),
      minWorkingDaysForLeave: form.minWorkingDaysForLeave === '' ? null : Number(form.minWorkingDaysForLeave),
      companyId: form.companyId || effectiveCompanyId,
      createdBy: editData ? undefined : currentUserId,
      updatedBy: currentUserId,
    };

    if (!payload.companyId) {
      toast.error('Select a company');
      return;
    }

    try {
      if (editData?.leaveTypeId) {
        await API.put(`/leaveTypes/${editData.leaveTypeId}`, payload);
        Swal.fire('Updated!', 'Leave type updated successfully.', 'success');
      } else {
        await API.post('/leaveTypes', payload);
        Swal.fire('Added!', 'Leave type created successfully.', 'success');
      }

      setShowForm(false);
      resetForm();
      fetchTypes();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Operation failed';
      Swal.fire('Error', String(msg), 'error');
    }
  };

  const handleDelete = (leaveTypeId) => {
    Swal.fire({
      title: 'Delete leave type?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      try {
        await API.delete(`/leaveTypes/${leaveTypeId}`);
        Swal.fire('Deleted!', 'Leave type deleted.', 'success');
        fetchTypes();
      } catch (err) {
        const msg = err.response?.data?.error || err.response?.data?.message || 'Delete failed';
        Swal.fire('Error', String(msg), 'error');
      }
    });
  };

  return (
    <div className="h-full flex flex-col px-6">
      <MasterHeader
        search={search}
        setSearch={setSearch}
        onAddNew={openAdd}
        placeholder="Search leave type..."
        buttonText="Add Leave Type"
        actions={
          isSuperAdmin ? (
            <select
              value={companyScope}
              onChange={(e) => setCompanyScope(e.target.value)}
              className="h-10 min-w-48 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All companies</option>
              {companies.map((company) => (
                <option key={company.companyId} value={company.companyId}>
                  {company.companyName}
                </option>
              ))}
            </select>
          ) : null
        }
      />

      <MasterTable
        columns={[
          'Name',
          'Max Allocation',
          'Without Pay',
          'Carry Forward',
          'Optional',
          'Max Consecutive',
          'Status',
          'Actions',
        ]}
      >
        {filtered.map((row) => (
          <tr key={row.leaveTypeId} className="border-t hover:bg-gray-50">
            <td className="py-3 px-4">{row.leaveTypeName || row.name}</td>
            <td className="py-3 px-4">{row.maxAllocationPertype ?? '-'}</td>
            <td className="py-3 px-4">{(row.isLeaveWithoutPay ?? row.isWithoutPay) ? 'Yes' : 'No'}</td>
            <td className="py-3 px-4">{(row.isCarryForward ?? row.isCarryForwardEnabled) ? 'Yes' : 'No'}</td>
            <td className="py-3 px-4">{row.isOptionalLeave ? 'Yes' : 'No'}</td>
            <td className="py-3 px-4">{row.maxConsecutiveLeaves}</td>
            <td className="py-3 px-4">{row.status}</td>
            <td className="py-3 px-4">
              <ActionButtons onEdit={() => openEdit(row)} onDelete={() => handleDelete(row.leaveTypeId)} />
            </td>
          </tr>
        ))}
      </MasterTable>

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          resetForm();
        }}
        title={editData ? 'Edit Leave Type' : 'Add Leave Type'}
        icon={ClipboardList}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSuperAdmin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
              <select
                value={form.companyId || ''}
                onChange={(e) => setForm((p) => ({ ...p, companyId: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
                required
              >
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company.companyId} value={company.companyId}>
                    {company.companyName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type Name</label>
            <input
              value={form.leaveTypeName}
              onChange={(e) => {
                const value = e.target.value;
                setForm((p) => ({ ...p, leaveTypeName: value, name: value }));
              }}
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Allocation Per Type</label>
              <input
                type="number"
                min={0}
                value={form.maxAllocationPertype}
                onChange={(e) => setForm((p) => ({ ...p, maxAllocationPertype: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Allow Application After Days</label>
              <input
                type="number"
                min={0}
                value={form.allowApplicationAfterDays}
                onChange={(e) => setForm((p) => ({ ...p, allowApplicationAfterDays: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Working Days For Leave</label>
              <input
                type="number"
                min={0}
                value={form.minWorkingDaysForLeave}
                onChange={(e) => setForm((p) => ({ ...p, minWorkingDaysForLeave: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isPaid}
                onChange={(e) => setForm((p) => ({ ...p, isPaid: e.target.checked }))}
              />
              Paid Leave
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isWithoutPay}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm((p) => ({ ...p, isWithoutPay: checked, isLeaveWithoutPay: checked }));
                }}
              />
              Without Pay
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isCarryForwardEnabled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm((p) => ({ ...p, isCarryForwardEnabled: checked, isCarryForward: checked }));
                }}
              />
              Carry Forward Enabled
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.countHolidaysAsLeave}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm((p) => ({ ...p, countHolidaysAsLeave: checked, includeHolidaysAsLeave: checked }));
                }}
              />
              Count Holidays As Leave
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isPartiallyPaidLeave}
                onChange={(e) => setForm((p) => ({ ...p, isPartiallyPaidLeave: e.target.checked }))}
              />
              Partially Paid Leave
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isOptionalLeave}
                onChange={(e) => setForm((p) => ({ ...p, isOptionalLeave: e.target.checked }))}
              />
              Optional Leave
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.allowNegativeBalance}
                onChange={(e) => setForm((p) => ({ ...p, allowNegativeBalance: e.target.checked }))}
              />
              Allow Negative Balance
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.allowOverAllocation}
                onChange={(e) => setForm((p) => ({ ...p, allowOverAllocation: e.target.checked }))}
              />
              Allow Over Allocation
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isCompensatory}
                onChange={(e) => setForm((p) => ({ ...p, isCompensatory: e.target.checked }))}
              />
              Is Compensatory
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.allowEncashment}
                onChange={(e) => setForm((p) => ({ ...p, allowEncashment: e.target.checked }))}
              />
              Allow Encashment
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isEarnedLeave}
                onChange={(e) => setForm((p) => ({ ...p, isEarnedLeave: e.target.checked }))}
              />
              Is Earned Leave
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Consecutive Leaves</label>
              <input
                type="number"
                min={0}
                value={form.maxConsecutiveLeaves}
                onChange={(e) => setForm((p) => ({ ...p, maxConsecutiveLeaves: Number(e.target.value || 0) }))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            {editData && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white">
              {editData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
