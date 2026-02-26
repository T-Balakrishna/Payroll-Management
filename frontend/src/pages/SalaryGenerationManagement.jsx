import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../api';
import { useAuth } from '../auth/AuthContext';
import MasterTable from '../components/common/MasterTable';
import Button from '../components/ui/Button';

const toMonthInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const getPreviousMonthValue = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return toMonthInputValue(d);
};

export default function SalaryGenerationManagement({ selectedCompanyId }) {
  const { user } = useAuth();
  const companyId = selectedCompanyId || user?.companyId || user?.company?.companyId || '';
  const currentUserId = user?.userId ?? user?.id ?? null;

  const [monthValue, setMonthValue] = useState(getPreviousMonthValue);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [absentEmployees, setAbsentEmployees] = useState([]);

  const selectedMonth = useMemo(() => Number.parseInt(String(monthValue).split('-')[1], 10) || 0, [monthValue]);
  const selectedYear = useMemo(() => Number.parseInt(String(monthValue).split('-')[0], 10) || 0, [monthValue]);

  const fetchGenerated = async () => {
    if (!companyId || !selectedMonth || !selectedYear) return;
    setLoading(true);
    try {
      const res = await API.get('/salaryGenerations', {
        params: {
          companyId,
          salaryMonth: selectedMonth,
          salaryYear: selectedYear,
        },
      });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error('Failed to load generated salaries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenerated();
  }, [companyId, selectedMonth, selectedYear]);

  const handleGenerate = async () => {
    if (!companyId) {
      toast.error('Select a company first');
      return;
    }
    if (!selectedMonth || !selectedYear) {
      toast.error('Select month');
      return;
    }

    setGenerating(true);
    setAbsentEmployees([]);
    try {
      await API.post('/salaryGenerations/generate-monthly', {
        companyId,
        salaryMonth: selectedMonth,
        salaryYear: selectedYear,
        generatedBy: currentUserId,
      });
      toast.success('Salary generated successfully');
      await fetchGenerated();
    } catch (error) {
      const absent = error?.response?.data?.absentEmployees;
      if (Array.isArray(absent) && absent.length > 0) {
        setAbsentEmployees(absent);
        toast.error('Generation stopped: absent attendance found');
      } else {
        const message = error?.response?.data?.error || 'Salary generation failed';
        toast.error(String(message));
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadSpreadsheet = async () => {
    if (!companyId || !selectedMonth || !selectedYear) {
      toast.error('Select company and month first');
      return;
    }

    try {
      const res = await API.get('/salaryGenerations/download-spreadsheet', {
        params: {
          companyId,
          salaryMonth: selectedMonth,
          salaryYear: selectedYear,
        },
        responseType: 'blob',
      });
      const contentType = String(res?.headers?.['content-type'] || '').toLowerCase();
      if (contentType.includes('application/json')) {
        const text = await res.data.text();
        let parsed = {};
        try {
          parsed = JSON.parse(text);
        } catch (jsonErr) {
          parsed = {};
        }
        throw new Error(parsed.error || parsed.message || 'Failed to download spreadsheet');
      }
      const blob = new Blob(
        [res.data],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const contentDisposition = String(res?.headers?.['content-disposition'] || '');
      const nameMatch = /filename="?([^"]+)"?/i.exec(contentDisposition);
      link.download = nameMatch?.[1] || `salary-generation-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error?.message || 'Failed to download spreadsheet');
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 px-6">
      <div className="bg-white border rounded-lg p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Salary Month</label>
          <input
            type="month"
            value={monthValue}
            onChange={(e) => setMonthValue(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
          />
        </div>
        <Button type="button" onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generating...' : 'Generate Salary'}
        </Button>
        <Button type="button" variant="secondary" onClick={handleDownloadSpreadsheet} disabled={loading || rows.length === 0}>
          Download Spreadsheet
        </Button>
      </div>

      {absentEmployees.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-red-700">Salary generation blocked due to absent attendance:</p>
          <div className="mt-2 max-h-40 overflow-auto text-sm text-red-700">
            {absentEmployees.map((emp) => (
              <div key={`${emp.staffId}-${emp.staffNumber}`}>{emp.staffNumber || emp.staffId} - {emp.employeeName || '-'}</div>
            ))}
          </div>
        </div>
      )}

      <MasterTable
        columns={[
          'Staff Number',
          'Employee',
          'Present',
          'Week Off',
          'Paid Leave',
          'Paid Leave Types',
          'Unpaid Leave',
          'Gross',
          'Net',
        ]}
        loading={loading}
      >
        {rows.length === 0 ? (
          <tr>
            <td className="py-4 px-4 text-center text-gray-500" colSpan={9}>No generated records</td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.salaryGenerationId} className="border-t hover:bg-gray-50">
              <td className="py-3 px-4">{row.employee?.staffNumber || row.staffId}</td>
              <td className="py-3 px-4">{`${row.employee?.firstName || ''} ${row.employee?.lastName || ''}`.trim()}</td>
              <td className="py-3 px-4">{row.presentDays}</td>
              <td className="py-3 px-4">{row.weekOffDays}</td>
              <td className="py-3 px-4">{row.paidLeaveDays}</td>
              <td className="py-3 px-4">
                {Object.entries(row.paidLeaveTypeBreakdown || {}).length === 0
                  ? '-'
                  : Object.entries(row.paidLeaveTypeBreakdown || {}).map(([name, count]) => `${name}: ${count}`).join(', ')}
              </td>
              <td className="py-3 px-4">{row.unpaidLeaveDays}</td>
              <td className="py-3 px-4">{row.grossSalary}</td>
              <td className="py-3 px-4">{row.netSalary}</td>
            </tr>
          ))
        )}
      </MasterTable>
    </div>
  );
}
