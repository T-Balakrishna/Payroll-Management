import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import DepartmentMaster from "./pages/DepartmentMaster";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import './index.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/adminDashboard"
            element={
              <ProtectedRoute roles={["Admin", "Super Admin", "Department Admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/userDashboard"
            element={
              <ProtectedRoute roles={["User", "Staff"]}>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
{/* <img class=" lazyloaded" src="https://nec.edu.in/wp-content/uploads/2024/01/NEC-LOGO1-unscreen.gif" data-src="https://nec.edu.in/wp-content/uploads/2024/01/NEC-LOGO1-unscreen.gif" alt="Loading..." id="preloader-logo"></img> */}
export default App;
