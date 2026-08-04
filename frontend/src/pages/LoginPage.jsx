import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  LineChart,
  CheckCircle2,
} from "lucide-react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useI18n } from "../i18n/language-context";
import { loginUser, setAuthToken } from "../services/api";
import { useToast } from "../hooks/useToast";
import PageWrapper from "../components/PageWrapper";
import CsLogo from "../assets/cs-logo.png";
import HeroCows from "../assets/hero-cows.jpg";

export default function LoginPage({ onLogin }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      const msg = t("common.fillAllFields") || "Please fill in all fields";
      setError(msg);
      showError(msg);
      return;
    }

    setIsLoading(true);
    try {
      const response = await loginUser({ email, password });
      setAuthToken(response.token);
      if (onLogin) {
        onLogin(response.user, response.token);
      }

      if (response?.user?.role === "admin") {
        localStorage.setItem("admin_token", response.token);
        localStorage.setItem("admin_user", JSON.stringify(response.user));
        showSuccess("Welcome back! Redirecting to admin panel...");
        navigate("/admin", { replace: true });
      } else {
        showSuccess("Welcome back! Redirecting to disease health checks...");
        navigate("/modules", { replace: true });
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || t("auth.loginFailed") || "Invalid email or password";
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 lg:p-10 overflow-hidden bg-slate-950">
      {/* Landing Page Background Photo with Dark Vignette */}
      <div className="absolute inset-0 z-0">
        <img
          src={HeroCows}
          alt="CattleSense Farm Background"
          className="h-full w-full object-cover object-center scale-105 filter brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/80 to-slate-900/60 backdrop-blur-[2px]" />
      </div>

      {/* Main Glass Card Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 20 }}
        className="relative z-10 w-full max-w-4xl bg-white/90 dark:bg-slate-900/85 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-white/10 overflow-hidden grid grid-cols-1 lg:grid-cols-12"
      >
        {/* Left Side - Clean & Minimal Branding */}
        <div className="lg:col-span-5 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 p-8 sm:p-10 text-white flex flex-col justify-between items-center text-center relative overflow-hidden">
          {/* Subtle ambient lighting */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center my-auto">
            {/* Logo */}
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center p-2 shadow-lg ring-1 ring-white/30">
                <img src={CsLogo} alt="CattleSense" className="h-full w-full object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">CattleSense</h1>
                <p className="text-xs text-emerald-100/90 font-medium">Cattle Health Platform</p>
              </div>
            </div>

            {/* Welcome Back Heading & Subtitle */}
            <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3">
              Welcome Back!
            </h2>
            <p className="text-emerald-100/90 text-sm leading-relaxed mb-6 max-w-xs">
              Sign in to access your farm workspace, check cattle health, and track productivity records.
            </p>
          </div>

          <div className="relative z-10 pt-4 border-t border-white/20 text-xs text-emerald-100/80 font-medium w-full text-center">
            CattleSense Cattle Health Platform
          </div>
        </div>

        {/* Right Side Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Top Navigation Row */}
            <div className="flex items-center justify-between mb-6">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
              <LanguageSwitcher />
            </div>

            {/* Header & Tabs */}
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl w-full max-w-xs mb-6">
                <button
                  type="button"
                  className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/signup")}
                  className="flex-1 py-1.5 text-xs font-bold rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Create Account
                </button>
              </div>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                {t("auth.loginTitle") || "Welcome Back!"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("auth.loginSubtitle") || "Enter your credentials to access your farm workspace."}
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-5 p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-medium">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="farmer@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In to Platform
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
            Don't have an account yet?{" "}
            <Link to="/signup" className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
              Create a free account
            </Link>
          </div>
        </div>
      </motion.div>
    </PageWrapper>
  );
}
