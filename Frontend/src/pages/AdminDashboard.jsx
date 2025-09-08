import React, { useState, useEffect } from 'react';
import BusMaster from './BusMaster.jsx';
import CasteMaster from './CasteMaster.jsx';
import DepartmentMaster from './DepartmentMaster.jsx';
import DesignationMaster from './DesignationMaster.jsx';
import ShiftMaster from './ShiftMaster.jsx';
import EmployeeTypeMaster from './EmployeeTypeMaster.jsx';
import LeavePolicyMaster from './LeavePolicyMaster.jsx';
import ReligionMaster from './ReligionMaster.jsx';
import AddUser from './AddUser.jsx';

import { 
  Users, 
  Bus, 
  Building, 
  Tag, 
  Building2, 
  Award, 
  UserCheck, 
  Clock, 
  Calendar, 
  LogOut, 
  Home, 
  ChevronLeft, 
  ChevronRight,
  Menu,
  X,
  Settings,
  Bell,
  Search,
  Plus,
  BarChart3,
  PieChart,
  TrendingUp,
  Activity
} from 'lucide-react';

const Admin = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalComponent, setModalComponent] = useState(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (modalComponent) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [modalComponent]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && modalComponent) {
        setModalComponent(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [modalComponent]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, color: 'text-blue-600' },
    { id: 'users', label: 'Add User', icon: Users, color: 'text-green-600' },
    { id: 'bus', label: 'Bus Master', icon: Bus, color: 'text-purple-600' },
    { id: 'caste', label: 'Caste Master', icon: Building, color: 'text-orange-600' },
    { id: 'department', label: 'Department Master', icon: Building2, color: 'text-indigo-600' },
    { id: 'designation', label: 'Designation Master', icon: Award, color: 'text-pink-600' },
    { id: 'employee', label: 'Employee Modal', icon: UserCheck, color: 'text-teal-600' },
    { id: 'employeeType', label: 'Employee Type Master', icon: Users, color: 'text-cyan-600' },
    { id: 'holiday', label: 'Holiday Master', icon: Calendar, color: 'text-yellow-600' },
    { id: 'leave', label: 'LeavePolicyMaster', icon: Clock, color: 'text-lime-600' },
    { id: 'religion', label: 'Religion Master', icon: Building, color: 'text-amber-600' },
    { id: 'shift', label: 'Shift Master', icon: Activity, color: 'text-emerald-600' },
  ];

  const authItems = [
    { id: 'login', label: 'Logout', icon: LogOut, color: 'text-gray-600' },
    { id: 'register', label: 'Register', icon: Users, color: 'text-gray-600' },
  ];

  const stats = [
    { title: 'Total Users', value: '2,847', change: '+12%', icon: Users, color: 'bg-blue-500' },
    { title: 'Active Employees', value: '1,234', change: '+5%', icon: UserCheck, color: 'bg-green-500' },
    { title: 'Departments', value: '15', change: '+2', icon: Building2, color: 'bg-purple-500' },
    { title: 'Bus Routes', value: '8', change: '0%', icon: Bus, color: 'bg-orange-500' },
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <div className="flex space-x-3">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
            <Plus className="w-4 h-4" />
            <span>Add New</span>
          </button>
          <button className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <p className="text-sm text-green-600 mt-1">{stat.change} from last month</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 ${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white shadow-lg transform transition-all duration-200 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          {!sidebarCollapsed && <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden lg:block p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                if(item.id === "dashboard") return;
                setModalComponent(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center px-2 py-2.5 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-gray-50`}
            >
              <item.icon className={`${sidebarCollapsed ? 'mx-auto' : 'mr-3'} w-5 h-5 ${item.color}`} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
          
          {/* Auth Items */}
          <div className="pt-4 mt-4 border-t border-gray-200">
            {authItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setModalComponent(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center px-2 py-2.5 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-gray-50`}
              >
                <item.icon className={`${sidebarCollapsed ? 'mx-auto' : 'mr-3'} w-5 h-5 ${item.color}`} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className={`${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'} transition-all duration-200 ${modalComponent ? 'blur-md filter' : ''}`}>
        <div className="p-4 sm:p-6 lg:p-8">
          {renderDashboard()}
        </div>
      </div>

      {/* Enhanced Modal */}
      {modalComponent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with white-gray blur effect */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-white/70 via-gray-100/80 to-gray-200/70 backdrop-blur-md transition-all duration-300"
            onClick={() => setModalComponent(null)}
          />
          
          {/* Modal Container */}
          <div 
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-300"
            style={{
              animation: 'modalSlideIn 0.3s ease-out'
            }}
          >
            {/* Close Button */}
            <button 
              onClick={() => setModalComponent(null)} 
              className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Modal Content with scroll */}
            <div className="overflow-y-auto max-h-[90vh]">
              {modalComponent === "bus" && <BusMaster />}
              {modalComponent === "caste" && <CasteMaster />}
              {modalComponent === "department" && <DepartmentMaster />}
              {modalComponent === "designation" && <DesignationMaster />}
              {modalComponent === "employeeType" && <EmployeeTypeMaster />}
              {modalComponent === "holiday" && <HolidayMaster />}
              {modalComponent === "leave" && <LeavePolicyMaster />}
              {modalComponent === "religion" && <ReligionMaster />}
              {modalComponent === "shift" && <ShiftMaster />}
              {modalComponent === "users" && <AddUser />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;