import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DepartmentMaster from "./pages/DepartmentMaster";
import CompanyMaster from "./pages/CompanyMaster";
import RoleMaster from "./pages/RoleMaster";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AddUser from "./pages/AddUser";
import SplashScreen from "./components/common/SplashScreen";
import './index.css';
import DesignationMaster from "./pages/DesignationMaster";

function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

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

          <Route
            path="/departments"
            element={
              <ProtectedRoute roles={["Admin","Super Admin"]}>
                <DepartmentMaster />
              </ProtectedRoute>
            }
          />

          <Route
            path="/designations"
            element={
              <ProtectedRoute roles={["Admin","Super Admin"]}>
                <DesignationMaster />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute roles={["User", "Staff","Admin","Super Admin"]}>
                <AddUser />
              </ProtectedRoute>
            }
          />

          

          <Route
            path="/companies"
            element={
              <ProtectedRoute roles={["Super Admin"]}>
                <CompanyMaster />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roles"
            element={
              <ProtectedRoute roles={["Admin", "Super Admin"]}>
                <RoleMaster />
              </ProtectedRoute>
            }
          />
          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
