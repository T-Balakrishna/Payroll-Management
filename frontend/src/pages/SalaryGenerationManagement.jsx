import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../api';
import { useAuth } from '../auth/AuthContext';
import MasterTable from '../components/common/MasterTable';
import Button from '../components/ui/Button';

const toDateOnly = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getPreviousMonthRange = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return {
    fromDate: toDateOnly(start),
    toDate: toDateOnly(end),
  };
};

const countMonthsInRange = (fromDate, toDate) => {
  if (!fromDate || !toDate) return 0;
  const start = new Date(fromDate);
  const end = new Date(toDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
};

const formatAmount = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return num.toFixed(2);
};

const buildAssignedEarningTotal = (details = []) => {
  const earnings = details.filter((d) => String(d.componentType).toLowerCase() === 'earning');
  if (earnings.length === 0) return '-';
  const total = earnings.reduce((sum, e) => sum + Number(e.baseAmount ?? 0), 0);
  return formatAmount(total);
};

export default function SalaryGenerationManagement({ selectedCompanyId }) {
  const { user } = useAuth();
  const companyId = selectedCompanyId || user?.companyId || user?.company?.companyId || '';
  const currentUserId = user?.userId ?? user?.id ?? null;
  const defaultRange = getPreviousMonthRange();

  const [fromDate, setFromDate] = useState(defaultRange.fromDate);
  const [toDate, setToDate] = useState(defaultRange.toDate);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sendingMail, setSendingMail] = useState(false);
  const [absentEmployees, setAbsentEmployees] = useState([]);
  const selectedMonth = useMemo(() => Number.parseInt(String(fromDate || '').slice(5, 7), 10) || 0, [fromDate]);
  const selectedYear = useMemo(() => Number.parseInt(String(fromDate || '').slice(0, 4), 10) || 0, [fromDate]);
  const monthsInPeriod = useMemo(() => countMonthsInRange(fromDate, toDate), [fromDate, toDate]);

  const fetchGenerated = async () => {
    if (!companyId || !fromDate || !toDate) return;
    setLoading(true);
    try {
      const res = await API.get('/salaryGenerations', {
        params: {
          companyId,
          fromDate,
          toDate,
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
  }, [companyId, fromDate, toDate]);

  const handleGenerate = async () => {
    if (!companyId) {
      toast.error('Select a company first');
      return;
    }
    if (!fromDate || !toDate) {
      toast.error('Select from and to dates');
      return;
    }
    if (fromDate > toDate) {
      toast.error('From date must be before or equal to To date');
      return;
    }

    setGenerating(true);
    setAbsentEmployees([]);
    try {
      await API.post('/salaryGenerations/generate-monthly', {
        companyId,
        fromDate,
        toDate,
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
    if (!companyId || !fromDate || !toDate) {
      toast.error('Select company and date range first');
      return;
    }
    if (fromDate > toDate) {
      toast.error('From date must be before or equal to To date');
      return;
    }

    try {
      const res = await API.get('/salaryGenerations/download-spreadsheet', {
        params: {
          companyId,
          fromDate,
          toDate,
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
      link.download = nameMatch?.[1] || `salary-generation-${fromDate}-to-${toDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error?.message || 'Failed to download spreadsheet');
    }
  };

  const handleDownloadPdf = async () => {
    if (!companyId || !fromDate || !toDate) {
      toast.error('Select company and date range first');
      return;
    }
    if (fromDate > toDate) {
      toast.error('From date must be before or equal to To date');
      return;
    }

    try {
      const res = await API.get('/salaryGenerations/download-pdf', {
        params: {
          companyId,
          fromDate,
          toDate,
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
        throw new Error(parsed.error || parsed.message || 'Failed to download PDF');
      }

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const contentDisposition = String(res?.headers?.['content-disposition'] || '');
      const nameMatch = /filename="?([^"]+)"?/i.exec(contentDisposition);
      link.download = nameMatch?.[1] || `salary-generation-${fromDate}-to-${toDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error?.message || 'Failed to download PDF');
    }
  };

  const handleDownloadEmployeeSlip = async (row) => {
    if (!companyId || !fromDate || !toDate || !row?.staffId) {
      toast.error('Missing company, date range, or employee');
      return;
    }
    try {
      const res = await API.get('/salaryGenerations/download-pdf', {
        params: {
          companyId,
          fromDate,
          toDate,
          staffId: row.staffId,
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
        throw new Error(parsed.error || parsed.message || 'Failed to download salary slip');
      }

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const contentDisposition = String(res?.headers?.['content-disposition'] || '');
      const nameMatch = /filename="?([^"]+)"?/i.exec(contentDisposition);
      const employeeName = `${row.employee?.firstName || ''} ${row.employee?.lastName || ''}`.trim().replace(/\s+/g, '_');
      const employeeNo = String(row.employee?.staffNumber || row.staffId || '').trim();
      link.download = nameMatch?.[1] || `${employeeName || 'Employee'}_${employeeNo || 'Staff'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error?.message || 'Failed to download salary slip');
    }
  };

  const handleSendMail = async () => {
    if (!companyId || !fromDate || !toDate) {
      toast.error('Select company and date range first');
      return;
    }
    if (fromDate > toDate) {
      toast.error('From date must be before or equal to To date');
      return;
    }
    setSendingMail(true);
    try {
      const res = await API.post('/salaryGenerations/send-mail', {
        companyId,
        fromDate,
        toDate,
      });
      const data = res?.data || {};
      toast.success(`Mail sent: ${data.sent || 0} sent, ${data.skippedNoEmail || 0} skipped, ${data.failed || 0} failed`);
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || 'Failed to send mail');
    } finally {
      setSendingMail(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 px-6">
      <div className="bg-white border rounded-lg p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
          />
        </div>
        <Button type="button" onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generating...' : 'Generate Salary'}
        </Button>
        <Button type="button" variant="secondary" onClick={handleDownloadSpreadsheet} disabled={loading || rows.length === 0}>
          Download Spreadsheet
        </Button>
        <Button type="button" variant="secondary" onClick={handleDownloadPdf} disabled={loading || rows.length === 0}>
          Download PDF
        </Button>
        <Button type="button" variant="secondary" onClick={handleSendMail} disabled={sendingMail || loading || rows.length === 0}>
          {sendingMail ? 'Sending...' : 'Send Mail'}
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
          'Staff / Earnings',
          'Months',
          'LOP Days',
          'Gross',
          'Net',
          'Slip',
        ]}
        loading={loading}
        wrapHeaders
        wrapCells
      >
        {rows.length === 0 ? (
          <tr>
            <td className="py-4 px-4 text-center text-gray-500" colSpan={12}>No generated records</td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.salaryGenerationId} className="border-t hover:bg-gray-50">
              <td className="py-3 px-4">
                <div className="font-medium text-slate-800">
                  {row.employee?.staffNumber || row.staffId || '-'}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Earnings (Assigned): {buildAssignedEarningTotal(row.salaryGenerationDetails || [])}
                </div>
              </td>
              <td className="py-3 px-4">{monthsInPeriod}</td>
              <td className="py-3 px-4">{Number(row.absentDays || 0) + Number(row.unpaidLeaveDays || 0)}</td>
              <td className="py-3 px-4">{row.grossSalary}</td>
              <td className="py-3 px-4">{row.netSalary}</td>
              <td className="py-3 px-4">
                <Button type="button" variant="secondary" onClick={() => handleDownloadEmployeeSlip(row)}>
                  Download Slip
                </Button>
              </td>
            </tr>
          ))
        )}
      </MasterTable>
    </div>
  );
}
