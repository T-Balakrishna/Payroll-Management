import React, { useEffect, useMemo, useState } from 'react';
import { CalendarRange } from 'lucide-react';
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
  startDate: '',
  endDate: '',
  status: 'Active',
  companyId: '',
};

export default function LeavePeriodMaster({ userRole, selectedCompanyId }) {
  const { user } = useAuth();
  const isSuperAdmin = normalizeRole(userRole || user?.role) === 'superadmin';
  const currentUserId = user?.userId ?? user?.id ?? null;

  const [periods, setPeriods] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyScope, setCompanyScope] = useState(selectedCompanyId || user?.companyId || '');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState(defaultForm);

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
      toast.error('Could not load companies');
    }
  };

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      const params = effectiveCompanyId ? { companyId: effectiveCompanyId } : {};
      const res = await API.get('/leavePeriods', { params });
      setPeriods(res.data || []);
    } catch (err) {
      console.error('Error fetching leave periods:', err);
      toast.error('Could not load leave periods');
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPageData = async () => {
    if (isSuperAdmin) {
      await Promise.all([loadCompanies(), fetchPeriods()]);
      return;
    }
    await fetchPeriods();
  };

  useEffect(() => {
    setCompanyScope(selectedCompanyId || user?.companyId || '');
  }, [selectedCompanyId, user?.companyId]);

  useEffect(() => {
    loadPageData();
  }, [effectiveCompanyId, isSuperAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return periods.filter((row) =>
      [row.name, row.startDate, row.endDate, row.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [periods, search]);

  const companyNameById = useMemo(
    () => new Map((companies || []).map((company) => [String(company.companyId), company.companyName])),
    [companies]
  );

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
      startDate: row.startDate || '',
      endDate: row.endDate || '',
      status: row.status || 'Active',
      companyId: row.companyId || effectiveCompanyId || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      companyId: form.companyId || effectiveCompanyId,
      createdBy: editData ? undefined : currentUserId,
      updatedBy: currentUserId,
    };

    if (!payload.companyId || !payload.name || !payload.startDate || !payload.endDate) {
      toast.error('Company, name, start date and end date are required');
      return;
    }

    if (new Date(payload.endDate) <= new Date(payload.startDate)) {
      toast.error('End date must be after start date');
      return;
    }

    try {
      if (editData?.leavePeriodId) {
        await API.put(`/leavePeriods/${editData.leavePeriodId}`, payload);
        Swal.fire('Updated!', 'Leave period updated successfully.', 'success');
      } else {
        await API.post('/leavePeriods', payload);
        Swal.fire('Added!', 'Leave period created successfully.', 'success');
      }

      setShowForm(false);
      resetForm();
      fetchPeriods();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Operation failed';
      Swal.fire('Error', String(msg), 'error');
    }
  };

  const handleDelete = (leavePeriodId) => {
    Swal.fire({
      title: 'Delete leave period?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      try {
        await API.delete(`/leavePeriods/${leavePeriodId}`);
        Swal.fire('Deleted!', 'Leave period deleted.', 'success');
        fetchPeriods();
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
        placeholder="Search leave period..."
        buttonText="Add Leave Period"
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
          'Start Date',
          'End Date',
          ...(isSuperAdmin ? ['Company'] : []),
          'Status',
          'Actions',
        ]}
        loading={loading}
      >
        {filtered.map((row) => (
          <tr key={row.leavePeriodId} className="border-t hover:bg-gray-50">
            <td className="py-3 px-4">{row.name}</td>
            <td className="py-3 px-4">{row.startDate}</td>
            <td className="py-3 px-4">{row.endDate}</td>
            {isSuperAdmin ? (
              <td className="py-3 px-4">{row.company?.companyName || companyNameById.get(String(row.companyId)) || '-'}</td>
            ) : null}
            <td className="py-3 px-4">{row.status}</td>
            <td className="py-3 px-4">
              <ActionButtons onEdit={() => openEdit(row)} onDelete={() => handleDelete(row.leavePeriodId)} />
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
        title={editData ? 'Edit Leave Period' : 'Add Leave Period'}
        icon={CalendarRange}
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Leave Period Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g. FY 2026-27"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
          </div>

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
            <p className="text-xs text-slate-500 mt-1">
              Only one Active leave period is allowed per company.
            </p>
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
