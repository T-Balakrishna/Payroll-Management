import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../api"; // ✅ same setup as LoginPage.jsx
import { FaEnvelope } from "react-icons/fa";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Simple reusable email validation
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) return toast.error("Please enter your email");
    if (!isValidEmail(email)) return toast.error("Enter a valid email address");

    setIsLoading(true);
    try {
      // ⏳ Simulate backend call
      await new Promise((r) => setTimeout(r, 800));
      await API.post("/auth/forgot-password", { email });

      toast.success("✅ Password reset link sent to your email!");
      setEmail("");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.msg || "Failed to send reset link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-gray-100 overflow-hidden relative">
      {/* Soft background blur + gradient animation */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-200 via-purple-100 to-white animate-gradient" />

      {/* Main Card */}
      <div className="relative bg-white p-8 rounded-2xl shadow-xl w-full max-w-md z-10 transform transition-all hover:scale-[1.02] animate-fadeIn">
        <h1 className="text-3xl font-extrabold text-center text-gray-800 mb-1">
          Forgot Password
        </h1>
        <p className="text-center text-gray-500 mb-6">
          Enter your registered email to receive a reset link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold flex items-center justify-center transition focus:ring-2 focus:ring-blue-400"
            disabled={isLoading}
          >
            {isLoading ? (
              <svg
                className="animate-spin h-5 w-5 mr-2 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Remember your password?{" "}
          <button
            onClick={() => navigate("/")}
            className="text-blue-600 hover:underline focus:outline-none"
          >
            Back to Login
          </button>
        </p>
      </div>
    </div>
  );
}