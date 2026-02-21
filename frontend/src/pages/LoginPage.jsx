// LoginPage.jsx
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useState, useEffect } from "react";
import API from "../api";
import { toast } from "react-toastify";
import { useAuth } from "../auth/AuthContext";
import { getDashboardRouteForRole } from "../auth/roleRouting";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading, refresh } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // ── Typing animation phrases ──
  const phrases = [
    "Transforming lives through quality education and research with human values.",
    "To maintain excellent infrastructure and highly qualified and dedicated faculty.",
    "To provide a conducive environment with an ambiance of humanity, wisdom, creativity, and team spirit.",
    "To promote the values of ethical behavior and commitment to the society.",
    "To partner with academic, industrial, and government entities to attain collaborative research.",
  ];

  const [displayedText, setDisplayedText] = useState("");
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex];

    if (!isDeleting && charIndex < currentPhrase.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + currentPhrase[charIndex]);
        setCharIndex((prev) => prev + 1);
      }, 60);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && charIndex > 0) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev.slice(0, -1));
        setCharIndex((prev) => prev - 1);
      }, 40);
      return () => clearTimeout(timeout);
    }

    if (!isDeleting && charIndex === currentPhrase.length) {
      const timeout = setTimeout(() => setIsDeleting(true), 2200);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
    }
  }, [charIndex, isDeleting, currentPhraseIndex]);

  // Check if already logged in
  useEffect(() => {
    if (!loading && user?.role) {
      const route = getDashboardRouteForRole(user.role);
      if (route) {
        navigate(route, { replace: true });
      }
    }
  }, [user, loading, navigate]);


  const handleLogin = async () => {
    if (!identifier || !password) {
      return toast.error("Enter email/user number and password");
    }

    try {
      const { data } = await API.post("/auth/login", { identifier, password });
      
      const refreshedUser = await refresh();
      const role = data?.role || refreshedUser?.role;

      if (!role) throw new Error("No role returned");
      const route = getDashboardRouteForRole(role);
      if (!route) throw new Error("Your role does not have portal access");

      navigate(route, { replace: true });

      toast.success("Login successful");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Login failed");
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    await handleLogin();
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      return toast.error("Google login failed");
    }

    try {
      await API.post("/auth/google-login", {
        token: credentialResponse.credential,
      });

      const user = await refresh();
      const role = user?.role;

      if (!role) throw new Error("No role returned");
      const route = getDashboardRouteForRole(role);
      if (!route) throw new Error("Your role does not have portal access");

      navigate(route, { replace: true });

      toast.success("Login successful");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Google login failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 xl:gap-16 items-center">

          {/* Left side: Login form + title */}
          <div className="w-full max-w-md mx-auto lg:mx-0 space-y-10 order-2 lg:order-1">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight">
                National Engineering College
              </h1>
            </div>

            {/* Typing animation – mobile only */}
            <div className="lg:hidden min-h-[120px] flex items-center justify-center px-4">
              <div className="flex items-start gap-3 max-w-sm text-2xl font-medium text-[#0a74da]">
                <div className="relative w-5 h-5 flex-shrink-0 mt-1">
                  <div className="absolute inset-0 rounded-full bg-[#0a74da] opacity-40 animate-ping"></div>
                  <div className="absolute inset-0 rounded-full bg-[#0a74da] animate-pulse"></div>
                </div>
                <div className="tracking-wide leading-relaxed">
                  {displayedText}
                  <span className="animate-pulse">|</span>
                </div>
              </div>
            </div>

            {/* Form */}
            <form className="space-y-6" onSubmit={handleLoginSubmit}>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email or User Number"
                className="w-full px-5 py-4 rounded-2xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition shadow-sm text-base"
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-5 py-4 rounded-2xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition shadow-sm text-base"
              />

              <button
                type="submit"
                className="w-full py-4 bg-black text-white rounded-2xl font-semibold text-lg hover:bg-gray-900 transition duration-200 shadow-md"
              >
                Continue
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-50 text-gray-500">or</span>
              </div>
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error("Google login error")}
                useOneTap={false}
                theme="outline"
                shape="rectangular"
                logo_alignment="left"
                text="continue_with"
                width={300}
              />
            </div>

            <div className="text-center">
              <button
                onClick={() => navigate("/forgot-password")}
                className="text-sm text-gray-600 hover:text-black underline underline-offset-4 transition"
              >
                Forgot password?
              </button>
            </div>
          </div>

          {/* Right side: Typing animation (desktop only) */}
          <div className="hidden lg:flex lg:items-center lg:justify-center min-h-[320px] xl:min-h-[400px] order-1 lg:order-2">
            <div className="flex items-start gap-4 max-w-xl text-3xl xl:text-4xl font-medium text-[#0a74da]">
              <div className="relative w-6 h-6 flex-shrink-0 mt-5">
                <div className="absolute inset-0 rounded-full bg-[#0a74da] opacity-40 animate-ping"></div>
                <div className="absolute inset-0 rounded-full bg-[#0a74da] animate-pulse"></div>
              </div>
              <div className="tracking-wide leading-relaxed">
                {displayedText}
                <span className="animate-pulse">|</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
