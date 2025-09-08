import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/LoginPage";
import UserDashboard from "./pages/DashboardPage"; // your existing user dashboard
import AdminDashboard from "./pages/Admin"; // create this new file

<<<<<<< Updated upstream

// function App() {
//   const [count, setCount] = useState(0);

//   return (
//     <Router>
//       <div className="p-4">
//         {/* Navigation Buttons */}
//         <div className="flex gap-4 mb-6">
//           <Link
//             to="/department"
//             className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
//           >
//             Department Master
//           </Link>
//           <Link
//             to="/add-user"
//             className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
//           >
//             Add User
//           </Link>
//           <Link
//             to="/designation"
//             className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
//           >
//             Designation Master
//           </Link>

//           <Link
//             to="/bus"
//             className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
//           >
//             Bus Master
//           </Link>

//           <Link
//             to="/caste"
//             className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
//           >
//             Caste Master
//           </Link>

//           <Link
//             to="/category"
//             className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
//           >
//             Category Master
//           </Link>

//           <Link
//             to="/employeeType"
//             className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
//           >
//             EmployeeType Master
//           </Link>

//           <Link
//             to="/holiday"
//             className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
//           >
//             Holiday Master
//           </Link>
         
//           <Link
//             to="/leave"
//             className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
//           >
//             Leave Master
//           </Link>

//           <Link
//             to="/religion"
//             className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
//           >
//             Religion Master
//           </Link>

//           <Link
//             to="/shift"
//             className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
//           >
//             Shift Master
//           </Link>

//         </div>

//         {/* Routes */}
//         <Routes>
//           <Route path="/department" element={<DepartmentMaster />} />
//           <Route path="/add-user" element={<AddUser />} />
//           <Route path="/designation" element={<DesignationMaster />} />
//           <Route path="/bus" element={<BusMaster />} />
//           <Route path="/caste" element={<CasteMaster />} />
//           <Route path="/category" element={<CategoryMaster />} />
//           <Route path="/employeeType" element={<EmployeeTypeMaster />} />
//           <Route path="/holiday" element={<HolidayMaster />} />
//           <Route path="/leave" element={<LeaveMaster />} />
//           <Route path="/religion" element={<ReligionMaster />} />
//           <Route path="/shift" element={<ShiftMaster />} />
//         </Routes>
//       </div>
//     </Router>
//   );
// }

// export default App;


import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Menu, X } from "lucide-react"; // icons for hamburger and close

import AdminLogin from "./pages/AdminLogin";
import DesignationMaster from "./pages/DesignationMaster";
import DepartmentMaster from "./pages/DepartmentMaster";
import AddUser from "./pages/AddUser";
import BusMaster from "./pages/BusMaster";
import CasteMaster from "./pages/CasteMaster";
import EmployeeTypeMaster from "./pages/EmployeeTypeMaster";
import HolidayMaster from "./pages/HolidayMaster";
import LeaveMaster from "./pages/LeaveMaster";
import ReligionMaster from "./pages/ReligionMaster";
import ShiftMaster from "./pages/ShiftMaster";
import CategoryMaster from "./pages/CategoryMaster";

function App() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/add-user", label: "Add User" },
    { path: "/department", label: "Department" },
    { path: "/designation", label: "Designation" },
    { path: "/bus", label: "Bus" },
    { path: "/caste", label: "Caste" },
    { path: "/category", label: "Category" },
    { path: "/employeeType", label: "Employee Type" },
    { path: "/holiday", label: "Holiday" },
    { path: "/leave", label: "Leave" },
    { path: "/religion", label: "Religion" },
    { path: "/shift", label: "Shift" },
  ];
  localStorage.setItem("adminName", "admin123");
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        {/* Navbar */}
        <nav className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
          <h1 className="text-lg font-bold">Admin Dashboard</h1>

          {/* Desktop Links */}
          <div className="hidden lg:flex gap-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="px-3 py-2 rounded-lg hover:bg-blue-700"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Hamburger Menu for Mobile */}
          <button
            className="lg:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {/* Overlay when drawer is open */}
        {isOpen && (
          <div
            className="fixed inset-0 backdrop-blur-md bg-black/30 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Mobile Drawer (from right) */}
        <div
          className={`fixed top-0 right-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 z-50
            ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="p-4 flex justify-between items-center border-b">
            <h2 className="text-lg font-bold text-blue-600">Menu</h2>
            <button onClick={() => setIsOpen(false)}>
              <X size={24} />
            </button>
          </div>
          <div className="flex flex-col p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="px-3 py-2 rounded-lg hover:bg-blue-100 text-gray-700"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-6 bg-gray-100">
          <Routes>
            
            <Route path="/" element={<AdminLogin />} />
            <Route path="/department" element={<DepartmentMaster />} />
            <Route path="/add-user" element={<AddUser />} />
            <Route path="/designation" element={<DesignationMaster />} />
            <Route path="/bus" element={<BusMaster />} />
            <Route path="/caste" element={<CasteMaster />} />
            <Route path="/category" element={<CategoryMaster />} />
            <Route path="/employeeType" element={<EmployeeTypeMaster />} />
            <Route path="/holiday" element={<HolidayMaster />} />
            <Route path="/leave" element={<LeaveMaster />} />
            <Route path="/religion" element={<ReligionMaster />} />
            <Route path="/shift" element={<ShiftMaster />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
=======
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/userDashboard" element={<UserDashboard />} />
        <Route path="/adminDashboard" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
>>>>>>> Stashed changes
