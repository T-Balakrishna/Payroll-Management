import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const ReportGenerator = () => {
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [employeeNumberFilter, setEmployeeNumberFilter] = useState('');
  const [reportType, setReportType] = useState('all'); // 'all', 'daily', 'monthly', 'yearly'
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [monthFilter, setMonthFilter] = useState('1');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

  // Define fields for each model with user-friendly labels
  const modelFields = {
    Attendance: [
      { name: 'attendanceId', label: 'Attendance ID' },
      { name: 'employeeNumber', label: 'Employee Number' },
      { name: 'attendanceDate', label: 'Date' },
      { name: 'attendanceStatus', label: 'Status' },
    ],
    Biometric: [
      { name: 'biometricId', label: 'Biometric ID' },
      { name: 'biometricNumber', label: 'Biometric Number' },
      { name: 'employeeNumber', label: 'Employee Number' },
    ],
    Leave: [
      { name: 'leaveId', label: 'Leave ID' },
      { name: 'employeeNumber', label: 'Employee Number' },
      { name: 'leaveTypeId', label: 'Leave Type ID' },
      { name: 'startDate', label: 'Start Date' },
      { name: 'endDate', label: 'End Date' },
      { name: 'status', label: 'Status' },
      { name: 'reason', label: 'Reason' },
      { name: 'createdBy', label: 'Created By' },
      { name: 'updatedBy', label: 'Updated By' },
    ],
  };

  const handleModelSelect = (model) => {
    setSelectedModel(model);
    setSelectedFields([]); // Reset selected fields when model changes
    setData([]);
    setError(null);
    setEmployeeNumberFilter('');
    setReportType('all');
    setDateFilter(new Date().toISOString().split('T')[0]);
    setMonthFilter('1');
    setYearFilter(new Date().getFullYear().toString());
  };

  const handleFieldToggle = (fieldName) => {
    setSelectedFields((prev) =>
      prev.includes(fieldName)
        ? prev.filter((f) => f !== fieldName)
        : [...prev, fieldName]
    );
  };

  const handleSelectAll = () => {
    if (selectedFields.length === modelFields[selectedModel].length) {
      setSelectedFields([]); // Deselect all
    } else {
      setSelectedFields(modelFields[selectedModel].map((field) => field.name)); // Select all
    }
  };

  const fetchData = async () => {
    if (!selectedModel || selectedFields.length === 0) {
      setError('Please select a model and at least one field.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const endpoint = `http://localhost:5000/api/${selectedModel.toLowerCase()}`;
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

      const response = await axios.get(endpoint, { params });
      setData(response.data);
      if (response.data.length === 0) {
        setError(`No data found for ${selectedModel}.`);
      } else {
        generateExcelReport(response.data);
      }
    } catch (error) {
      console.error(`Error fetching ${selectedModel} data:`, error);
      if (error.response && error.response.status === 404) {
        setError(`${selectedModel} endpoint not found. Please check backend configuration.`);
      } else {
        setError(`Failed to fetch ${selectedModel} data. Please ensure the backend server is running.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateExcelReport = (reportData) => {
    if (reportData.length === 0) {
      setError(`No ${selectedModel} data available to generate a report.`);
      return;
    }

    const data = reportData.map((item) => {
      const row = {};
      selectedFields.forEach((field) => {
        const fieldLabel = modelFields[selectedModel].find((f) => f.name === field).label;
        row[fieldLabel] = item[field] || 'N/A'; // Handle null/undefined values
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${selectedModel} Report`);
    const reportName = `${selectedModel}_Report_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, reportName);
  };

  return (
    <div className="container mx-auto mt-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Report Generator</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center text-gray-600 mb-4">Fetching data...</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {['Attendance', 'Biometric', 'Leave'].map((model) => (
          <div
            key={model}
            className={`p-6 bg-white shadow-md rounded-lg cursor-pointer hover:bg-indigo-50 ${
              selectedModel === model ? 'border-2 border-indigo-600' : ''
            }`}
            onClick={() => handleModelSelect(model)}
          >
            <h2 className="text-lg font-semibold text-center">{model}</h2>
          </div>
        ))}
      </div>

      {selectedModel && (
        <div className="bg-white shadow-md rounded-lg mb-6">
          <div className="bg-gray-100 px-4 py-3 rounded-t-lg">
            <h2 className="text-lg font-semibold">Select Fields for {selectedModel} Report</h2>
          </div>
          <div className="p-4">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="select-all"
                checked={selectedFields.length === modelFields[selectedModel].length}
                onChange={handleSelectAll}
                className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="select-all" className="text-sm font-medium text-gray-700">
                Select All
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {modelFields[selectedModel].map((field) => (
                <div key={field.name} className="flex items-center">
                  <input
                    type="checkbox"
                    id={field.name}
                    checked={selectedFields.includes(field.name)}
                    onChange={() => handleFieldToggle(field.name)}
                    className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor={field.name} className="text-sm text-gray-700">
                    {field.label}
                  </label>
                </div>
              ))}
            </div>

            {/* Filter Section */}
            <div className="mb-6">
              <h3 className="text-md font-semibold mb-2">Filters</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="employee-number-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Number (e.g., CSE1 or CSE)
                  </label>
                  <input
                    type="text"
                    id="employee-number-filter"
                    className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={employeeNumberFilter}
                    onChange={(e) => setEmployeeNumberFilter(e.target.value)}
                    placeholder="Enter Employee Number or Department"
                  />
                </div>
                <div>
                  <label htmlFor="report-type" className="block text-sm font-medium text-gray-700 mb-1">
                    Report Type
                  </label>
                  <select
                    id="report-type"
                    className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="daily">Daily</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                {reportType === 'daily' && (
                  <div>
                    <label htmlFor="report-date" className="block text-sm font-medium text-gray-700 mb-1">
                      Date
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
                {reportType === 'monthly' && (
                  <>
                    <div>
                      <label htmlFor="report-month" className="block text-sm font-medium text-gray-700 mb-1">
                        Month
                      </label>
                      <select
                        id="report-month"
                        className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {new Date(0, i).toLocaleString('default', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="report-year" className="block text-sm font-medium text-gray-700 mb-1">
                        Year
                      </label>
                      <input
                        type="number"
                        id="report-year"
                        className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                      />
                    </div>
                  </>
                )}
                {reportType === 'yearly' && (
                  <div>
                    <label htmlFor="report-year" className="block text-sm font-medium text-gray-700 mb-1">
                      Year
                    </label>
                    <input
                      type="number"
                      id="report-year"
                      className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={yearFilter}
                      onChange={(e) => setYearFilter(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={fetchData}
                className="w-full sm:w-auto bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={selectedFields.length === 0}
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportGenerator;