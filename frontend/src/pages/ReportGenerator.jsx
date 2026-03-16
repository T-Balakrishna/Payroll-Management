import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Download, Eye, FileSearch, Filter, Layers3, LoaderCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../api';
import MasterTable from '../components/common/MasterTable';

const DOMAIN_STYLES = {
  Attendance: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Payroll: 'bg-blue-50 text-blue-700 border-blue-200',
  Leave: 'bg-amber-50 text-amber-700 border-amber-200',
  Permission: 'bg-violet-50 text-violet-700 border-violet-200',
  Loan: 'bg-rose-50 text-rose-700 border-rose-200',
  Employee: 'bg-slate-50 text-slate-700 border-slate-200',
};

const formatCell = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return Number(value).toLocaleString();
  return String(value);
};

export default function ReportGenerator({
  companyId,
  departmentId,
  selectedCompanyId,
  selectedCompanyName,
  role,
}) {
  const effectiveCompanyId = selectedCompanyId || companyId || '';
  const effectiveDepartmentId = departmentId || '';

  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [reports, setReports] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedReportKey, setSelectedReportKey] = useState('');
  const [departmentMenuOpen, setDepartmentMenuOpen] = useState(false);
  const [preview, setPreview] = useState({ columns: [], data: [], summary: null });
  const [filters, setFilters] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    return {
      companyId: effectiveCompanyId ? String(effectiveCompanyId) : '',
      departmentIds: effectiveDepartmentId ? [String(effectiveDepartmentId)] : [],
      startDate: `${year}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
      endDate: today.toISOString().slice(0, 10),
    };
  });

  const normalizedRole = String(role || '').toLowerCase().replace(/\s+/g, '');
  const canChooseCompany = normalizedRole === 'superadmin';
  const canChooseDepartment = ['superadmin', 'admin', 'departmentadmin'].includes(normalizedRole);

  const selectedReport = useMemo(
    () => reports.find((report) => report.key === selectedReportKey) || null,
    [reports, selectedReportKey]
  );

  const categories = useMemo(
    () => ['All', ...new Set(reports.map((report) => report.category))],
    [reports]
  );

  const visibleDepartments = useMemo(() => {
    if (!filters.companyId) return departments;
    return departments.filter((department) => Number(department.companyId) === Number(filters.companyId));
  }, [departments, filters.companyId]);

  const visibleReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesCategory = category === 'All' || report.category === category;
      const matchesSearch =
        !query ||
        [report.name, report.category, report.domain, report.description]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [reports, category, search]);

  const summaryCards = useMemo(() => {
    const counts = reports.reduce((acc, report) => {
      acc[report.category] = (acc[report.category] || 0) + 1;
      return acc;
    }, {});

    return [
      { label: 'Total Reports', value: reports.length },
      { label: 'Attendance', value: counts.Attendance || 0 },
      { label: 'Payroll', value: counts.Payroll || 0 },
      { label: 'Leave / Others', value: (counts.Leave || 0) + (counts.Permission || 0) + (counts.Employee || 0) + (counts.Loan || 0) },
    ];
  }, [reports]);

  useEffect(() => {
    const loadPage = async () => {
      setLoadingCatalog(true);
      try {
        const [catalogRes, companiesRes, departmentsRes] = await Promise.all([
          API.get('/reportGenerator/catalog'),
          API.get('/companies'),
          API.get('/departments'),
        ]);

        const catalog = catalogRes.data?.data || [];
        setReports(catalog);
        setCompanies(companiesRes.data || []);
        setDepartments(departmentsRes.data || []);

        if (catalog.length) {
          setSelectedReportKey((current) => current || catalog[0].key);
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to load report generator');
      } finally {
        setLoadingCatalog(false);
      }
    };

    loadPage();
  }, []);

  useEffect(() => {
    if (!canChooseCompany && effectiveCompanyId) {
      setFilters((current) => ({ ...current, companyId: String(effectiveCompanyId) }));
    }
  }, [canChooseCompany, effectiveCompanyId]);

  useEffect(() => {
    if (!canChooseDepartment && effectiveDepartmentId) {
      setFilters((current) => ({ ...current, departmentIds: [String(effectiveDepartmentId)] }));
    }
  }, [canChooseDepartment, effectiveDepartmentId]);

  useEffect(() => {
    setFilters((current) => {
      const validDepartmentIds = current.departmentIds.filter((departmentIdValue) =>
        visibleDepartments.some((department) => String(department.departmentId) === String(departmentIdValue))
      );

      if (
        validDepartmentIds.length === current.departmentIds.length &&
        validDepartmentIds.every((item, index) => item === current.departmentIds[index])
      ) {
        return current;
      }

      return { ...current, departmentIds: validDepartmentIds };
    });
  }, [visibleDepartments]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const toggleDepartment = (departmentIdValue) => {
    setFilters((current) => {
      const exists = current.departmentIds.includes(departmentIdValue);
      return {
        ...current,
        departmentIds: exists
          ? current.departmentIds.filter((item) => item !== departmentIdValue)
          : [...current.departmentIds, departmentIdValue],
      };
    });
  };

  const selectedDepartmentLabel = useMemo(() => {
    if (!filters.departmentIds.length) return 'All departments';
    const selectedNames = visibleDepartments
      .filter((department) => filters.departmentIds.includes(String(department.departmentId)))
      .map((department) => department.departmentName);
    if (selectedNames.length <= 2) return selectedNames.join(', ');
    return `${selectedNames.slice(0, 2).join(', ')} +${selectedNames.length - 2}`;
  }, [filters.departmentIds, visibleDepartments]);

  const buildParams = () => ({
    reportKey: selectedReportKey,
    companyId: filters.companyId || undefined,
    departmentIds: filters.departmentIds.length ? filters.departmentIds.join(',') : undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  });

  const generatePreview = async () => {
    if (!selectedReportKey) {
      toast.warn('Select a report first');
      return;
    }

    setLoadingPreview(true);
    try {
      const response = await API.get('/reportGenerator/preview', { params: buildParams() });
      setPreview({
        columns: response.data?.columns || [],
        data: response.data?.data || [],
        summary: response.data?.summary || null,
      });
      toast.success('Report preview generated');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to generate preview');
      setPreview({ columns: [], data: [], summary: null });
    } finally {
      setLoadingPreview(false);
    }
  };

  const downloadReport = async () => {
    if (!selectedReportKey) {
      toast.warn('Select a report first');
      return;
    }

    setDownloading(true);
    try {
      const response = await API.get('/reportGenerator/download', {
        params: buildParams(),
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${selectedReportKey}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Report download started');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 px-6 pb-6">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-blue-100">
              <Layers3 className="h-4 w-4" />
              Report Generator
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">Generate operational, payroll, leave, and compliance reports from one page</h2>
            <p className="text-sm text-slate-200">
              The catalog is cleaned up to favor generic reports. Pick one, filter by company, departments, and date range, then preview or export it.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Report catalog</h3>
              <p className="text-sm text-slate-500">Search and pick any of the configured report definitions.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reports..."
                className="h-11 min-w-64 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {loadingCatalog ? (
              <div className="col-span-full flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-500">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Loading reports...
              </div>
            ) : (
              visibleReports.map((report) => (
                <button
                  key={report.key}
                  type="button"
                  onClick={() => setSelectedReportKey(report.key)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selectedReportKey === report.key
                      ? 'border-blue-400 bg-blue-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-slate-900">{report.name}</h4>
                      <p className="mt-1 text-sm text-slate-500">{report.description}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${DOMAIN_STYLES[report.category] || DOMAIN_STYLES.Employee}`}>
                      {report.category}
                    </span>
                  </div>
                  <div className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {report.domain} • {report.recommendedPeriod}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900">
              <Filter className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Filters</h3>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-600">
                <span>Company</span>
                <select
                  value={filters.companyId}
                  disabled={!canChooseCompany}
                  onChange={(event) => {
                    updateFilter('companyId', event.target.value);
                    setDepartmentMenuOpen(false);
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                >
                  <option value="">{selectedCompanyName || 'All companies'}</option>
                  {companies.map((company) => (
                    <option key={company.companyId} value={company.companyId}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-2 text-sm text-slate-600">
                <span className="block">Departments</span>
                <div className="relative">
                  <button
                    type="button"
                    disabled={!canChooseDepartment}
                    onClick={() => setDepartmentMenuOpen((current) => !current)}
                    className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  >
                    <span className="truncate">{selectedDepartmentLabel}</span>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </button>

                  {departmentMenuOpen && canChooseDepartment && (
                    <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                      <button
                        type="button"
                        onClick={() => setFilters((current) => ({ ...current, departmentIds: [] }))}
                        className="mb-2 w-full rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50"
                      >
                        Clear selection
                      </button>
                      {visibleDepartments.map((department) => {
                        const value = String(department.departmentId);
                        const checked = filters.departmentIds.includes(value);
                        return (
                          <label
                            key={department.departmentId}
                            className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                          >
                            <span>{department.departmentName}</span>
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded border ${
                                checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-transparent'
                              }`}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </span>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={checked}
                              onChange={() => toggleDepartment(value)}
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <label className="space-y-2 text-sm text-slate-600">
                <span>Start date</span>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(event) => updateFilter('startDate', event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-2 text-sm text-slate-600">
                <span>End date</span>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(event) => updateFilter('endDate', event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Selected report</p>
              <h4 className="mt-2 text-base font-semibold text-slate-900">{selectedReport?.name || 'Choose a report from the catalog'}</h4>
              <p className="mt-1 text-sm text-slate-500">{selectedReport?.description || 'The preview will use the currently selected generic report definition.'}</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={generatePreview}
                disabled={loadingPreview || !selectedReportKey}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingPreview ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Generate Preview
              </button>
              <button
                type="button"
                onClick={downloadReport}
                disabled={downloading || !selectedReportKey}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {downloading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export CSV
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <FileSearch className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Preview summary</h3>
                <p className="text-sm text-slate-500">Generated rows will appear in the table below.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Rows</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{preview.summary?.rowCount || 0}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Category</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{preview.summary?.category || '-'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Generated</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {preview.summary?.generatedAt ? new Date(preview.summary.generatedAt).toLocaleString() : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Report preview data</h3>
          <p className="text-sm text-slate-500">Preview is capped to the latest 100 rows for faster loading.</p>
        </div>

        <MasterTable
          columns={preview.columns.length ? preview.columns : ['Report Data']}
          loading={loadingPreview}
          emptyMessage="Generate a preview to inspect report rows"
          defaultRowsPerPage={10}
        >
          {preview.data.map((row, index) => (
            <tr key={`${selectedReportKey}-${index}`} className="border-t border-gray-100">
              {Object.keys(row).map((key) => (
                <td key={key} className="px-4 py-3 text-sm text-slate-700">
                  {formatCell(row[key])}
                </td>
              ))}
            </tr>
          ))}
        </MasterTable>
      </section>
    </div>
  );
}
