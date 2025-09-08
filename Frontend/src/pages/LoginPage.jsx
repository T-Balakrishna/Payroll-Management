import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import API from "../api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) return alert("Enter email & password");

    try {
      const res = await API.post("/auth/login", { userMail: email, password });
      const { token, role } = res.data;
      localStorage.setItem("token", token);
      navigate(role === "Admin" ? "/adminDashboard" : "/userDashboard");
    } catch (err) {
      alert(err.response?.data?.msg || "Login failed");
    }
  };

  const handleGoogleSuccess = async (res) => {
    if (!res?.credential) return alert("Google login failed");

    try {
      const apiRes = await API.post("/auth/google-login", { token: res.credential });
      const { token, role } = apiRes.data;
      localStorage.setItem("token", token);
      navigate(role === "Admin" ? "/adminDashboard" : "/userDashboard");
    } catch (err) {
      alert(err.response?.data?.msg || "Google login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded shadow w-[400px]">
        <h2 className="text-xl font-bold mb-4">LOGIN</h2>

        <input
          type="email"
          placeholder="College Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
        />

        <button
          onClick={handleLogin}
          className="w-full p-2 bg-blue-600 text-white rounded"
        >
          Login
        </button>

        <div className="mt-4 flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => alert("Google login error")}
          />
        </div>
      </div>
    </div>
  );
}
