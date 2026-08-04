import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Activity,
  LineChart,
} from "lucide-react";
import { useI18n } from "../i18n/language-context";
import { loginUser, signupUser, setAuthToken } from "../services/api";
import { useToast } from "../hooks/useToast";
import CsLogo from "../assets/cs-logo.png";

export default function AuthModal({ isOpen, onClose, initialMode = "login", onLogin }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [mode, setMode] = useState(initialMode); // "login" | "signup"

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup state
  const [signupData, setSignupData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!loginEmail.trim() || !loginPassword.trim()) {
      const msg = t("common.fillAllFields") || "Please fill in all fields";
      setError(msg);
      showError(msg);
      return;
    }

    setIsLoading(true);
    try {
      const response = await loginUser({ email: loginEmail, password: loginPassword });
      setAuthToken(response.token);
      if (onLogin) {
        onLogin(response.user, response.token);
      }

      onClose();

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

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!signupData.name.trim() || !signupData.email.trim() || !signupData.password.trim()) {
      const msg = "Please fill in all required fields";
      setError(msg);
      showError(msg);
      return;
    }

    if (signupData.password.length < 8) {
      const msg = "Password must be at least 8 characters";
      setError(msg);
      showError(msg);
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      const msg = "Passwords do not match";
      setError(msg);
      showError(msg);
      return;
    }

    setIsLoading(true);
    try {
      await signupUser({
        name: signupData.name,
        email: signupData.email,
        password: signupData.password,
      });
      showSuccess("Account created successfully! Switching to login...");
      setMode("login");
      setLoginEmail(signupData.email);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || t("common.serverError") || "Registration failed";
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop overlay with blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative w-full max-w-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden z-10 my-auto"
        >
          {/* Top Banner & Close Button */}
          <div className="relative bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 px-6 py-6 text-white text-center flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white/80 hover:text-white hover:bg-black/40 transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center gap-2 mb-4">
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center p-2 shadow-lg ring-1 ring-white/30">
                <img src={CsLogo} alt="CattleSense" className="h-full w-full object-contain" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-white">CattleSense</h3>
                <p className="text-xs text-emerald-100/90 font-medium">Cattle Health Platform</p>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-black/20 p-1 rounded-xl w-full max-w-xs">
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${mode === "login"
                    ? "bg-white text-emerald-800 shadow-md"
                    : "text-emerald-100/80 hover:text-white"
                  }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => { setMode("signup"); setError(""); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${mode === "signup"
                    ? "bg-white text-emerald-800 shadow-md"
                    : "text-emerald-100/80 hover:text-white"
                  }`}
              >
                Create Account
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto">
            {error && (
              <div className="mb-5 p-3.5 text-xs rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-medium">
                {error}
              </div>
            )}

            {mode === "login" ? (
              <div>
                <div className="mb-5 text-center">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                    {t("auth.loginTitle") || "Welcome Back!"}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("auth.loginSubtitle") || "Enter your credentials to access your farm workspace."}
                  </p>
                </div>
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="farmer@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
            ) : (
              <div>
                <div className="mb-5 text-center">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                    {t("auth.signupTitle") || "Create your account"}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("auth.signupSubtitle") || "Get started with CattleSense smart health monitoring."}
                  </p>
                </div>
                <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      name="name"
                      required
                      value={signupData.name}
                      onChange={handleSignupChange}
                      placeholder="John Doe"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      required
                      value={signupData.email}
                      onChange={handleSignupChange}
                      placeholder="farmer@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Password (Min 8 chars)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      name="password"
                      required
                      value={signupData.password}
                      onChange={handleSignupChange}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      required
                      value={signupData.confirmPassword}
                      onChange={handleSignupChange}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 mt-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Create Free Account
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
            )}

            {/* Footer switcher note */}
            <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
              {mode === "login" ? (
                <p>
                  Don't have an account?{" "}
                  <button
                    onClick={() => { setMode("signup"); setError(""); }}
                    className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Sign up now
                  </button>
                </p>
              ) : (
                <p>
                  Already registered?{" "}
                  <button
                    onClick={() => { setMode("login"); setError(""); }}
                    className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Log in here
                  </button>
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
