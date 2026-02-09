import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import DepartmentMaster from "./pages/DepartmentMaster";
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DepartmentMaster />} />
        <Route path="/adminDashboard" element={<AdminDashboard />} />
        <Route path="/userDashboard" element={<UserDashboard />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </BrowserRouter>
  );
}
{/* <img class=" lazyloaded" src="https://nec.edu.in/wp-content/uploads/2024/01/NEC-LOGO1-unscreen.gif" data-src="https://nec.edu.in/wp-content/uploads/2024/01/NEC-LOGO1-unscreen.gif" alt="Loading..." id="preloader-logo"></img> */}
export default App;
