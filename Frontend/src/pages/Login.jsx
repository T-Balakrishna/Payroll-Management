import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import Admin from "./Admin.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  const handleLogin = () => {
    if (!email || !password) return alert("Please enter email and password");

    if (email.toLowerCase().startsWith("admin")) {
      // Use in-memory storage instead of localStorage for artifacts
      setIsAdminLoggedIn(true);
    } else {
      alert("Only admin login is allowed here");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const token = credentialResponse.credential;

      // Fixed import syntax for jwt-decode
      const { jwtDecode } = await import("jwt-decode");
      // Alternative approach if above doesn't work:
      // const jwtDecode = (await import("jwt-decode")).default;
      
      const user = jwtDecode(token);

      if (user.email && user.email.toLowerCase().startsWith("2312080")) {
        // Use in-memory storage instead of localStorage for artifacts
        setIsAdminLoggedIn(true);
      } else {
        alert("Only admin login is allowed here");
      }
    } catch (error) {
      console.error("JWT decode error:", error);
      alert("Failed to process Google login");
    }
  };

  const handleGoogleError = () => {
    console.error("Google Sign-In Failed");
    alert("Google Sign-In Failed");
  };

  if (isAdminLoggedIn) return <Admin />;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white w-[400px] shadow-lg rounded-xl p-6">
        <div className="bg-blue-600 text-white rounded-t-xl -mx-6 -mt-6 mb-6 px-6 py-3">
          <h2 className="text-xl font-bold">LOGIN</h2>
        </div>

        <div className="mb-4">
          <label className="block font-semibold mb-1">College Mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your email"
          />
        </div>

        <div className="mb-4">
          <label className="block font-semibold mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your password"
          />
        </div>

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition"
        >
          Login
        </button>

        <div className="my-4 flex items-center">
          <hr className="flex-1 border-gray-300" />
          <span className="px-3 text-gray-500 text-sm">OR</span>
          <hr className="flex-1 border-gray-300" />
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap={false}
            auto_select={false}
          />
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Note: Only admin accounts are allowed to login
          </p>
        </div>
      </div>
    </div>
  );
}