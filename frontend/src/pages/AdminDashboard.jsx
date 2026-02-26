import React, { useEffect, useMemo, useState } from 'react';
import API from '../api';
import { useAuth } from '../auth/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import {
  Users, Bus, Building, Building2, Award, Clock, Calendar, LogOut, Home,
  ChevronLeft, ChevronRight, Activity, Settings, Monitor, CheckCircle,
  List, FileText, FileBarChart, FileLineChart, AlarmClockCheck, UserCheck,
  Shield, Wallet, Receipt, History, HandCoins, Landmark, Briefcase, Fingerprint,
  FileSearch, Scale, TrendingUp
} from 'lucide-react';

import AddUser from './AddUser.jsx';
import CompanyMaster from './CompanyMaster.jsx';
import DepartmentMaster from './DepartmentMaster.jsx';
import DesignationMaster from './DesignationMaster.jsx';
import RoleMaster from './RoleMaster.jsx';
import EmployeeGradeMaster from './EmployeeGradeMaster.jsx';
import BiometricDeviceMaster from './BiometricDeviceMaster.jsx';
import BiometricDeviceAssignMaster from './BiometricDeviceAssignMaster.jsx';
import BiometricPunchMaster from './BiometricPunchMaster.jsx';
import AttendanceMaster from './AttendanceMaster.jsx';
import ShiftTypeMaster from './ShiftTypeMaster.jsx';
import ShiftAssignmentMaster from './ShiftAssignmentMaster.jsx';
import LeaveTypeMaster from './LeaveTypeMaster.jsx';
import LeavePolicyManagement from './LeavePolicyManagement.jsx';
import HolidayPlanMaster from './HolidayPlanMaster.jsx';
import LeaveAllocation from './LeaveAllocation.jsx';
import LeavePeriodMaster from './LeavePeriodMaster.jsx';
import AllotedLeaveMaster from './AllotedLeaveMaster.jsx';
// import LeaveRequestManagement from './LeaveRequestManagement.jsx';
import LeaveApproval from './LeaveApproval.jsx';
import LeaveHistory from './LeaveHistory.jsx';
import SalaryComponentManagement from './SalaryComponentMaster.jsx';
import SalaryAssignmentMaster from './SalaryAssignmentMaster.jsx';
import SalaryGenerationManagement from './SalaryGenerationManagement.jsx';
// import SalaryRevisionHistory from './SalaryRevisionHistory.jsx';
// import EmployeeLoanManagement from './EmployeeLoanManagement.jsx';
// import StatutoryReports from './StatutoryReports.jsx';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [role, setRole] = useState('');
  const [companyId, setCompanyId] = useState(null);
  const [departmentId, setDepartmentId] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);

  const [dashboardData, setDashboardData] = useState({
    totalActiveEmployees: { maleCount: 0, femaleCount: 0, totalCount: 0 },
    departmentWiseActive: [],
    departmentCount: 0,
    designationWise: [],
    monthlyAttendance: [],
    leaveStats: { approved: 0, pending: 0, rejected: 0 },
  });

  const normalizeRole = (value) => String(value || '').toLowerCase().replace(/\s+/g, '');

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    }),
    []
  );

  const attendanceChartData = useMemo(() => {
    const monthly = Array.isArray(dashboardData.monthlyAttendance) ? dashboardData.monthlyAttendance : [];
    return {
      labels: monthly.map((row) => row?.month || '-'),
      datasets: [
        {
          label: t('attendance') || 'Attendance',
          data: monthly.map((row) => Number(row?.count || 0)),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.2)',
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [dashboardData.monthlyAttendance, t]);

  const leaveChartData = useMemo(
    () => ({
      labels: ['Approved', 'Pending', 'Rejected'],
      datasets: [
        {
          data: [
            Number(dashboardData.leaveStats?.approved || 0),
            Number(dashboardData.leaveStats?.pending || 0),
            Number(dashboardData.leaveStats?.rejected || 0),
          ],
          backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
          borderWidth: 1,
        },
      ],
    }),
    [dashboardData.leaveStats]
  );

  const employeeBreakdownData = useMemo(
    () => ({
      labels: ['Male', 'Female'],
      datasets: [
        {
          data: [
            Number(dashboardData.totalActiveEmployees?.maleCount || 0),
            Number(dashboardData.totalActiveEmployees?.femaleCount || 0),
          ],
          backgroundColor: ['rgba(59,130,246,0.45)', 'rgba(236,72,153,0.45)'],
          borderColor: ['#3b82f6', '#ec4899'],
        },
      ],
    }),
    [dashboardData.totalActiveEmployees]
  );

  const fetchCompanies = async () => {
    try {
      const res = await API.get('/companies');
      setCompanies(res.data || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const fetchDashboardData = async () => {
    if (!companyId) return;
    setLoading(true);

    const params = {};
    if (normalizeRole(role) === 'departmentadmin' && departmentId) params.departmentId = departmentId;

    try {
      const [empRes, deptRes, attRes, leaveRes] = await Promise.allSettled([
        API.get(`/employees/activecount/${companyId}`, { params }),
        API.get(`/departments/count/${companyId}`, { params }),
        API.get(`/attendances/monthlyattendancesummary/${companyId}`, { params }),
        API.get(`/leaveRequests/stats/${companyId}`, { params }),
      ]);

      setDashboardData({
        totalActiveEmployees:
          empRes.status === 'fulfilled'
            ? empRes.value.data
            : { maleCount: 0, femaleCount: 0, totalCount: 0 },
        departmentCount:
          deptRes.status === 'fulfilled' ? deptRes.value.data.count || 0 : 0,
        monthlyAttendance: attRes.status === 'fulfilled' ? attRes.value.data || [] : [],
        leaveStats:
          leaveRes.status === 'fulfilled'
            ? leaveRes.value.data || { approved: 0, pending: 0, rejected: 0 }
            : { approved: 0, pending: 0, rejected: 0 },
        departmentWiseActive: [],
        designationWise: [],
      });
    } catch (err) {
      console.error('Dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const currentRole = user.role || '';
    setRole(currentRole);

    if (normalizeRole(currentRole) === 'superadmin') {
      fetchCompanies();
    }

    if (user.userNumber) {
      API.get(`/users/getCompany/${user.userNumber}`)
        .then((res) => {
          if (res?.data?.companyId) {
            setCompanyId(res.data.companyId);
            setCompanyName(res.data.companyName || '');
          }
        })
        .catch(() => {});

      if (normalizeRole(currentRole) === 'departmentadmin') {
        API.get(`/users/getDepartment/${user.userNumber}`)
          .then((res) => {
            if (res?.data) {
              setDepartmentId(res.data.departmentId || null);
              setDepartmentName(res.data.departmentName || '');
              setCompanyId(res.data.companyId || null);
              setCompanyName(res.data.companyName || '');
            }
          })
          .catch(() => {});
      }
    }
  }, [user]);

  useEffect(() => {
    if (activePage === 'dashboard' && companyId) {
      fetchDashboardData();
    }
  }, [activePage, companyId, departmentId, role]);

  const menuItems = useMemo(() => {
    const items = [
      { id: 'dashboard', label: t('Dashboard'), icon: Home, color: 'text-blue-500', category: 'General' },
      { id: 'users', label: t('Add User'), icon: Users, color: 'text-emerald-500', category: 'General' },
      { id: 'roles', label: t('Role Management'), icon: Shield, color: 'text-blue-500', category: 'General' },

      { id: 'department', label: t('Department Master'), icon: Building2, color: 'text-indigo-500', category: 'Organization' },
      { id: 'designation', label: t('Designation Master'), icon: Award, color: 'text-pink-500', category: 'Organization' },
      { id: 'employeeGrade', label: t('Employee Grade Master'), icon: List, color: 'text-amber-500', category: 'Organization' },

    // Attendance Section
    { id: 'attendance', label: t('Attendance Master'), icon: Activity, color: 'text-emerald-600', category: 'Attendance' },
    { id: 'shiftType', label: t('Shift Type Master'), icon: Clock, color: 'text-cyan-500', category: 'Attendance' },
    { id: 'shiftAssignment', label: t('Shift Assignment Master'), icon: Briefcase, color: 'text-blue-400', category: 'Attendance' },
    { id: 'biometricDevice', label: t('Biometric Device Master'), icon: Monitor, color: 'text-slate-500', category: 'Attendance' },
    { id: 'biometricAssign', label: t('Biometric Assign Master'), icon: Fingerprint, color: 'text-indigo-600', category: 'Attendance' },
    { id: 'punches', label: t('Biometric Punch Master'), icon: Fingerprint, color: 'text-purple-600', category: 'Attendance' },
    
    // Leave Section
    { id: 'leaveType', label: t('Leave Type Master'), icon: List, color: 'text-cyan-600', category: 'Leave' },
    { id: 'leavePeriod', label: t('Leave Period Master'), icon: Calendar, color: 'text-amber-600', category: 'Leave' },
    { id: 'leavePolicy', label: t('Leave Policy Master'), icon: Shield, color: 'text-blue-600', category: 'Leave' },
    { id: 'leaveAllocation', label: t('Leave Allocation'), icon: FileBarChart, color: 'text-orange-500', category: 'Leave' },
    { id: 'allotedLeave', label: t('Alloted Leave Master'), icon: List, color: 'text-teal-500', category: 'Leave' },
    { id: 'leaveApproval', label: t('Leave Approval'), icon: UserCheck, color: 'text-green-600', category: 'Leave' },
    { id: 'leaveHistory', label: t('requestHistory'), icon: History, color: 'text-slate-400', category: 'Leave' },
    { id: 'holidayPlan', label: t('Holiday Master'), icon: Calendar, color: 'text-yellow-600', category: 'Leave' },

    // Payroll Section
    { id: 'salaryComponent', label: t('Salary Component Master'), icon: HandCoins, color: 'text-emerald-500', category: 'Organization' },
    { id: 'salaryMaster', label: t('Salary Assignment Master'), icon: Landmark, color: 'text-emerald-700', category: 'Payroll' },
    { id: 'salaryGeneration', label: t('processPayroll'), icon: Receipt, color: 'text-blue-600', category: 'Payroll' },
    { id: 'salaryRevision', label: t('revisionHistory'), icon: History, color: 'text-slate-500', category: 'Payroll' },
    { id: 'employeeLoan', label: t('loansAdvances'), icon: HandCoins, color: 'text-amber-600', category: 'Payroll' },
    

    // Analytics & Settings
    { id: 'reportgenerator', label: t('customReports'), icon: FileSearch, color: 'text-blue-500', category: 'Reports' },
    { id: 'statutory', label: t('statutoryReports'), icon: Scale, color: 'text-red-700', category: 'Reports' },
    ].filter((item) => !item.roles || item.roles.includes(role));
    return items;
  }, [role, t]);

  const pageTitles = useMemo(() => {
    const titleMap = { dashboard: t('Dashboard') || 'Dashboard' };
    menuItems.forEach((item) => {
      titleMap[item.id] = item.label;
    });
    return titleMap;
  }, [menuItems, t]);

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* 4 Main Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
          <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">{t('totalEmployees')}</p>
          <h3 className="text-4xl font-bold mt-2">{dashboardData.totalActiveEmployees.totalCount}</h3>
          <div className="mt-4 flex gap-4 text-xs opacity-80">
            <span>M: {dashboardData.totalActiveEmployees.maleCount}</span>
            <span>F: {dashboardData.totalActiveEmployees.femaleCount}</span>
          </div>
        </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">{t('totalDepartments') || 'Total Departments'}</p>
                <h3 className="text-3xl font-bold mt-2">{dashboardData.departmentCount || 0}</h3>
              </div>
              <Building2 className="w-12 h-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">{t('pendingLeaves') || 'Pending Leaves'}</p>
                <h3 className="text-3xl font-bold mt-2">{dashboardData.leaveStats.pending}</h3>
              </div>
              <Clock className="w-12 h-12 text-amber-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">{t('approvedLeaves') || 'Approved Leaves'}</p>
                <h3 className="text-3xl font-bold mt-2">{dashboardData.leaveStats.approved}</h3>
              </div>
              <UserCheck className="w-12 h-12 text-purple-200" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              {t('monthlyAttendanceTrend') || 'Monthly Attendance Trend'}
            </h3>
            <div className="h-80">
              <Line id="admin-attendance-chart" redraw data={attendanceChartData} options={chartOptions} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              {t('leaveStatistics') || 'Leave Statistics'}
            </h3>
            <div className="h-80">
              <Doughnut id="admin-leave-chart" redraw data={leaveChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            {t('employeeBreakdown') || 'Employee Breakdown'}
          </h3>
          <div className="h-80 max-w-md">
            <Bar
              id="admin-employee-breakdown-chart"
              redraw
              data={{
                labels: employeeBreakdownData.labels,
                datasets: [
                  {
                    label: t('employees') || 'Employees',
                    data: employeeBreakdownData.datasets[0].data,
                    backgroundColor: employeeBreakdownData.datasets[0].backgroundColor,
                    borderColor: employeeBreakdownData.datasets[0].borderColor,
                    borderWidth: 1,
                    borderRadius: 8,
                  },
                ],
              }}
              options={chartOptions}
            />
          </div>
        </div>
      </div>
    );

  const renderPage = () => {
    const common = {
      companyId,
      companyName,
      departmentId,
      departmentName,
      role,
      userRole: role,
      selectedCompanyId: companyId,
      selectedCompanyName: companyName,
      userId: user?.id,
    };

    switch (activePage) {
      case "dashboard": return renderDashboard();
      case "users": return <AddUser {...common} />;
      case "company": return <CompanyMaster {...common} />;
       case "department": return <DepartmentMaster {...common} />;
       case "designation": return <DesignationMaster {...common} />;
       case "roles": return <RoleMaster {...common} />;
      case "employeeGrade": return <EmployeeGradeMaster {...common} />;
      case "attendance": return <AttendanceMaster {...common} />;
      case "shiftType": return <ShiftTypeMaster {...common} />;
      case "shiftAssignment": return <ShiftAssignmentMaster {...common} />;
      case "biometricDevice": return <BiometricDeviceMaster {...common} />;
      case "biometricAssign": return <BiometricDeviceAssignMaster {...common} />;
      case "punches": return <BiometricPunchMaster {...common} />;
      case "holidayPlan": return <HolidayPlanMaster {...common} />;
      case "leaveType": return <LeaveTypeMaster {...common} />;
      case "leavePeriod": return <LeavePeriodMaster {...common} />;
      case "leavePolicy": return <LeavePolicyManagement {...common} />;
      case "leaveAllocation": return <LeaveAllocation {...common} />;
      case "allotedLeave": return <AllotedLeaveMaster {...common} />;
      // case "leaveRequest": return <LeaveRequestManagement {...common} />;
      case "leaveApproval": return <LeaveApproval {...common} />;
      case "leaveHistory": return <LeaveHistory {...common} />;
      case "salaryComponent": return <SalaryComponentManagement {...common} />;
      case "salaryMaster": return <SalaryAssignmentMaster {...common} />;
      case "salaryGeneration": return <SalaryGenerationManagement {...common} />;
      // case "salaryRevision": return <SalaryRevisionHistory {...common} />;
      // case "employeeLoan": return <EmployeeLoanManagement {...common} />;
      // case "reportgenerator": return <ReportGenerator {...common} />;
      // case "statutory": return <StatutoryReports {...common} />;
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-gradient-to-b from-gray-900 to-gray-800 border-r border-gray-700 transition-all duration-300 shadow-2xl ${
          sidebarCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm">
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <Home className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-white">{t('adminPanel') || 'Admin Panel'}</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 text-gray-300 hover:text-white"
          >
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 h-64 [scrollbar-width:0] [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`flex items-center w-full px-4 py-3 mb-1 space-x-3 text-left transition-all duration-200 rounded-lg group ${
                activePage === item.id
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-[1.02]'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activePage === item.id ? 'text-white' : item.color}`} />
              {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-gray-700">
            <button
              onClick={async () => {
                try {
                  await API.post('/auth/logout');
                } catch (err) {
                  console.error('Logout error:', err);
                } finally {
                  sessionStorage.clear();
                  window.location.href = '/login';
                }
              }}
              className="flex items-center w-full px-4 py-3 space-x-3 text-left text-gray-300 hover:bg-red-600/20 hover:text-red-400 rounded-lg transition-all duration-200 group"
            >
              <LogOut className="w-5 h-5" />
              {!sidebarCollapsed && <span className="font-medium">{t('logout') || 'Logout'}</span>}
            </button>
          </div>
        </nav>
      </aside>

      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40 backdrop-blur-sm bg-white/95">
          <div className="flex justify-between items-center px-8 py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{pageTitles[activePage] || activePage}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {t('manage', { page: String(pageTitles[activePage] || activePage).toLowerCase() }) || 'Manage page'}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {normalizeRole(role) === 'superadmin' && (
                <select
                  value={companyId || ''}
                  onChange={(e) => {
                    const selected = companies.find((c) => String(c.companyId) === String(e.target.value));
                    setCompanyId(selected?.companyId || null);
                    setCompanyName(selected?.companyName || '');
                    setDepartmentId(null);
                    setDepartmentName('');
                  }}
                  className="border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm text-gray-700 font-medium"
                >
                  <option value="">{t('selectCompany') || 'Select Company'}</option>
                  {companies.map((c) => (
                    <option key={c.companyId} value={c.companyId}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              )}

              {(normalizeRole(role) === 'admin' || normalizeRole(role) === 'departmentadmin') && (
                <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 rounded-lg border border-blue-200">
                  <Building className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-700 font-medium">
                    {companyName}
                    {normalizeRole(role) === 'departmentadmin' && departmentName ? ` - ${departmentName}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="max-w-7xl mx-auto">{renderPage()}</div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
