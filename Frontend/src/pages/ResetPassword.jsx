import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../api";
import { FaLock } from "react-icons/fa"; // For lock icon

export default function ResetPassword() {
  const navigate = useNavigate();
  // const { token } = useParams(); // Extract token from URL
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Validate password
  const validatePassword = (password) => {
    return password.length >= 8; // Minimum 8 characters
  };

  useEffect(() => {
    token = sessionStorage.getItem("token");
    decoded = token ? jwtDecode(token) : "";
    userNumber = decoded?.userNumber;
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newPassword || !confirmPassword) {
      setError("Please enter and confirm your new password");
      return toast.error("Please enter and confirm your new password");
    }

    if (!validatePassword(newPassword)) {
      setError("Password must be at least 8 characters long");
      return toast.error("Password must be at least 8 characters long");
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return toast.error("Passwords do not match");
    }

    setIsLoading(true);

    try {
      // Call reset-password endpoint
      await API.post("/auth/reset-password", { token, newPassword });
      setSuccess("✅ Password reset successfully. You can now log in.");
      toast.success("Password reset successfully");
      setTimeout(() => navigate("/"), 2000); // Redirect to login after 2s
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.msg || "Failed to reset password";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-gray-100 relative overflow-hidden">
      {/* Background blur effect */}
      <div className="absolute inset-0 backdrop-blur-sm" />

      {/* Main form container with fade-in animation */}
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md z-10 transform transition-all hover:scale-105 animate-fadeIn">
        {/* Title */}
        <h1 className="text-3xl font-extrabold text-center text-gray-800 mb-2">
          Reset Password
        </h1>
        <h2 className="text-xl font-semibold text-center text-gray-600 mb-6">
          Staff Attendance & Payroll Management
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New Password Input with lock icon */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Confirm Password Input with lock icon */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-gray-50"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Success or Error Message */}
          {success && (
            <div className="text-green-600 text-sm text-center">{success}</div>
          )}
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}

          {/* Submit Button with Loading Spinner */}
          <button
            type="submit"
            className="w-full p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition font-medium flex items-center justify-center"
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
              "Reset Password"
            )}
          </button>
        </form>

        {/* Back to Login Link */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Remember your password?{' '}
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