import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import API from "../api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState(""); // email or userNumber
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!identifier || !password) return alert("Enter email/userNumber & password");

    try {
      const res = await API.post("/auth/login", { identifier, password });
      const { token, user } = res.data;

      sessionStorage.setItem("token", token);
      sessionStorage.setItem("userNumber", user.userNumber);
      navigate(user.role === "Admin" ? "/adminDashboard" : "/userDashboard");
    } catch (err) {
      alert(err.response?.data?.msg || "Login failed");
    }
  };

  const handleGoogleSuccess = async (res) => {
    if (!res?.credential) return alert("Google login failed");

    try {
      const apiRes = await API.post("/auth/google-login", { token: res.credential });
      const { token, user } = apiRes.data;

      sessionStorage.setItem("token", token);
      sessionStorage.setItem("userNumber", user.userNumber);

      navigate(user.role === "Admin" ? "/adminDashboard" : "/userDashboard");
    } catch (err) {
      alert(err.response?.data?.msg || "Google login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded shadow w-[400px]">
        <h2 className="text-xl font-bold mb-4">LOGIN</h2>

        <input
          type="text"
          placeholder="Email or User Number"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
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
