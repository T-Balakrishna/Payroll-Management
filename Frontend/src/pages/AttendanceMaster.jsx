import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const AttendanceMaster = () => {
  const { t } = useTranslation();
  const [attendances, setAttendances] = useState([]);
  const [employeeNumberFilter, setEmployeeNumberFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState('daily');
  const [monthFilter, setMonthFilter] = useState('1');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    token = sessionStorage.getItem("token");
    decoded = token ? jwtDecode(token) : "";
    userNumber = decoded?.userNumber;
  }, []);

  const fetchAttendances = async () => {
    setLoading(true);
    setError(null);
    try {
      let params = {};
      if (employeeNumberFilter) params.employeeNumber = employeeNumberFilter;
      if (reportType === 'daily' && dateFilter) {
        params.date = dateFilter;
      } else if (reportType === 'monthly') {
        const startDate = `${yearFilter}-${monthFilter.padStart(2, '0')}-01`;
        const endDate = new Date(yearFilter, monthFilter, 0).toISOString().split('T')[0];
        params.startDate = startDate;
        params.endDate = endDate;
      } else if (reportType === 'yearly') {
        params.startDate = `${yearFilter}-01-01`;
        params.endDate = `${yearFilter}-12-31`;
      }

      const response = await axios.get('http://localhost:5000/api/attendance', { params });
      setAttendances(response.data);
      if (response.data.length === 0) {
        setError(t('noAttendanceRecordsFound', { 
          period: reportType, 
          employeeFilter: employeeNumberFilter ? t('employeeNumber') : ''
        }));
      }
    } catch (error) {
      console.error('Error fetching attendances:', error);
      if (error.response && error.response.status === 404) {
        setError(t('attendanceEndpointNotFound'));
      } else {
        setError(t('failedToFetchAttendance'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendances();
  }, [employeeNumberFilter, dateFilter, reportType, monthFilter, yearFilter]);

  const handleEdit = (attendance) => {
    setEditingId(attendance.attendanceId);
    setEditStatus(attendance.attendanceStatus);
  };

  const saveEdit = async (id) => {
    try {
      await axios.put(`http://localhost:5000/api/attendance/${id}`, { attendanceStatus: editStatus });
      setEditingId(null);
      setError(null);
      fetchAttendances();
    } catch (error) {
      console.error('Error updating attendance:', error);
      setError(t('failedToUpdateAttendance'));
    }
  };

  return (
    <div className="container mx-auto mt-8 px-4">
      <h1 className="text-3xl font-bold mb-6">{t('attendanceMaster')}</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center text-gray-600 mb-4">{t('loadingAttendanceRecords')}</div>
      )}

      <div className="bg-white shadow-md rounded-lg mb-6">
        <div className="bg-gray-100 px-4 py-3 rounded-t-lg">
          <h2 className="text-lg font-semibold">{t('searchAttendance')}</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="employee-number-filter" className="block text-sm font-medium text-gray-700 mb-1">
                {t('employeeNumber')}
              </label>
              <input
                type="text"
                id="employee-number-filter"
                className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={employeeNumberFilter}
                onChange={(e) => setEmployeeNumberFilter(e.target.value)}
                placeholder={t('enterEmployeeNumber')}
              />
            </div>
            {reportType === 'daily' && (
              <div>
                <label htmlFor="report-date" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('date')}
                </label>
                <input
                  type="date"
                  id="report-date"
                  className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg">
        <div className="bg-gray-100 px-4 py-3 rounded-t-lg">
          <h2 className="text-lg font-semibold">
            {reportType === 'daily' && t('dailyAttendanceFor', { date: dateFilter })}
            {employeeNumberFilter && ` (${t('employeeNumber')}: ${employeeNumberFilter})`}
          </h2>
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('employeeNumber')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendances.map((attendance) => (
                  <tr key={attendance.attendanceId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attendance.employeeNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attendance.attendanceDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingId === attendance.attendanceId ? (
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          {['Present', 'Absent', 'Half-Day', 'Leave', 'Holiday', 'Permission'].map((status) => (
                            <option key={status} value={status}>{t(status.toLowerCase())}</option>
                          ))}
                        </select>
                      ) : (
                        t(attendance.attendanceStatus.toLowerCase())
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingId === attendance.attendanceId ? (
                        <>
                          <button
                            className="text-green-600 hover:text-green-800 mr-2"
                            onClick={() => saveEdit(attendance.attendanceId)}
                          >
                            {t('save')}
                          </button>
                          <button
                            className="text-gray-600 hover:text-gray-800"
                            onClick={() => setEditingId(null)}
                          >
                            {t('cancel')}
                          </button>
                        </>
                      ) : (
                        <button
                          className="text-indigo-600 hover:text-indigo-800"
                          onClick={() => handleEdit(attendance)}
                        >
                          {t('edit')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceMaster;