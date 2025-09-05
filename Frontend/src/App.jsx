// import { useState } from "react";
// import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
// import DesignationMaster from "./pages/DesignationMaster";
// import DepartmentMaster from "./pages/DepartmentMaster";
// import AddUser from "./pages/AddUser";
// import BusMaster from "./pages/BusMaster";
// import CasteMaster from "./pages/CasteMaster";
// import EmployeeTypeMaster from "./pages/EmployeeTypeMaster";
// import HolidayMaster from "./pages/HolidayMaster";
// import LeaveMaster from "./pages/LeaveMaster";
// import ReligionMaster from "./pages/ReligionMaster";
// import ShiftMaster from "./pages/ShiftMaster";
// import CategoryMaster from "./pages/CategoryMaster";


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
import React from 'react'
import Login from "./pages/Login.jsx";
import { GoogleOAuthProvider } from "@react-oauth/google";

function App() {
  return (
    <GoogleOAuthProvider clientId="657703650059-ja1rcg1839cutqq1q042lj5ogti0egpm.apps.googleusercontent.com">
      <Login />
    </GoogleOAuthProvider>
  );
}
export default App;
