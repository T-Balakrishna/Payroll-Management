import React, { useEffect, useMemo, useState } from 'react';
import { Shield } from 'lucide-react';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import API from '../api';
import { useAuth } from '../auth/AuthContext';

import Modal from '../components/ui/Modal';
import MasterHeader from '../components/common/MasterHeader';
import MasterTable from '../components/common/MasterTable';
import ActionButtons from '../components/common/ActionButton';

const normalizeRole = (role) => String(role || '').replace(/\s+/g, '').toLowerCase();
const toBool = (value) => value === true || value === 1 || value === '1' || String(value || '').toLowerCase() === 'true';

const defaultForm = {
  name: '',
  leaveTypeId: '',
  accrualFrequency: 'Yearly',
  maxCarryForward: 0,
  allowEncashment: false,
  encashmentRules: '',
  status: 'Active',
  companyId: '',
};

export default function LeavePolicyManagement({ userRole, selectedCompanyId }) {
  const { user } = useAuth();
  const isSuperAdmin = normalizeRole(userRole || user?.role) === 'superadmin';
  const currentUserId = user?.userId ?? user?.id ?? null;

  const [policies, setPolicies] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [companyScope, setCompanyScope] = useState(selectedCompanyId || user?.companyId || '');
  const selectedLeaveType = useMemo(() => leaveTypes.find((lt) => String(lt.leaveTypeId) === String(form.leaveTypeId)), [leaveTypes, form.leaveTypeId]);
  const carryForwardEnabledForSelectedType = toBool(selectedLeaveType?.isCarryForwardEnabled ?? selectedLeaveType?.isCarryForward);

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

  const fetchPolicies = async () => {
    try {
      const params = effectiveCompanyId ? { companyId: effectiveCompanyId } : {};
      const res = await API.get('/leavePolicies', { params });
      setPolicies(res.data || []);
    } catch (err) {
      console.error('Error fetching leave policies:', err);
      toast.error('Could not load leave policies');
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const params = effectiveCompanyId ? { companyId: effectiveCompanyId, status: 'Active' } : { status: 'Active' };
      const res = await API.get('/leaveTypes', { params });
      setLeaveTypes(res.data || []);
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
    fetchPolicies();
    fetchLeaveTypes();
  }, [effectiveCompanyId]);

  useEffect(() => {
    if (!form.leaveTypeId) return;
    if (form.leaveTypeId && !carryForwardEnabledForSelectedType && form.maxCarryForward !== 0) {
      setForm((p) => ({ ...p, maxCarryForward: 0 }));
    }
  }, [form.leaveTypeId, form.maxCarryForward, carryForwardEnabledForSelectedType]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return policies.filter((row) =>
      [row.name, row.leaveType?.name, row.status, row.accrualFrequency]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [policies, search]);

  const resetForm = () => {
    setForm({
      ...defaultForm,
      companyId: effectiveCompanyId || '',
    });
    setEditData(null);
  };

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (row) => {
    setEditData(row);
    setForm({
      name: row.name || '',
      leaveTypeId: row.leaveTypeId || '',
      accrualFrequency: row.accrualFrequency || 'Yearly',
      maxCarryForward: Number(row.maxCarryForward || 0),
      allowEncashment: Boolean(row.allowEncashment),
      encashmentRules: row.encashmentRules || '',
      status: row.status || 'Active',
      companyId: row.companyId || effectiveCompanyId || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const resolvedLeaveTypeName = selectedLeaveType?.leaveTypeName || selectedLeaveType?.name || '';
    const carryForwardDisabled = form.leaveTypeId && !carryForwardEnabledForSelectedType;

    const payload = {
      ...form,
      companyId: form.companyId || effectiveCompanyId,
      leaveTypeId: Number(form.leaveTypeId),
      leaveType: resolvedLeaveTypeName || null,
      maxCarryForward: carryForwardDisabled ? 0 : Number(form.maxCarryForward || 0),
      createdBy: editData ? undefined : currentUserId,
      updatedBy: currentUserId,
    };

    if (!payload.companyId || !payload.leaveTypeId) {
      toast.error('Company and leave type are required');
      return;
    }

    try {
      if (editData?.leavePolicyId) {
        await API.put(`/leavePolicies/${editData.leavePolicyId}`, payload);
        Swal.fire('Updated!', 'Leave policy updated successfully.', 'success');
      } else {
        await API.post('/leavePolicies', payload);
        Swal.fire('Added!', 'Leave policy created successfully.', 'success');
      }

      setShowForm(false);
      resetForm();
      fetchPolicies();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Operation failed';
      Swal.fire('Error', String(msg), 'error');
    }
  };

  const handleDelete = (leavePolicyId) => {
    Swal.fire({
      title: 'Delete leave policy?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      try {
        await API.delete(`/leavePolicies/${leavePolicyId}`);
        Swal.fire('Deleted!', 'Leave policy deleted.', 'success');
        fetchPolicies();
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
        placeholder="Search leave policy..."
        buttonText="Add Leave Policy"
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
          'Leave Type',
          'Accrual',
          'Carry Forward',
          'Encashment',
          'Status',
          'Actions',
        ]}
      >
        {filtered.map((row) => (
          <tr key={row.leavePolicyId} className="border-t hover:bg-gray-50">
            <td className="py-3 px-4">{row.name}</td>
            <td className="py-3 px-4">{row.leaveType?.name || '-'}</td>
            <td className="py-3 px-4">{row.accrualFrequency}</td>
            <td className="py-3 px-4">{row.maxCarryForward}</td>
            <td className="py-3 px-4">{row.allowEncashment ? 'Yes' : 'No'}</td>
            <td className="py-3 px-4">{row.status}</td>
            <td className="py-3 px-4">
              <ActionButtons onEdit={() => openEdit(row)} onDelete={() => handleDelete(row.leavePolicyId)} />
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
        title={editData ? 'Edit Leave Policy' : 'Add Leave Policy'}
        icon={Shield}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSuperAdmin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
              <select
                value={form.companyId || ''}
                onChange={(e) => setForm((p) => ({ ...p, companyId: e.target.value, leaveTypeId: '' }))}
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Policy Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type</label>
            <select
              value={form.leaveTypeId}
              onChange={(e) => {
                const leaveTypeId = e.target.value;
                const selected = leaveTypes.find((lt) => String(lt.leaveTypeId) === String(leaveTypeId));
                const isCarryForwardEnabled = toBool(selected?.isCarryForwardEnabled ?? selected?.isCarryForward);
                setForm((p) => ({
                  ...p,
                  leaveTypeId,
                  maxCarryForward: isCarryForwardEnabled ? p.maxCarryForward : 0,
                }));
              }}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="">Select leave type</option>
              {leaveTypes
                .filter((lt) => !form.companyId || String(lt.companyId) === String(form.companyId))
                .map((lt) => (
                  <option key={lt.leaveTypeId} value={lt.leaveTypeId}>
                    {lt.leaveTypeName || lt.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Accrual Frequency</label>
              <select
                value={form.accrualFrequency}
                onChange={(e) => setForm((p) => ({ ...p, accrualFrequency: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
                <option value="On Joining">On Joining</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Carry Forward</label>
              <input
                type="number"
                min={0}
                value={form.maxCarryForward}
                onChange={(e) => setForm((p) => ({ ...p, maxCarryForward: Number(e.target.value || 0) }))}
                className="w-full border rounded-lg px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500"
                disabled={form.leaveTypeId && !carryForwardEnabledForSelectedType}
              />
              {form.leaveTypeId && !carryForwardEnabledForSelectedType ? (
                  <p className="text-xs text-slate-500 mt-1">Carry forward is disabled for this leave type.</p>
                ) : null}
            </div>

            <div />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {editData ? (
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
            ) : <div />}

            <label className={`flex items-center gap-2 text-sm ${editData ? 'pt-8' : ''}`}>
              <input
                type="checkbox"
                checked={form.allowEncashment}
                onChange={(e) => setForm((p) => ({ ...p, allowEncashment: e.target.checked }))}
              />
              Allow Encashment
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Encashment Rules</label>
            <textarea
              value={form.encashmentRules}
              onChange={(e) => setForm((p) => ({ ...p, encashmentRules: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              placeholder="Optional notes/rules"
            />
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


