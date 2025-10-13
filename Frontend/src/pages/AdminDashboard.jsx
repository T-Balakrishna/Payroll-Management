import React, { useState, useRef, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
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
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

// Import all your existing components
import BusMaster from './BusMaster.jsx';
import BiometricDeviceMaster from './BiometricDeviceMaster.jsx';
import CasteMaster from './CasteMaster.jsx';
import CompanyMaster from './CompanyMaster.jsx';
import DepartmentMaster from './DepartmentMaster.jsx';
import DesignationMaster from './DesignationMaster.jsx';
import EmployeeGradeMaster from './EmployeeGradeMaster.jsx';
import EmployeeTypeMaster from './EmployeeTypeMaster.jsx';
import HolidayMaster from './HolidayMaster.jsx';
import LeaveAllocation from './LeaveAllocation.jsx';
import LeaveApproval from './LeaveApproval.jsx';
import LeaveTypeMaster from './LeaveTypeMaster.jsx';
import Punches from './Punches.jsx';
import ReligionMaster from './ReligionMaster.jsx';
import ShiftMaster from './ShiftMaster.jsx';
import AddUser from './AddUser.jsx';
import ShiftAllocationMaster from './ShiftAllocationMaster.jsx';
import AttendanceMaster from './AttendanceMaster.jsx';
import ReportGenerator from './ReportGenerator.jsx';

// Icons
import {
  Users,
  Bus,
  Building,
  Building2,
  Award,
  Clock,
  Calendar,
  LogOut,
  Home,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  TrendingUp,
  UserPlus,
  Briefcase,
  Activity,
  Settings,
  Monitor,
  CheckCircle,
  List,
  FileText,
  FileBarChart,
  FileLineChart,
  AlarmClockCheck,
  UserCheck,
  Shield,
} from 'lucide-react';

const AdminDashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [role, setRole] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [departmentId, setDepartmentId] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [companies, setCompanies] = useState([]);
  const [dashboardData, setDashboardData] = useState({
    totalActiveEmployees: 0,
    departmentWiseActive: [],
    departmentCount: 0,
    designationWise: [],
    monthlyAttendance: [],
    leaveStats: { approved: 0, pending: 0, rejected: 0 },
    reports: {
      leaveBalance: { total: 0 },
      leaveTaken: { total: 0 },
      permissionTaken: { total: 0 },
      presentAbsent: { present: 0, absent: 0 },
      shiftWise: { totalShifts: 0 },
      pfNonPf: { pf: 0, nonPf: 0 }
    }
  });
  const navRef = useRef(null);

  const fetchCompanies = async () => {
    const token = sessionStorage.getItem("token");
    if (!token) return;
    try {
      const res = await axios.get("http://localhost:5000/api/companies", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompanies(res.data || []);
    } catch (err) {
      console.error("Error fetching companies:", err);
    }
  };

  const fetchDashboardData = async () => {
    const token = sessionStorage.getItem("token");
    if (!token || !companyId) return;

    // Build query params based on role (avoid redundant companyId in query)
    const params = new URLSearchParams();
    if (role === "departmentAdmin" && departmentId) {
      params.append('departmentId', departmentId);
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';

    // Define all API calls as promises
    const apiCalls = [
      axios.get(`http://localhost:5000/api/employees/activecount/${companyId}${queryString}`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`http://localhost:5000/api/employees/departmentwiseactive/${companyId}${queryString}`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`http://localhost:5000/api/departments/count/${companyId}${queryString}`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`http://localhost:5000/api/employees/designationwise/${companyId}${queryString}`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`http://localhost:5000/api/attendance/monthly/${companyId}${queryString}`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`http://localhost:5000/api/leaves/stats/${companyId}${queryString}`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`http://localhost:5000/api/leaves/balancesummary/${companyId}${queryString}`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`http://localhost:5000/api/leaves/takensummary/${companyId}${queryString}`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`http://localhost:5000/api/permissions/takensummary/${companyId}${queryString}`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`http://localhost:5000/api/attendance/presentabsentsummary/${companyId}${queryString}`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`http://localhost:5000/api/shifts/wisesummary/${companyId}${queryString}`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`http://localhost:5000/api/employees/pfsummary/${companyId}${queryString}`, { headers: { Authorization: `Bearer ${token}` } }),
    ];

    try {
      const [activeEmployeesRes, deptActiveRes, deptCountRes, desigRes, attendanceRes, leaveRes, leaveBalanceRes, leaveTakenRes, permissionTakenRes, presentAbsentRes, shiftWiseRes, pfNonPfRes] = await Promise.all(apiCalls);

      setDashboardData({
        totalActiveEmployees: activeEmployeesRes.data.count,
        departmentWiseActive: deptActiveRes.data || [],
        departmentCount: deptCountRes.data.count || 0,
        designationWise: desigRes.data || [],
        monthlyAttendance: attendanceRes.data || [],
        leaveStats: leaveRes.data || { approved: 0, pending: 0, rejected: 0 },
        reports: {
          leaveBalance: leaveBalanceRes.data || { total: 0 },
          leaveTaken: leaveTakenRes.data || { total: 0 },
          permissionTaken: permissionTakenRes.data || { total: 0 },
          presentAbsent: presentAbsentRes.data || { present: 0, absent: 0 },
          shiftWise: shiftWiseRes.data || { totalShifts: 0 },
          pfNonPf: pfNonPfRes.data || { pf: 0, nonPf: 0 }
        }
      });
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      // Optionally set partial state or show error toast, but keep initial values
    }
  };

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setRole(decoded.role);
        const userNumber = decoded.userNumber;

        if (decoded.role === "Admin") {
          axios
            .get(`http://localhost:5000/api/users/getCompany/${userNumber}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
              const { companyId, companyName } = res.data;
              setCompanyId(companyId || null);
              setCompanyName(companyName || "Unknown Company");
            })
            .catch((err) => {
              console.error("Error fetching user company:", err);
              setCompanyName("Error fetching company");
            });
        } else if (decoded.role === "departmentAdmin") {
          // Fetch department and company for departmentAdmin
          axios
            .get(`http://localhost:5000/api/users/getDepartment/${userNumber}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
              const { companyId, companyName, departmentId, departmentName } = res.data;
              setCompanyId(companyId || null);
              setDepartmentId(departmentId || null);
              setCompanyName(companyName || "Unknown Company");
              setDepartmentName(departmentName || "Unknown Department");
            })
            .catch((err) => {
              console.error("Error fetching user department:", err);
              setCompanyName("Error fetching company");
            });
        } else if (decoded.role === "Super Admin") {
          fetchCompanies();
        }
      } catch (err) {
        console.error("Invalid token:", err);
      }
    }
  }, []);

  useEffect(() => {
    if (activePage === 'dashboard' && companyId) {
      fetchDashboardData();
    }
  }, [activePage, companyId, departmentId]); // Add departmentId dependency

  // Filter menu items based on role
  const getFilteredMenuItems = () => {
    let items = [
      { id: 'dashboard', label: 'Dashboard', icon: Home, color: 'text-blue-600' },
      { id: 'users', label: 'Add User', icon: Users, color: 'text-green-600' },
      { id: 'bus', label: 'Bus Master', icon: Bus, color: 'text-purple-600' },
      { id: 'biometricDevice', label: 'Biometric Device Master', icon: Monitor, color: 'text-purple-600' },
      { id: 'caste', label: 'Caste Master', icon: List, color: 'text-orange-600' },
      { id: 'department', label: 'Department Master', icon: Building2, color: 'text-indigo-600' },
      { id: 'designation', label: 'Designation Master', icon: Award, color: 'text-pink-600' },
      { id: 'employeeGrade', label: 'Employee Grade Master', icon: Users, color: 'text-amber-600' },
      { id: 'employeeType', label: 'Employee Type Master', icon: Users, color: 'text-cyan-600' },
      { id: 'attendance', label: 'Attendance Master', icon: Activity, color: 'text-emerald-600'},
      { id: 'holiday', label: 'Holiday Master', icon: Calendar, color: 'text-yellow-600' },
      { id: 'leaveApproval', label: 'Leave Approval Master', icon: CheckCircle, color: 'text-lime-600' },
      { id: 'leaveType', label: 'Leave Type Master', icon: Clock, color: 'text-lime-600' },
      { id: 'leaveAllocation', label: 'Leave Allocation', icon: Clock, color: 'text-lime-600' },
      { id: 'punches', label: 'Punch Details', icon: Activity, color: 'text-indigo-600' },
      { id: 'religion', label: 'Religion Master', icon: Building, color: 'text-amber-600' },
      { id: 'shift', label: 'Shift Master', icon: Activity, color: 'text-emerald-600' },
      { id: 'shiftallocation', label: 'Shift Allocation Master', icon: Activity, color: 'text-emerald-600'},
      { id: 'reportgenerator', label: 'Report Generator', icon: Settings, color: 'text-gray-600' },
    ];

    // Super Admin sees Company Master
    if (role === "Super Admin") {
      items.splice(5, 0, { id: 'company', label: 'Company Master', icon: Building, color: 'text-red-600' });
    }

    // DepartmentAdmin hides company-wide masters like Company, Bus, BiometricDevice, etc.
    if (role === "departmentAdmin") {
      items = items.filter(item => 
        !['company', 'bus', 'biometricDevice', 'holiday', 'shift', 'shiftallocation'].includes(item.id)
      );
      // Limit Add User to department users
      const userIndex = items.findIndex(item => item.id === 'users');
      if (userIndex !== -1) {
        items[userIndex].label = 'Add Department User';
      }
    }

    // Admin sees limited masters (no Company Master, but others)
    if (role === "Admin") {
      items = items.filter(item => item.id !== 'company');
    }

    return items;
  };

  const menuItems = getFilteredMenuItems();

  const pageTitles = {
    dashboard: "Dashboard Overview",
    users: "Add User",
    bus: "Bus Master",
    biometricDevice: "Biometric Device Master",
    caste: "Caste Master",
    company: "Company Master",
    department: "Department Master",
    designation: "Designation Master",
    employeeGrade: "Employee Grade Master",
    employeeType: "Employee Type Master",
    holiday: "Holiday Master",
    leaveApproval: "Leave Approval Master",
    leaveType: "Leave Type Master",
    leaveAllocation: "Leave Allocation",
    punches: "Punch Details",
    religion: "Religion Master",
    shift: "Shift Master",
    shiftallocation: "Shift Allocation Master",
    attendance: "Attendance Master",
    reportgenerator: "Report Generator"
  };

  const renderDashboard = () => {
    const departmentActiveChartData = {
      labels: dashboardData.departmentWiseActive.map(d => d.department || d.departmentName),
      datasets: [{
        label: 'Active Employees',
        data: dashboardData.departmentWiseActive.map(d => d.activeCount),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
          'rgb(139, 92, 246)',
          'rgb(236, 72, 153)',
        ],
        borderWidth: 2,
      }]
    };

    const designationChartData = {
      labels: dashboardData.designationWise.map(d => d.designation || d.designationName),
      datasets: [{
        label: 'Employees',
        data: dashboardData.designationWise.map(d => d.count),
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',
          'rgba(6, 182, 212, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(244, 63, 94, 0.8)',
          'rgba(249, 115, 22, 0.8)',
        ],
      }]
    };

    const attendanceChartData = {
      labels: dashboardData.monthlyAttendance.map(a => a.month),
      datasets: [{
        label: 'Attendance %',
        data: dashboardData.monthlyAttendance.map(a => a.percentage),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      }]
    };

    const leaveChartData = {
      labels: ['Approved', 'Pending', 'Rejected'],
      datasets: [{
        data: [
          dashboardData.leaveStats.approved,
          dashboardData.leaveStats.pending,
          dashboardData.leaveStats.rejected
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 2,
      }]
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
        }
      }
    };

    const hasLeaveData = dashboardData.leaveStats.approved + dashboardData.leaveStats.pending + dashboardData.leaveStats.rejected > 0;

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Active Employees</p>
                <h3 className="text-3xl font-bold mt-2">{dashboardData.totalActiveEmployees}</h3>
              </div>
              <Users className="w-12 h-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Departments</p>
                <h3 className="text-3xl font-bold mt-2">{dashboardData.departmentCount}</h3>
              </div>
              <Building2 className="w-12 h-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Pending Leaves</p>
                <h3 className="text-3xl font-bold mt-2">{dashboardData.leaveStats.pending}</h3>
              </div>
              <Clock className="w-12 h-12 text-amber-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Approved Leaves</p>
                <h3 className="text-3xl font-bold mt-2">{dashboardData.leaveStats.approved}</h3>
              </div>
              <UserCheck className="w-12 h-12 text-purple-200" />
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department-wise Active Employees Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-blue-600" />
              Department-wise Active Employee Distribution
            </h3>
            <div className="h-80">
              {dashboardData.departmentWiseActive.length > 0 ? (
                <Bar data={departmentActiveChartData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Designation-wise Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Award className="w-5 h-5 mr-2 text-purple-600" />
              Designation-wise Distribution
            </h3>
            <div className="h-80">
              {dashboardData.designationWise.length > 0 ? (
                <Doughnut data={designationChartData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Monthly Attendance Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              Monthly Attendance Trend
            </h3>
            <div className="h-80">
              {dashboardData.monthlyAttendance.length > 0 ? (
                <Line data={attendanceChartData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Leave Statistics Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-amber-600" />
              Leave Statistics
            </h3>
            <div className="h-80">
              {hasLeaveData ? (
                <Doughnut data={leaveChartData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reports Overview Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-gray-600" />
            Reports Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm font-medium">Leave Balance Report</p>
                  <h4 className="text-xl font-bold mt-1">{dashboardData.reports.leaveBalance.total}</h4>
                </div>
                <FileBarChart className="w-8 h-8 text-indigo-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-teal-100 text-sm font-medium">Leave Taken Report</p>
                  <h4 className="text-xl font-bold mt-1">{dashboardData.reports.leaveTaken.total}</h4>
                </div>
                <FileLineChart className="w-8 h-8 text-teal-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Permission Taken Report</p>
                  <h4 className="text-xl font-bold mt-1">{dashboardData.reports.permissionTaken.total}</h4>
                </div>
                <AlarmClockCheck className="w-8 h-8 text-orange-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Present & Absent Report</p>
                  <h4 className="text-xl font-bold mt-1">{dashboardData.reports.presentAbsent.present} / {dashboardData.reports.presentAbsent.absent}</h4>
                </div>
                <UserCheck className="w-8 h-8 text-green-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Shift Wise Employees Report</p>
                  <h4 className="text-xl font-bold mt-1">{dashboardData.reports.shiftWise.totalShifts}</h4>
                </div>
                <Activity className="w-8 h-8 text-purple-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">PF / Non-PF Report</p>
                  <h4 className="text-xl font-bold mt-1">{dashboardData.reports.pfNonPf.pf} / {dashboardData.reports.pfNonPf.nonPf}</h4>
                </div>
                <Shield className="w-8 h-8 text-red-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPage = () => {
    // Pass departmentId to child components if applicable
    const commonProps = {
      selectedCompanyId: companyId,
      selectedCompanyName: companyName,
      selectedDepartmentId: departmentId,
      selectedDepartmentName: departmentName,
      userRole: role,
      refreshCompanies: fetchCompanies
    };

    switch(activePage) {
      case "dashboard": return renderDashboard();
      case "bus": return <BusMaster {...commonProps} />;
      case "biometricDevice": return <BiometricDeviceMaster {...commonProps} />;
      case "caste": return <CasteMaster {...commonProps} />;
      case "company": return <CompanyMaster {...commonProps} />;
      case "department": return <DepartmentMaster {...commonProps} />;
      case "designation": return <DesignationMaster {...commonProps} />;
      case "employeeGrade": return <EmployeeGradeMaster {...commonProps} />;
      case "employeeType": return <EmployeeTypeMaster {...commonProps} />;
      case "holiday": return <HolidayMaster {...commonProps} />;
      case "leaveApproval": return <LeaveApproval {...commonProps} />;
      case "leaveType": return <LeaveTypeMaster {...commonProps} />;
      case "leaveAllocation": return <LeaveAllocation {...commonProps} />;
      case "punches": return <Punches {...commonProps} />;
      case "religion": return <ReligionMaster {...commonProps} />;
      case "shift": return <ShiftMaster {...commonProps} />;
      case "shiftallocation": return <ShiftAllocationMaster {...commonProps} />;
      case "users": return <AddUser {...commonProps} />;
      case "attendance": return <AttendanceMaster {...commonProps} />;
      case "reportgenerator": return <ReportGenerator {...commonProps} />;
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-gradient-to-b from-gray-900 to-gray-800 border-r border-gray-700 transition-all duration-300 shadow-2xl ${sidebarCollapsed ? 'w-20' : 'w-72'}`}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm">          
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <Home className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-white">Admin Panel</span>
            </div>
          )}
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 text-gray-300 hover:text-white"
          >
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav ref={navRef} className="flex-1 overflow-y-auto py-4 px-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`flex items-center w-full px-4 py-3 mb-1 space-x-3 text-left transition-all duration-200 rounded-lg group ${
                activePage === item.id 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105' 
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activePage === item.id ? 'text-white' : item.color}`} />
              {!sidebarCollapsed && (
                <span className={`font-medium ${activePage === item.id ? 'text-white' : ''}`}>
                  {item.label}
                </span>
              )}
            </button>
          ))}
          
          {/* Logout Section */}
          <div className="pt-4 mt-4 border-t border-gray-700">
            <button
              onClick={() => {
                sessionStorage.clear();
                window.location.href = "/";
              }}
              className="flex items-center w-full px-4 py-3 space-x-3 text-left text-gray-300 hover:bg-red-600/20 hover:text-red-400 rounded-lg transition-all duration-200 group"
            >
              <LogOut className="w-5 h-5" />
              {!sidebarCollapsed && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40 backdrop-blur-sm bg-white/95">
          <div className="flex justify-between items-center px-8 py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{pageTitles[activePage]}</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your {pageTitles[activePage].toLowerCase()}</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {role === "Super Admin" && (
                <select 
                  value={companyId || ""} 
                  onChange={(e) => {
                    const selected = companies.find(c => c.companyId === parseInt(e.target.value));
                    setCompanyId(selected?.companyId || null);
                    setCompanyName(selected?.companyName || "");
                    setDepartmentId(null); // Reset department when changing company
                    setDepartmentName("");
                  }}
                  className="border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm text-gray-700 font-medium"
                >
                  <option value="">-- Select Company --</option>
                  {companies.map(c => <option key={c.companyId} value={c.companyId}>{c.companyName}</option>)}
                </select>
              )}
              
              {(role === "Admin" || role === "departmentAdmin") && (
                <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 rounded-lg border border-blue-200">
                  <Building className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-700 font-medium">
                    {companyName} {role === "departmentAdmin" ? ` - ${departmentName}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            {renderPage()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;