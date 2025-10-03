import React, { useState, useRef, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
// Masters
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
import LeaveApproval from './LeaveApproval.jsx'
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
  UserCheck,
  Clock,
  Calendar,
  LogOut,
  Home,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Plus,
  Settings,
  ComputerIcon,
  LucideComputer,
  Badge,
  WormIcon,
  Activity,
  Menu,
  X
} from 'lucide-react';

const AdminDashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [role, setRole] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [companies, setCompanies] = useState([]);
  const navRef = useRef(null);

  

  // Decode JWT and fetch company data
  // Add inside AdminDashboard
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

// Replace useEffect for Super Admin
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
        }

        if (decoded.role === "Super Admin") {
          fetchCompanies();
        }
      } catch (err) {
        console.error("Invalid token:", err);
      }
    }
  }, []);


  // Update companyName when companyId changes for Super Admin
  // useEffect(() => {
  //   if (role === "Super Admin" && companyId) {
  //     const selectedCompany = companies.find(c => c.companyId === companyId);
  //     setCompanyName(selectedCompany ? selectedCompany.companyName : "");
  //   }
  // }, [companyId, companies, role]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, color: 'text-blue-600' },
    { id: 'users', label: 'Add User', icon: Users, color: 'text-green-600' },
    { id: 'bus', label: 'Bus Master', icon: Bus, color: 'text-purple-600' },
    { id: 'biometricDevice', label: 'Biometric Device Master', icon: ComputerIcon, color: 'text-purple-600' },
    { id: 'caste', label: 'Caste Master', icon: WormIcon, color: 'text-orange-600' },
    ...(role === "Super Admin" ? [{ id: 'company', label: 'Company Master', icon: Building, color: 'text-red-600' }] : []),
    { id: 'department', label: 'Department Master', icon: Building2, color: 'text-indigo-600' },
    { id: 'designation', label: 'Designation Master', icon: Award, color: 'text-pink-600' },
    { id: 'employeeGrade', label: 'Employee Grade Master', icon: Users, color: 'text-amber-600' },
    { id: 'employeeType', label: 'Employee Type Master', icon: Users, color: 'text-cyan-600' },
    { id: 'attendance', label: 'Attendance Master', icon: Activity, color: 'text-emerald-600'},
    { id: 'holiday', label: 'Holiday Master', icon: Calendar, color: 'text-yellow-600' },
    { id: 'leave', label: 'Leave Approval Master', icon: Badge, color: 'text-lime-600' },
    { id: 'leaveType', label: 'Leave Type Master', icon: Clock, color: 'text-lime-600' },
    { id: 'leaveAllocation', label: 'Leave Allocation', icon: Clock, color: 'text-lime-600' },
    { id: 'punches', label: 'Punch Details', icon: LucideComputer, color: 'text-indigo-600' },
    { id: 'religion', label: 'Religion Master', icon: Building, color: 'text-amber-600' },
    { id: 'shift', label: 'Shift Master', icon: Activity, color: 'text-emerald-600' },
    { id: 'shiftallocation', label: 'Shift Allocation Master', icon: Activity, color: 'text-emerald-600'},
    { id: 'reportgenerator', label: 'Report Generator', icon: Settings, color: 'text-gray-600' },
  ];

  const authItems = [
    { id: 'logout', label: 'Logout', icon: LogOut, color: 'text-gray-600' },
  ];

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
    leave: "Leave Approval Master",
    leaveType: "Leave Type Master",
    leaveAllocation: "Leave Allocation",
    punches: "Punch Details",
    religion: "Religion Master",
    shift: "Shift Master",
    shiftallocation: "Shift Allocation Master",
    attendance: "Attendance Master",
    reportgenerator: "Report Generator"
  };

  const handleNavigateUp = () => {
    const idx = menuItems.findIndex(item => item.id === activePage);
    if (idx > 0) setActivePage(menuItems[idx - 1].id);
  };

  const handleNavigateDown = () => {
    const idx = menuItems.findIndex(item => item.id === activePage);
    if (idx < menuItems.length - 1) setActivePage(menuItems[idx + 1].id);
  };

  const renderPage = () => {
    switch(activePage) {
      case "dashboard": return <p>Welcome to Dashboard</p>;
      case "bus": return <BusMaster selectedCompanyId={companyId} selectedCompanyName={companyName} />;
      case "biometricDevice": return <BiometricDeviceMaster selectedCompanyId={companyId} selectedCompanyName={companyName} />;
      case "caste": return <CasteMaster selectedCompanyId={companyId} selectedCompanyName={companyName} />;
      case "company": return (<CompanyMaster selectedCompanyId={companyId} selectedCompanyName={companyName} refreshCompanies={fetchCompanies}/> );
      case "department": return <DepartmentMaster selectedCompanyId={companyId} selectedCompanyName={companyName} userRole={role} />;
      case "designation": return <DesignationMaster selectedCompanyId={companyId} selectedCompanyName={companyName} />;
      case "employeeGrade": return <EmployeeGradeMaster selectedCompanyId={companyId} selectedCompanyName={companyName} />;
      case "employeeType": return <EmployeeTypeMaster selectedCompanyId={companyId} selectedCompanyName={companyName} />;
      case "holiday": return <HolidayMaster selectedCompanyId={companyId} selectedCompanyName={companyName} />;
      case "leave": return <LeaveAllocation selectedCompanyId={companyId} selectedCompanyName={companyName} />;
      case "leaveType": return <LeaveTypeMaster selectedCompanyId={companyId} selectedCompanyName={companyName} />;
      case "leaveAllocation": return <LeaveAllocation selectedCompanyId={companyId} selectedCompanyName={companyName} />;
      case "punches": return <Punches selectedCompanyId={companyId} selectedCompanyName={companyName} />;
      case "religion": return <ReligionMaster selectedCompanyId={companyId} selectedCompanyName={companyName} />;
      case "shift": return <ShiftMaster selectedCompanyId={companyId} selectedCompanyName={companyName} />;
      case "shiftallocation": return <ShiftAllocationMaster selectedCompanyId={companyId} selectedCompanyName={companyName} />;
      case "users": return <AddUser selectedCompanyId={companyId} selectedCompanyName={companyName} />;
      case "attendance": return <AttendanceMaster selectedCompanyId={companyId} selectedCompanyName={companyName} />;
      case "reportgenerator": return <ReportGenerator selectedCompanyId={companyId} selectedCompanyName={companyName} />;
      default: return <p>Welcome to Dashboard</p>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200">
          {!sidebarCollapsed && <span className="font-bold text-lg">Admin Panel</span>}
          <div className="flex items-center space-x-2">
            {/* <button onClick={handleNavigateUp} disabled={menuItems.findIndex(item => item.id === activePage) === 0}>
              <ChevronUp />
            </button>
            <button onClick={handleNavigateDown} disabled={menuItems.findIndex(item => item.id === activePage) === menuItems.length - 1}>
              <ChevronDown />
            </button> */}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
            </button>
          </div>
        </div>
        <nav ref={navRef} className="flex-1 overflow-y-auto py-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`flex items-center w-full px-4 py-2 space-x-3 text-left transition-colors hover:bg-gray-100 ${
                activePage === item.id ? 'bg-gray-200 font-semibold' : ''
              }`}
            >
              <item.icon className={`w-5 h-5 ${item.color}`} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
          <div className="pt-4 mt-4 border-t border-gray-200">
            {authItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  sessionStorage.clear();
                  window.location.href = "/";
                }}
                className="flex items-center w-full px-4 py-2 space-x-3 text-left hover:bg-gray-100"
              >
                <item.icon className={`w-5 h-5 ${item.color}`} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            ))}
          </div>
        </nav>
      </aside>
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'} p-6`}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{pageTitles[activePage]}</h1>
          {role === "Super Admin" && (
            <select value={companyId || ""} 
              onChange={(e) => {
                const selected = companies.find(c => c.companyId === parseInt(e.target.value));
                setCompanyId(selected?.companyId || null);
                setCompanyName(selected?.companyName || "");
              }}
              className="border p-2 rounded"
            >
              <option value="">-- Select Company --</option>
              {companies.map(c => <option key={c.companyId} value={c.companyId}>{c.companyName}</option>)}
            </select>
          )}
          {role === "Admin" && <span className="text-gray-600">Company: {companyName}</span>}
        </div>
        {renderPage()}
      </main>
    </div>
  );
};

export default AdminDashboard;