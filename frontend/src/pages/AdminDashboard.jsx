import React, { useState, useRef, useEffect } from 'react';
import API from "../api"; // Using your generic API instance
import { useAuth } from "../auth/AuthContext";
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
// import LanguageSwitcher from '../components/LanguageSwitcher';

// Icons
import {
  Users, Bus, Building, Building2, Award, Clock, Calendar, LogOut, Home,
  ChevronLeft, ChevronRight, Activity, Settings, Monitor, CheckCircle,
  List, FileText, FileBarChart, FileLineChart, AlarmClockCheck, UserCheck,
  Shield, Wallet, Receipt, History, HandCoins, Landmark, Briefcase, Fingerprint,
  FileSearch, Scale
} from 'lucide-react';

// Register ChartJS
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

// --- COMPONENT IMPORTS ---
// import AddUser from './AddUser.jsx';
import CompanyMaster from './CompanyMaster.jsx';
import DepartmentMaster from './DepartmentMaster.jsx';
import DesignationMaster from './DesignationMaster.jsx';
import RoleMaster from './RoleMaster.jsx';
import EmployeeGradeMaster from './EmployeeGradeMaster.jsx';

// import BusMaster from './BusMaster.jsx';
// import BiometricDeviceMaster from './BiometricDeviceMaster.jsx';
// import AttendanceMaster from './AttendanceMaster.jsx';
// import HolidayMaster from './HolidayMaster.jsx';
// import HolidayPlanMaster from './HolidayPlanMaster.jsx';
// import ReportGenerator from './ReportGenerator.jsx';
// import FormulaBuilder from './FormulaBuilder.jsx';

// // New Imports based on your Models image
// import ShiftTypeMaster from './ShiftTypeMaster.jsx';
// import ShiftAssignment from './ShiftAssignment.jsx';
// import BiometricPunchDetails from './BiometricPunchDetails.jsx';
// import LeaveTypeMaster from './LeaveTypeMaster.jsx';
// import LeavePolicyManagement from './LeavePolicyManagement.jsx';
// import LeaveAllocation from './LeaveAllocation.jsx';
// import LeaveRequestManagement from './LeaveRequestManagement.jsx';
// import LeaveApproval from './LeaveApproval.jsx';
// import LeaveRequestHistory from './LeaveRequestHistory.jsx';
// import SalaryComponentManagement from './SalaryComponentManagement.jsx';
// import EmployeeSalaryMaster from './EmployeeSalaryMaster.jsx';
// import SalaryGenerationManagement from './SalaryGenerationManagement.jsx';
// import SalaryRevisionHistory from './SalaryRevisionHistory.jsx';
// import EmployeeLoanManagement from './EmployeeLoanManagement.jsx';
// import StatutoryReports from './StatutoryReports.jsx';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [role, setRole] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [departmentId, setDepartmentId] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);

  const [dashboardData, setDashboardData] = useState({
    totalActiveEmployees: { maleCount: 0, femaleCount: 0, totalCount: 0 },
    departmentWiseActive: [],
    departmentCount: 0,
    designationWise: [],
    monthlyAttendance: [],
    leaveStats: { approved: 0, pending: 0, rejected: 0 },
    payrollStats: { totalMonthly: 0, activeLoans: 0 },
    reports: { presentToday: 0, absentToday: 0 }
  });

  // 1. Fetch Companies (Super Admin Only)
  const fetchCompanies = async () => {
    try {
      const res = await API.get("/companies");
      setCompanies(res.data || []);
    } catch (err) { console.error("Error fetching companies:", err); }
  };

  // 2. Fetch Dashboard Analytics (Synchronized with your mountRoutes endpoints)
  const fetchDashboardData = async () => {
    if (!companyId) return;
    setLoading(true);

    const params = {};
    if (role === "departmentAdmin" && departmentId) params.departmentId = departmentId;

    try {
      const [empRes, deptRes, attRes, leaveRes, loanRes] = await Promise.allSettled([
        API.get(`/employees/activecount/${companyId}`, { params }),
        API.get(`/departments/count/${companyId}`, { params }),
        API.get(`/attendances/monthlyattendancesummary/${companyId}`, { params }),
        API.get(`/leaveRequests/stats/${companyId}`, { params }),
        API.get(`/employeeLoans/summary/${companyId}`, { params })
      ]);

      setDashboardData({
        totalActiveEmployees: empRes.status === 'fulfilled' ? empRes.value.data : { maleCount: 0, femaleCount: 0, totalCount: 0 },
        departmentCount: deptRes.status === 'fulfilled' ? (deptRes.value.data.count || 0) : 0,
        monthlyAttendance: attRes.status === 'fulfilled' ? attRes.value.data : [],
        leaveStats: leaveRes.status === 'fulfilled' ? leaveRes.value.data : { approved: 0, pending: 0, rejected: 0 },
        payrollStats: {
          activeLoans: loanRes.status === 'fulfilled' ? loanRes.value.data.activeCount : 0
        },
        departmentWiseActive: [], // To be populated by specific endpoint if available
        designationWise: []
      });
    } catch (err) {
      console.error("Dashboard data error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Initial Auth & Role Check
  useEffect(() => {
    if (!user) return;
    setRole(user.role);

    // Fetch specific details based on role
    if (user.role === "Admin" || user.role === "Super Admin") {
      API.get(`/users/getCompany/${user.userNumber}`).then(res => {
        setCompanyId(res.data.companyId);
        setCompanyName(res.data.companyName);
      });
    } else if (user.role === "departmentAdmin") {
      API.get(`/users/getDepartment/${user.userNumber}`).then(res => {
        setCompanyId(res.data.companyId);
        setCompanyName(res.data.companyName);
        setDepartmentId(res.data.departmentId);
        setDepartmentName(res.data.departmentName);
      });
    }

    if (user.role === "Super Admin") fetchCompanies();
  }, [user]);

  useEffect(() => {
    if (activePage === 'dashboard' && companyId) fetchDashboardData();
  }, [activePage, companyId]);

  // 4. Categorized Sidebar Menu (Matches all your newer models)
  const menuItems = [
    { id: 'dashboard', label: t('Dashboard'), icon: Home, color: 'text-blue-500', category: 'General' },
    { id: 'users', label: t('employeeManagement'), icon: Users, color: 'text-emerald-500', category: 'General' },
    { id: 'roles', label: t('Role Management'), icon: Users, color: 'text-blue-500', category: 'General' },
    
    // Organization Section
    { id: 'company', label: t('Company Master'), icon: Building, color: 'text-red-500', category: 'Organization', roles: ['Super Admin'] },
    { id: 'department', label: t('Department Master'), icon: Building2, color: 'text-indigo-500', category: 'Organization' },
    { id: 'designation', label: t('Designation Master'), icon: Award, color: 'text-pink-500', category: 'Organization' },
    { id: 'employeeGrade', label: t('Employee Grade Master'), icon: List, color: 'text-amber-500', category: 'Organization' },
    { id: 'bus', label: t('busMaster'), icon: Bus, color: 'text-purple-500', category: 'Organization' },

    // Attendance Section
    { id: 'attendance', label: t('dailyAttendance'), icon: Activity, color: 'text-emerald-600', category: 'Attendance' },
    { id: 'shiftType', label: t('shiftTypes'), icon: Clock, color: 'text-cyan-500', category: 'Attendance' },
    { id: 'shiftAssignment', label: t('shiftAssignments'), icon: Briefcase, color: 'text-blue-400', category: 'Attendance' },
    { id: 'biometricDevice', label: t('biometricDevices'), icon: Monitor, color: 'text-slate-500', category: 'Attendance' },
    { id: 'punches', label: t('punchLogs'), icon: Fingerprint, color: 'text-purple-600', category: 'Attendance' },
    { id: 'holidayPlan', label: t('holidayPlans'), icon: Calendar, color: 'text-yellow-600', category: 'Attendance' },
    { id: 'holiday', label: t('holidays'), icon: Calendar, color: 'text-yellow-500', category: 'Attendance' },

    // Leave Section
    { id: 'leaveRequest', label: t('leaveRequests'), icon: CheckCircle, color: 'text-lime-500', category: 'Leave' },
    { id: 'leaveApproval', label: t('leaveApprovals'), icon: UserCheck, color: 'text-green-600', category: 'Leave' },
    { id: 'leaveAllocation', label: t('leaveAllocations'), icon: FileBarChart, color: 'text-orange-500', category: 'Leave' },
    { id: 'leavePolicy', label: t('leavePolicies'), icon: Shield, color: 'text-blue-600', category: 'Leave' },
    { id: 'leaveHistory', label: t('requestHistory'), icon: History, color: 'text-slate-400', category: 'Leave' },

    // Payroll Section
    { id: 'salaryComponent', label: t('salaryComponents'), icon: Wallet, color: 'text-red-400', category: 'Payroll' },
    { id: 'salaryMaster', label: t('salaryMaster'), icon: Landmark, color: 'text-emerald-700', category: 'Payroll' },
    { id: 'salaryGeneration', label: t('processPayroll'), icon: Receipt, color: 'text-blue-600', category: 'Payroll' },
    { id: 'salaryRevision', label: t('revisionHistory'), icon: History, color: 'text-slate-500', category: 'Payroll' },
    { id: 'employeeLoan', label: t('loansAdvances'), icon: HandCoins, color: 'text-amber-600', category: 'Payroll' },
    { id: 'formulas', label: t('formulaBuilder'), icon: Settings, color: 'text-gray-600', category: 'Payroll' },

    // Analytics & Settings
    { id: 'reportgenerator', label: t('customReports'), icon: FileSearch, color: 'text-blue-500', category: 'Reports' },
    { id: 'statutory', label: t('statutoryReports'), icon: Scale, color: 'text-red-700', category: 'Reports' },
  ].filter(item => !item.roles || item.roles.includes(role));

  // const renderDashboard = () => (
  //   <div className="space-y-6">
  //     {/* 4 Main Stat Cards */}
  //     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  //       <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
  //         <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">{t('totalEmployees')}</p>
  //         <h3 className="text-4xl font-bold mt-2">{dashboardData.totalActiveEmployees.totalCount}</h3>
  //         <div className="mt-4 flex gap-4 text-xs opacity-80">
  //           <span>M: {dashboardData.totalActiveEmployees.maleCount}</span>
  //           <span>F: {dashboardData.totalActiveEmployees.femaleCount}</span>
  //         </div>
  //       </div>

  //       <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white shadow-lg">
  //         <p className="text-amber-100 text-sm font-medium uppercase tracking-wider">{t('activeLoans')}</p>
  //         <h3 className="text-4xl font-bold mt-2">{dashboardData.payrollStats.activeLoans}</h3>
  //         <HandCoins className="w-12 h-12 absolute bottom-4 right-4 opacity-20" />
  //       </div>

  //       <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
  //         <p className="text-purple-100 text-sm font-medium uppercase tracking-wider">{t('pendingLeaves')}</p>
  //         <h3 className="text-4xl font-bold mt-2">{dashboardData.leaveStats.pending}</h3>
  //         <Clock className="w-12 h-12 absolute bottom-4 right-4 opacity-20" />
  //       </div>

  //       <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
  //         <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">{t('departments')}</p>
  //         <h3 className="text-4xl font-bold mt-2">{dashboardData.departmentCount}</h3>
  //         <Building2 className="w-12 h-12 absolute bottom-4 right-4 opacity-20" />
  //       </div>
  //     </div>

  //     {/* Main Charts */}
  //     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  //       <div className="bg-white p-6 rounded-xl border shadow-sm">
  //         <h4 className="text-gray-700 font-bold mb-4 flex items-center gap-2">
  //           {/* <TrendingUp className="w-4 h-4 text-blue-500" /> {t('attendanceTrend')} */}
  //         </h4>
  //         <div className="h-64 flex items-center justify-center bg-gray-50 rounded italic text-gray-400">
  //            {/* Map dashboardData.monthlyAttendance to <Line /> here */}
  //            Chart Data for {companyName}
  //         </div>
  //       </div>
  //       <div className="bg-white p-6 rounded-xl border shadow-sm">
  //         <h4 className="text-gray-700 font-bold mb-4 flex items-center gap-2">
  //           <PieChart className="w-4 h-4 text-purple-500" /> {t('leaveStatusDistribution')}
  //         </h4>
  //         <div className="h-64">
  //           <Doughnut 
  //             data={{
  //               labels: [t('approved'), t('pending'), t('rejected')],
  //               datasets: [{
  //                 data: [dashboardData.leaveStats.approved, dashboardData.leaveStats.pending, dashboardData.leaveStats.rejected],
  //                 backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
  //               }]
  //             }} 
  //           />
  //         </div>
  //       </div>
  //     </div>
  //   </div>
  // );

  const renderPage = () => {
    const common = {
      companyId,
      companyName,
      departmentId,
      departmentName,
      role,
      // Backward-compatible prop names expected by existing pages/forms.
      userRole: role,
      selectedCompanyId: companyId,
      selectedCompanyName: companyName,
      userId: user?.id,
    };
    switch (activePage) {
      // case "dashboard": return renderDashboard();
      case "users": return <AddUser {...common} />;
      case "company": return <CompanyMaster {...common} />;
       case "department": return <DepartmentMaster {...common} />;
       case "designation": return <DesignationMaster {...common} />;
       case "roles": return <RoleMaster {...common} />;
      case "employeeGrade": return <EmployeeGradeMaster {...common} />;
      // case "bus": return <BusMaster {...common} />;
      // case "attendance": return <AttendanceMaster {...common} />;
      // case "shiftType": return <ShiftTypeMaster {...common} />;
      // case "shiftAssignment": return <ShiftAssignment {...common} />;
      // case "biometricDevice": return <BiometricDeviceMaster {...common} />;
      // case "punches": return <BiometricPunchDetails {...common} />;
      // case "holidayPlan": return <HolidayPlanMaster {...common} />;
      // case "holiday": return <HolidayMaster {...common} />;
      // case "leaveType": return <LeaveTypeMaster {...common} />;
      // case "leavePolicy": return <LeavePolicyManagement {...common} />;
      // case "leaveAllocation": return <LeaveAllocation {...common} />;
      // case "leaveRequest": return <LeaveRequestManagement {...common} />;
      // case "leaveApproval": return <LeaveApproval {...common} />;
      // case "leaveHistory": return <LeaveRequestHistory {...common} />;
      // case "salaryComponent": return <SalaryComponentManagement {...common} />;
      // case "salaryMaster": return <EmployeeSalaryMaster {...common} />;
      // case "salaryGeneration": return <SalaryGenerationManagement {...common} />;
      // case "salaryRevision": return <SalaryRevisionHistory {...common} />;
      // case "employeeLoan": return <EmployeeLoanManagement {...common} />;
      // case "formulas": return <FormulaBuilder {...common} />;
      // case "reportgenerator": return <ReportGenerator {...common} />;
      // case "statutory": return <StatutoryReports {...common} />;
      // default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Collapsible with Categorization */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 border-r border-slate-700 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-72'}`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-900/50">
          {!sidebarCollapsed && <span className="text-white font-black tracking-tighter text-xl">PRO-HRMS</span>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1.5 rounded-md bg-slate-800 text-slate-400 hover:text-white transition-colors">
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4 custom-scrollbar">
          {menuItems.map((item, idx) => {
            const showHeader = !sidebarCollapsed && (idx === 0 || menuItems[idx - 1].category !== item.category);
            return (
              <React.Fragment key={item.id}>
                {showHeader && (
                  <div className="mt-6 mb-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {item.category}
                  </div>
                )}
                <button
                  onClick={() => setActivePage(item.id)}
                  className={`w-full flex items-center px-4 py-3 mb-1 rounded-lg transition-all group ${activePage === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${activePage === item.id ? 'text-white' : item.color}`} />
                  {!sidebarCollapsed && <span className="ml-3 text-sm font-medium">{item.label}</span>}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={async () => {
              try {
                await API.post("/auth/logout");
              } catch (err) {
                console.error("Logout error:", err);
              } finally {
                window.location.href = "/login";
              }
            }}
            className="w-full flex items-center px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={20} />
            {!sidebarCollapsed && <span className="ml-3 font-semibold">{t('logout')}</span>}
          </button>
        </div>
      </aside>

      {/* Main Body */}
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight leading-none">{activePage}</h2>
            <span className="text-[10px] text-slate-400 font-medium mt-1">{t('last_updated')}: {new Date().toLocaleTimeString()}</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex flex-col items-end border-r pr-6 border-slate-200">
               <span className="text-sm font-bold text-slate-700">{companyName}</span>
               <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">{role} {departmentName ? `| ${departmentName}` : ''}</span>
            </div>
            
            {role === "Super Admin" && (
              <select 
                value={companyId } 
                onChange={(e) => {
                  const sel = companies.find(c => c.companyId === parseInt(e.target.value));
                  setCompanyId(sel?.companyId);
                  setCompanyName(sel?.companyName);
                }}
                className="text-xs font-semibold border rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {/* <option value="">{t('switch_company')}</option> */}
                {companies.map(c => <option key={c.companyId} value={c.companyId}>{c.companyName}</option>)}
              </select>
            )}
            
            {/* <LanguageSwitcher /> */}
          </div>
        </header>

        <div className="p-8 max-w-[1600px] mx-auto">
          {renderPage()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
