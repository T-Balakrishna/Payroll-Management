import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import './i18n';
import LoginPage from "./pages/LoginPage";
import ForgotPassword from "./pages/ForgotPassword"; // Add ForgotPassword
import ResetPassword from "./pages/ResetPassword"; // Add ResetPassword
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import { CompanyProvider } from "./context/CompanyContext";

// Optional 404 page
function NotFound() {
  return (
    <div className="flex items-center justify-center h-screen">
      <h1 className="text-4xl font-bold text-red-600">404 - Page Not Found</h1>
    </div>
  );
}

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "YOUR_GOOGLE_CLIENT_ID_HERE";

// 🔹 Role-based private route
function PrivateRoute({ children, allowedRoles }) {
  const token = sessionStorage.getItem("token");
  if (!token) return <Navigate to="/" />;

  try {
    const decoded = jwtDecode(token);
    const role = decoded.role;
    if (allowedRoles && !allowedRoles.includes(role)) {
      return <Navigate to="/" />;
    }
    return children;
  } catch (err) {
    console.error("Invalid token:", err);
    return <Navigate to="/" />;
  }
}

// 🔹 Redirect logged-in users from public pages
function PublicRoute({ children }) {
  const token = sessionStorage.getItem("token");
  if (token) {
    try {
      const role = jwtDecode(token).role;
      const adminRoles = ["Admin", "Super Admin", "Department Admin"];
      if (adminRoles.includes(role)) return <Navigate to="/adminDashboard" />;
      return <Navigate to="/userDashboard" />;
    } catch {
      sessionStorage.removeItem("token");
      return children;
    }
  }
  return children;
}

export default function App() {
  return (
    <CompanyProvider>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route
              path="/"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            />
            <Route
              path="/reset-password/:token"
              element={
                <PublicRoute>
                  <ResetPassword />
                </PublicRoute>
              }
            />

            {/* Protected routes */}
            <Route
              path="/userDashboard"
              element={
                <PrivateRoute allowedRoles={["Staff"]}>
                  <UserDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/adminDashboard"
              element={
                <PrivateRoute allowedRoles={["Admin", "Super Admin", "Department Admin"]}>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />

            {/* Catch-all 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <ToastContainer />
      </GoogleOAuthProvider>
    </CompanyProvider>
  );
}