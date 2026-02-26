import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../api';
import { useAuth } from '../auth/AuthContext';
import MasterTable from '../components/common/MasterTable';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const normalizeRole = (role) => String(role || '').replace(/\s+/g, '').toLowerCase();

const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values.map((v) => v.replace(/^"(.*)"$/, '$1').trim());
};

const parseCsvText = (text) => {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
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

export default function BiometricDeviceAssignMaster({ userRole, selectedCompanyId }) {
  const { user } = useAuth();
  const isSuperAdmin = normalizeRole(userRole || user?.role) === 'superadmin';
  const isAdmin = normalizeRole(userRole || user?.role) === 'admin';
  const companyId = selectedCompanyId || user?.companyId || user?.company?.companyId || '';
  const canManage = isSuperAdmin || (isAdmin && Boolean(companyId));
  const currentUserId = user?.userId ?? user?.id ?? null;

  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [biometricNumber, setBiometricNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const fetchEmployees = async () => {
    try {
      const params = { status: 'Active' };
      if (companyId) params.companyId = companyId;
      const res = await API.get('/employees', { params });
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error('Failed to load employees');
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [companyId]);

  const filteredEmployees = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) => {
      const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim().toLowerCase();
      const staffNumber = String(emp.staffNumber || '').toLowerCase();
      const biometric = String(emp.biometricNumber || '').toLowerCase();
      return name.includes(q) || staffNumber.includes(q) || biometric.includes(q);
    });
  }, [employees, search]);

  const openEditModal = (employee) => {
    if (!canManage) return;
    setEditingEmployee(employee);
    setBiometricNumber(String(employee?.biometricNumber || ''));
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!canManage) return;
    if (!editingEmployee?.staffId) return;

    try {
      setSaving(true);
      await API.put(`/employees/${editingEmployee.staffId}`, {
        biometricNumber: String(biometricNumber || '').trim() || null,
        updatedBy: currentUserId,
      });
      toast.success('Biometric number assigned successfully');
      setShowModal(false);
      setEditingEmployee(null);
      setBiometricNumber('');
      await fetchEmployees();
    } catch (error) {
      const message = error?.response?.data?.error || error?.response?.data?.message || 'Failed to assign biometric number';
      toast.error(String(message));
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpload = async (event) => {
    if (!canManage) {
      toast.error('You do not have access to manage biometric assignments');
      return;
    }
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseCsvText(text);
      if (!rows.length) {
        toast.error('CSV file is empty or invalid');
        return;
      }

      const employeeByStaffNumber = new Map(
        employees.map((emp) => [String(emp.staffNumber || '').trim().toLowerCase(), emp])
      );

      const payloads = rows
        .map((row) => {
          const staffNumberKey = String(row.staffNumber || '').trim().toLowerCase();
          const employee = employeeByStaffNumber.get(staffNumberKey);
          if (!employee) return null;

          return {
            staffId: employee.staffId,
            biometricNumber: String(row.biometricNumber || '').trim() || null,
          };
        })
        .filter(Boolean);

      if (!payloads.length) {
        toast.error('CSV must contain valid staffNumber and biometricNumber columns');
        return;
      }

      const results = await Promise.allSettled(
        payloads.map((p) =>
          API.put(`/employees/${p.staffId}`, {
            biometricNumber: p.biometricNumber,
            updatedBy: currentUserId,
          })
        )
      );

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failCount = results.length - successCount;
      if (successCount > 0) toast.success(`${successCount} records updated`);
      if (failCount > 0) toast.warning(`${failCount} records failed`);

      await fetchEmployees();
    } catch (error) {
      toast.error('Bulk upload failed');
    }
  };

  const downloadSampleTemplate = () => {
    const headers = ['staffNumber', 'biometricNumber'];
    const sampleRows = [
      ['EMP0001', 'BIO1001'],
      ['EMP0002', 'BIO1002'],
    ];

    const csv = [headers.join(','), ...sampleRows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'biometric_assignment_bulk_upload_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className='h-full flex flex-col gap-4 px-6'>
      <div className='bg-white border rounded-lg p-4 flex flex-wrap items-end gap-3'>
        <Input
          label='Search Staff'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search by staff number / name / biometric number'
        />
        <input
          ref={fileInputRef}
          type='file'
          accept='.csv'
          className='hidden'
          onChange={handleBulkUpload}
        />
        <Button type='button' onClick={() => fileInputRef.current?.click()}>
          Upload CSV
        </Button>
        <Button type='button' variant='secondary' onClick={downloadSampleTemplate}>
          Download Sample
        </Button>
      </div>

      <MasterTable columns={['Staff Number', 'Name', 'Biometric Number']}>
        {filteredEmployees.length === 0 ? (
          <tr>
            <td className='py-4 px-4 text-center text-gray-500' colSpan={3}>
              No staff found
            </td>
          </tr>
        ) : (
          filteredEmployees.map((emp) => (
            <tr key={emp.staffId} className='border-t hover:bg-gray-50'>
              <td className='py-3 px-4'>{emp.staffNumber || '-'}</td>
              <td className='py-3 px-4'>{`${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '-'}</td>
              <td className='py-3 px-4'>
                <div className='flex items-center justify-between gap-2'>
                  <span>{emp.biometricNumber || '-'}</span>
                  <button
                    type='button'
                    className='bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md transition-colors'
                    title='Edit Biometric Number'
                    onClick={() => openEditModal(emp)}
                    disabled={!canManage}
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </MasterTable>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingEmployee(null);
          setBiometricNumber('');
        }}
        title='Assign Biometric Number'
        maxWidth='max-w-md'
      >
        <div className='space-y-4'>
          <Input label='Name' value={`${editingEmployee?.firstName || ''} ${editingEmployee?.lastName || ''}`.trim()} disabled />
          <Input label='Staff Number' value={editingEmployee?.staffNumber || ''} disabled />
          <Input
            label='Biometric Number'
            value={biometricNumber}
            onChange={(e) => setBiometricNumber(e.target.value)}
            placeholder='Enter biometric number'
          />
          <div className='flex justify-end gap-2'>
            <Button
              type='button'
              variant='secondary'
              onClick={() => {
                setShowModal(false);
                setEditingEmployee(null);
                setBiometricNumber('');
              }}
            >
              Cancel
            </Button>
            <Button type='button' onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
