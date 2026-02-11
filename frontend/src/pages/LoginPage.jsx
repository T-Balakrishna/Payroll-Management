import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import API from "../api";
import { toast } from "react-toastify";
import { useAuth } from "../auth/AuthContext";
import LoadingScreen from "../components/common/LoadingScreen";

export default function LoginPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pageLoading, setPageLoading] = useState(true);     // controls initial loading screen
  const [actionLoading, setActionLoading] = useState(false); // controls loading during login

  const adminRoles = ["Admin", "Super Admin", "Department Admin"];

  /* ---------------- Normal Login ---------------- */
  const handleLogin = async () => {
    if (!identifier || !password) {
      return toast.error("Enter email/user number and password");
    }

    try {
      await API.post("/auth/login", { identifier, password });

      const user = await refresh();
      const role = user?.role;

      if (!role) throw new Error("No role returned");

      navigate(
        adminRoles.includes(role) ? "/adminDashboard" : "/userDashboard",
        { replace: true }
      );
      toast.success("Login successful");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Login failed");
    }
  };

  /* ---------------- Google Login ---------------- */
  const handleGoogleSuccess = async (res) => {
    if (!res?.credential) {
      return toast.error("Google login failed");
    }

    setActionLoading(true);
    try {
      await API.post("/auth/google-login", {
        token: credentialResponse.credential,
      });

      const user = await refresh();
      const role = user?.role;

      if (!role) throw new Error("No role returned");

      navigate(
        adminRoles.includes(role) ? "/adminDashboard" : "/userDashboard",
        { replace: true }
      );
      toast.success("Login successful");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Google login failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Show full-screen loading during initial auth check
  if (pageLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        
        <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-2">
          Staff Attendance & Payroll
        </h1>
        <h2 className="text-xl font-semibold text-center text-gray-600 mb-6">
          Management System
        </h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email or User Number
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter email or user number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter password"
            />
          </div>

          <button
            onClick={handleLogin}
            className="w-full p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition"
          >
            Sign In
          </button>
        </div>

        <div className="my-6 text-center text-gray-500 font-medium">
          OR
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error("Google login error")}
          />
        </div>

        <p className="mt-6 text-center text-sm">
          <button
            onClick={() => navigate("/forgot-password")}
            className="text-blue-600 hover:underline"
          >
            Forgot Password?
          </button>
        </p>
      </div>
    </div>
  );
}