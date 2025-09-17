import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import LoginPage from "./pages/LoginPage";
import { jwtDecode } from "jwt-decode";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 
  "180795642065-a8vha11jug7jv8ip5b4ivggi39pqej6h.apps.googleusercontent.com";

// 🔹 Role-based private route
function PrivateRoute({ children, allowedRoles }) {
  const token = sessionStorage.getItem("token"); // only token stored

  if (!token) return <Navigate to="/" />; // not logged in

  try {
    const decoded = jwtDecode(token); // decode JWT
    const role = decoded.role; // get role from token

    if (allowedRoles && !allowedRoles.includes(role)) {
      return <Navigate to="/" />; // role not allowed
    }

    return children; // role allowed
  } catch (err) {
    console.error("Invalid token:", err);
    return <Navigate to="/" />; // invalid token
  }
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
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
              <PrivateRoute allowedRoles={["Admin"]}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
