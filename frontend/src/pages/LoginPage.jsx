import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import API from "../api";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

export default function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState(""); // email or userNumber
  const [password, setPassword] = useState("");

  const adminRoles = ["Admin", "Super Admin", "Department Admin"];

  const handleLogin = async () => {
    if (!identifier || !password) return toast.error("Enter email/userNumber & password");

    try {
      const res = await API.post("/auth/login", { identifier, password });
      const { token } = res.data;

      sessionStorage.setItem("token", token);

      setTimeout(() => {
        const role = jwtDecode(token).role;
        navigate(adminRoles.includes(role) ? "/adminDashboard" : "/userDashboard");
      }, 0);
      toast.success("Login Success");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.msg || "Login failed");
    }
  };

  const handleGoogleSuccess = async (res) => {
    if (!res?.credential) return toast.error("Google login failed");

    try {
      const apiRes = await API.post("/auth/google-login", { token: res.credential });
      const { token } = apiRes.data;

      sessionStorage.setItem("token", token);
      const role = jwtDecode(token).role;
      navigate(adminRoles.includes(role) ? "/adminDashboard" : "/userDashboard");
      toast.success("Login Success");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.msg || "Google login failed");
    }
  };

  const particlesInit = async (main) => {
    await loadFull(main);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-gray-100 relative overflow-hidden">
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          background: { color: { value: "transparent" } },
          fpsLimit: 60,
          particles: {
            number: { value: 50, density: { enable: true, value_area: 800 } },
            color: { value: ["#3b82f6", "#8b5cf6", "#6b7280"] },
            shape: { type: "circle" },
            opacity: { value: 0.5, random: true },
            size: { value: 3, random: true },
            move: {
              enable: true,
              speed: 1,
              direction: "none",
              random: true,
              out_mode: "out",
            },
          },
          interactivity: {
            events: {
              onhover: { enable: true, mode: "repulse" },
              onclick: { enable: true, mode: "push" },
            },
          },
          detectRetina: true,
        }}
        className="absolute inset-0"
      />
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md z-10 transform transition-all hover:scale-105">
        <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-2">
          Staff Attendance & Payroll
        </h1>
        <h2 className="text-2xl font-semibold text-center text-gray-600 mb-6">
          Management System
        </h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email or User Number
            </label>
            <input
              type="text"
              placeholder="Enter email or user number"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50"
            />
          </div>

          <button
            onClick={handleLogin}
            className="w-full p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition font-medium"
          >
            Sign In
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center">
          <div className="text-sm text-gray-500 font-medium">OR</div>
        </div>

        <div className="mt-4 flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error("Google login error")}
          />
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          <button
            onClick={() => navigate("/forgot-password")}
            className="text-blue-600 hover:underline focus:outline-none"
          >
            Forgot Password?
          </button>
        </p>
      </div>
    </div>
  );
}