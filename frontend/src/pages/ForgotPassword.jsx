import { useNavigate } from "react-router-dom";
import { useState } from "react";
import API from "../api";
import { toast } from "react-toastify";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  const handleForgotPassword = async () => {
    if (!email) {
      return toast.error("Enter your email");
    }

    try {
      await API.post("/auth/forgot-password", { email });
      toast.success("Reset link sent to your email");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to send reset link");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-gray-50 p-4">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-1">
          National Engineering College
        </h1>
        <h2 className="text-lg font-medium text-center text-gray-600 mb-4">
          Forgot Password
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 rounded-md border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              placeholder="Enter your email"
            />
          </div>

          <button
            onClick={handleForgotPassword}
            className="w-full p-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-md font-medium hover:from-indigo-700 hover:to-blue-700 transition shadow-sm"
          >
            Send Reset Link
          </button>
        </div>

        <p className="mt-4 text-center text-sm">
          <button
            onClick={() => navigate("/")}
            className="text-indigo-600 hover:underline font-medium"
          >
            Back to Login
          </button>
        </p>
      </div>
    </div>
  );
}