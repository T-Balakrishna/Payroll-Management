import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import axios from "axios";

/** Lightweight base64url JWT payload decoder (no dependency) */
function parseJwt(token) {
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("parseJwt error", e);
    return null;
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email) return alert("Please enter email");
    try {
      const res = await axios.post("http://localhost:5000/api/users/login", {
        userMail: email,
        password,
      });
      const { token, role } = res.data;
      localStorage.setItem("token", token);
      navigate(role === "Admin" ? "/adminDashboard" : "/userDashboard");
    } catch (err) {
      alert(err.response?.data?.error || "Login failed");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    // credentialResponse should contain credential (JWT)
    const jwt = credentialResponse?.credential;
    if (!jwt) {
      return alert("Google response missing credential");
    }

    const decoded = parseJwt(jwt);
    if (!decoded) return alert("Failed to decode Google token");

    try {
      const res = await axios.post("http://localhost:5000/api/users/google-login", {
        email: decoded.email,
        name: decoded.name || decoded.given_name || "Google User",
      });
      const { token, role } = res.data;
      localStorage.setItem("token", token);
      navigate(role === "Admin" ? "/adminDashboard" : "/userDashboard");
    } catch (err) {
      alert(err.response?.data?.error || "Google login failed");
    }
  };

  const handleGoogleError = () => {
    alert("Google Sign-In Failed");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded shadow w-[400px]">
        <h2 className="text-xl font-bold mb-4">LOGIN</h2>

        <label className="block mb-2">College Mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
        />

        <label className="block mb-2">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
        />

        <button onClick={handleLogin} className="w-full p-2 bg-blue-600 text-white rounded">
          Login
        </button>

        <div className="mt-4 flex justify-center">
          <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
        </div>
      </div>
    </div>
  );
}
