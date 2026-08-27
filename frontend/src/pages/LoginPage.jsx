import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  LineChart,
  CheckCircle2,
  Clock,
  RotateCcw,
  Check,
} from "lucide-react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useI18n } from "../i18n/language-context";
import {
  loginUser,
  setAuthToken,
  requestPasswordReset,
  verifyResetOtp,
  resetPassword,
} from "../services/api";
import { useToast } from "../hooks/useToast";
import PageWrapper from "../components/PageWrapper";
import CsLogo from "../assets/cs-logo.png";
import HeroCows from "../assets/hero-cows.jpg";

export default function LoginPage({ onLogin }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // "login" or "forgot"
  const [mode, setMode] = useState("login");

  // Login state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password recovery state (steps: 1 = Email, 2 = OTP, 3 = New Password, 4 = Success)
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotSuccessInfo, setForgotSuccessInfo] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const otpInputRefs = useRef([]);

  // Mask email for privacy
  const maskEmail = (str) => {
    if (!str || !str.includes("@")) return str;
    const [name, domain] = str.split("@");
    if (name.length <= 2) return `${name[0]}***@${domain}`;
    return `${name[0]}***${name[name.length - 1]}@${domain}`;
  };

  // OTP Countdown timer
  useEffect(() => {
    let timer;
    if (mode === "forgot" && forgotStep === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mode, forgotStep, countdown]);

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!identifier.trim() || !password.trim()) {
      const msg = t("common.fillAllFields") || "Please fill in all fields";
      setError(msg);
      showError(msg);
      return;
    }

    setIsLoading(true);
    try {
      const response = await loginUser({ identifier: identifier.trim(), password });
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
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        t("auth.loginFailed") ||
        "Invalid login credentials";
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password handlers
  const handleRequestOtp = async (e) => {
    e?.preventDefault();
    setError("");
    setForgotSuccessInfo("");

    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await requestPasswordReset(cleanEmail);
      setForgotSuccessInfo(
        res?.message || "If an account exists for this email, a verification code has been sent."
      );
      setForgotStep(2);
      setCountdown(60);
      setCanResend(false);
      setOtpDigits(["", "", "", "", "", ""]);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
    } catch (err) {
      setError(err.message || "Failed to process request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || isLoading) return;
    setError("");
    setIsLoading(true);
    try {
      const res = await requestPasswordReset(forgotEmail.trim().toLowerCase());
      setForgotSuccessInfo(res?.message || "A new 6-digit verification code has been sent.");
      setCountdown(60);
      setCanResend(false);
      setOtpDigits(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message || "Unable to resend verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, "");
    if (!cleanVal) {
      const newDigits = [...otpDigits];
      newDigits[index] = "";
      setOtpDigits(newDigits);
      return;
    }

    if (cleanVal.length === 1) {
      const newDigits = [...otpDigits];
      newDigits[index] = cleanVal;
      setOtpDigits(newDigits);
      if (index < 5) {
        otpInputRefs.current[index + 1]?.focus();
      }
    } else if (cleanVal.length > 1) {
      const pasted = cleanVal.slice(0, 6).split("");
      const newDigits = [...otpDigits];
      pasted.forEach((char, i) => {
        if (i < 6) newDigits[i] = char;
      });
      setOtpDigits(newDigits);
      const nextIdx = Math.min(pasted.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setError("");

    const fullOtp = otpDigits.join("");
    if (fullOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyResetOtp(forgotEmail.trim().toLowerCase(), fullOtp);
      if (res?.reset_token) {
        setResetToken(res.reset_token);
        setForgotStep(3);
      } else {
        setError("Verification succeeded, but no reset authorization was received.");
      }
    } catch (err) {
      setError(err.message || "Invalid or expired verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e?.preventDefault();
    setError("");

    if (!newPassword || newPassword.length < 8) {
      setError("New password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(resetToken, newPassword);
      setForgotStep(4);
    } catch (err) {
      setError(err.message || "Failed to reset password. Please start over.");
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
            <Link to="/" className="flex flex-col items-center gap-2 mb-6 hover:opacity-90 transition-opacity">
              <img src={CsLogo} alt="CattleSense" className="h-9 w-9 object-contain shrink-0" />
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">CattleSense</h1>
                <p className="text-xs text-emerald-100/90 font-medium">Smart Cattle Health Platform</p>
              </div>
            </Link>

            {/* Left Welcome Title */}
            <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3">
              {mode === "login" ? "Welcome Back!" : "Account Recovery"}
            </h2>
            <p className="text-emerald-100/90 text-sm leading-relaxed mb-6 max-w-xs">
              {mode === "login"
                ? "Sign in to access your farm workspace, check cattle health, and track productivity records."
                : "Reset your password securely with email verification to restore access to your farm workspace."}
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
              {mode === "login" ? (
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </button>
              )}
              <LanguageSwitcher />
            </div>

            {/* Header & Mode Switcher Tabs */}
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl w-full max-w-xs mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    mode === "login"
                      ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (mode === "login") {
                      navigate("/signup");
                    } else {
                      setMode("login");
                    }
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    mode === "forgot"
                      ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {mode === "login" ? "Create Account" : "Reset Password"}
                </button>
              </div>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                {mode === "login" && (t("auth.loginTitle") || "Welcome Back!")}
                {mode === "forgot" && forgotStep === 1 && "Forgot Password?"}
                {mode === "forgot" && forgotStep === 2 && "Verify Security Code"}
                {mode === "forgot" && forgotStep === 3 && "Create New Password"}
                {mode === "forgot" && forgotStep === 4 && "Password Updated"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                {mode === "login" &&
                  (t("auth.loginSubtitle") || "Enter your credentials to access your farm workspace.")}
                {mode === "forgot" &&
                  forgotStep === 1 &&
                  "Enter your registered email address to receive a 6-digit verification code."}
                {mode === "forgot" &&
                  forgotStep === 2 &&
                  `Enter the 6-digit verification code sent to ${maskEmail(forgotEmail)}.`}
                {mode === "forgot" &&
                  forgotStep === 3 &&
                  "Choose a strong password with at least 8 characters."}
                {mode === "forgot" &&
                  forgotStep === 4 &&
                  "Your password has been changed successfully."}
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-5 p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-medium">
                {error}
              </div>
            )}

            {/* MODE: LOGIN */}
            {mode === "login" && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    {t("auth.mobileOrEmail") || "Mobile Number or Email"}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={t("auth.mobileOrEmailPlaceholder") || "07X XXXXXXX or farmer@email.com"}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setForgotStep(1);
                        setError("");
                        setForgotEmail(identifier.includes("@") ? identifier : "");
                      }}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
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
            )}

            {/* MODE: FORGOT PASSWORD (IN-PLACE) */}
            {mode === "forgot" && (
              <div>
                {/* Step 1: Request OTP */}
                {forgotStep === 1 && (
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                        Registered Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="farmer@example.com"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                        />
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
                          Send Verification Code
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Step 2: Verify 6-digit OTP */}
                {forgotStep === 2 && (
                  <form onSubmit={handleVerifyOtp} className="space-y-5">
                    {forgotSuccessInfo && (
                      <div className="p-3 text-xs rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-medium">
                        {forgotSuccessInfo}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider text-center">
                        6-Digit Verification Code
                      </label>
                      <div className="flex justify-center gap-2 sm:gap-2.5">
                        {otpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => (otpInputRefs.current[idx] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            className="h-12 w-10 sm:h-12 sm:w-11 text-center text-xl font-bold font-mono rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>Expires in 5 minutes</span>
                      </div>

                      <div>
                        {canResend ? (
                          <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={isLoading}
                            className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Resend Code
                          </button>
                        ) : (
                          <span>Resend in {countdown}s</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || otpDigits.join("").length !== 6}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isLoading ? (
                        <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          Verify Code & Continue
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotStep(1);
                          setError("");
                        }}
                        className="text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold transition-colors"
                      >
                        ← Change Email Address
                      </button>
                    </div>
                  </form>
                )}

                {/* Step 3: Create New Password */}
                {forgotStep === 3 && (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type={showNewPassword ? "text" : "password"}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-xs">
                      <div
                        className={`flex items-center gap-2 ${
                          newPassword.length >= 8
                            ? "text-emerald-600 dark:text-emerald-400 font-bold"
                            : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>At least 8 characters long</span>
                      </div>
                      <div
                        className={`flex items-center gap-2 ${
                          newPassword && newPassword === confirmPassword
                            ? "text-emerald-600 dark:text-emerald-400 font-bold"
                            : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Passwords match</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || newPassword.length < 8 || newPassword !== confirmPassword}
                      className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isLoading ? (
                        <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          Save New Password
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Step 4: Success */}
                {forgotStep === 4 && (
                  <div className="text-center py-4 space-y-4">
                    <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                      Your password has been updated securely. You can now sign in with your new password.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setForgotStep(1);
                        setError("");
                      }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all"
                    >
                      Sign In Now
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
            {mode === "login" ? (
              <>
                Don't have an account yet?{" "}
                <Link to="/signup" className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                  Create a free account
                </Link>
              </>
            ) : (
              <>
                Remember your credentials?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </PageWrapper>
  );
}

