import React, { useState } from 'react';
import BusMaster from './BusMaster.jsx';
import BiometricMaster from './BiometricMaster.jsx';
import BiometricDeviceMaster from './BiometricDeviceMaster.jsx';
import CasteMaster from './CasteMaster.jsx';
import DepartmentMaster from './DepartmentMaster.jsx';
import DesignationMaster from './DesignationMaster.jsx';
import EmployeeGradeMaster from './EmployeeGradeMaster.jsx';
import EmployeeTypeMaster from './EmployeeTypeMaster.jsx';
import HolidayMaster from './HolidayMaster.jsx';
import LeaveAllocation from './LeaveAllocation.jsx';
import LeaveTypeMaster from './LeaveTypeMaster.jsx';
import Punches from './Punches.jsx';
import ReligionMaster from './ReligionMaster.jsx';
import ShiftMaster from './ShiftMaster.jsx';
import AddUser from './AddUser.jsx';
import ShiftAllocationMaster from './ShiftAllocationMaster.jsx';

import { 
  Users, 
  Bus, 
  Building, 
  Building2, 
  Award, 
  UserCheck, 
  Clock, 
  Calendar, 
  LogOut, 
  Home, 
  ChevronLeft, 
  ChevronRight,
  X,
  Settings,
  Plus,
  Activity,
  Menu,
  ComputerIcon,
  LucideComputer
} from 'lucide-react';

const Admin = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, color: 'text-blue-600' },
    { id: 'users', label: 'Add User', icon: Users, color: 'text-green-600' },
    { id: 'bus', label: 'Bus Master', icon: Bus, color: 'text-purple-600' },
    { id: 'biometric', label: 'Biometric Master', icon: ComputerIcon, color: 'text-green-600' },
    { id: 'biometricDevice', label: 'Biometric Device Master', icon: ComputerIcon, color: 'text-purple-600' },
    { id: 'caste', label: 'Caste Master', icon: Building, color: 'text-orange-600' },
    { id: 'department', label: 'Department Master', icon: Building2, color: 'text-indigo-600' },
    { id: 'designation', label: 'Designation Master', icon: Award, color: 'text-pink-600' },
    { id: 'employeeGrade', label: 'Employee Grade Master', icon: Users, color: 'text-amber-600' },
    { id: 'employeeType', label: 'Employee Type Master', icon: Users, color: 'text-cyan-600' },
    { id: 'holiday', label: 'Holiday Master', icon: Calendar, color: 'text-yellow-600' },
    { id: 'leaveType', label: 'Leave Type Master', icon: Clock, color: 'text-lime-600' },
    { id: 'leaveAllocation', label: 'Leave Allocation ', icon: Clock, color: 'text-lime-600' },
    { id: 'punches', label: 'Punch Details ', icon: LucideComputer, color: 'text-indigo-600' },
    { id: 'religion', label: 'Religion Master', icon: Building, color: 'text-amber-600' },
    { id: 'shift', label: 'Shift Master', icon: Activity, color: 'text-emerald-600' },
    { id : 'shiftallocation', label :'Shift Allocation Master' ,icon: Activity,color :'text-emerald-600'}
  ];

  const authItems = [
    { id: 'login', label: 'Logout', icon: LogOut, color: 'text-gray-600' },
  ];

  const stats = [
    { title: 'Total Users', value: '2,847', change: '+12%', icon: Users, color: 'bg-blue-500' },
    { title: 'Active Employees', value: '1,234', change: '+5%', icon: UserCheck, color: 'bg-green-500' },
    { title: 'Departments', value: '15', change: '+2', icon: Building2, color: 'bg-purple-500' },
    { title: 'Bus Routes', value: '8', change: '0%', icon: Bus, color: 'bg-orange-500' },
  ];

  const pageTitles = {
    dashboard: "Dashboard Overview",
    users: "Add User",
    bus: "Bus Master",
    biometric: "Biometric Master",
    biometricDevice: "Biometric Device Master",
    caste: "Caste Master",
    department: "Department Master",
    designation: "Designation Master",
    employeeGrade: "Employee Grade Master",
    employeeType: "Employee Type Master",
    holiday: "Holiday Master",
    leaveType: "Leave Type Master",
    leaveAllocation: "Leave Allocation",
    punches: "Punch Details",
    religion: "Religion Master",
    shift: "Shift Master",
    shiftallocation:"Shift Allocation Master"
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors">
            <Plus className="w-4 h-4" />
            <span>Add New</span>
          </button>
          <button className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 truncate">{stat.title}</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <p className="text-sm text-green-600 mt-1">{stat.change} from last month</p>
              </div>
              <div className={`${stat.color} p-2 sm:p-3 rounded-lg flex-shrink-0`}>
                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPage = () => {
    switch (activePage) {
      case "dashboard": return renderDashboard();
      case "bus": return <BusMaster />;
      case "biometric": return <BiometricMaster />;
      case "biometricDevice": return <BiometricDeviceMaster />;
      case "caste": return <CasteMaster />;
      case "department": return <DepartmentMaster />;
      case "designation": return <DesignationMaster />;
      case "employeeGrade": return <EmployeeGradeMaster/>;
      case "employeeType": return <EmployeeTypeMaster />;
      case "holiday": return <HolidayMaster />;
      case "leaveType": return <LeaveTypeMaster />;
      case "leaveAllocation": return <LeaveAllocation />;
      case "punches": return <Punches />;
      case "religion": return <ReligionMaster />;
      case "shift": return <ShiftMaster />;
      case "shiftallocation":return <ShiftAllocationMaster />;
      case "users": return <AddUser />;
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 truncate px-2">
            {pageTitles[activePage]}
          </h1>
          <div className="w-10"></div> {/* Spacer for balance */}
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50
        ${sidebarCollapsed ? 'w-16' : 'w-64'}
        bg-white shadow-lg transition-all duration-300 transform
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0`}
      >
        <div className="flex items-center justify-between h-14 lg:h-16 px-4 border-b border-gray-200">
          {!sidebarCollapsed && <h1 className="text-lg lg:text-xl font-bold text-gray-900 truncate">Admin Panel</h1>}

          {/* Collapse (Desktop) */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:block p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>

          {/* Close (Mobile) */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActivePage(item.id);
                setMobileMenuOpen(false);
              }}
              className={`relative w-full flex items-center px-2 py-2.5 text-sm font-medium rounded-lg transition-colors
                ${activePage === item.id 
                  ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600' 
                  : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <item.icon className={`${sidebarCollapsed ? 'mx-auto' : 'mr-3'} w-5 h-5 ${item.color} flex-shrink-0`} />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          ))}

          {/* Auth Items */}
          <div className="pt-4 mt-4 border-t border-gray-200">
            {authItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  sessionStorage.removeItem("token");
                  sessionStorage.removeItem("userNumber");
                  window.location.href = "/";
                }}
                className={`relative w-full flex items-center px-2 py-2.5 text-sm font-medium rounded-lg transition-colors
                  ${activePage === item.id 
                    ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600' 
                    : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <item.icon className={`${sidebarCollapsed ? 'mx-auto' : 'mr-3'} w-5 h-5 ${item.color} flex-shrink-0`} />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className={`${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'} transition-all duration-200`}>
        <div className="p-4 sm:p-6 lg:p-8 pt-4 lg:pt-8">
          {/* Page Header (Hidden on mobile as it's in mobile header) */}
          <h1 className="hidden lg:block text-2xl font-bold text-gray-900 mb-6">
            {pageTitles[activePage]}
          </h1>

          {/* Page Content */}
          <div className="w-full overflow-x-auto">
            {renderPage()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;