import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  MapPin,
  Compass,
  Hash,
  Award,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useI18n } from "../i18n/language-context";
import { loginUser, signupUser, setAuthToken } from "../services/api";
import { useToast } from "../hooks/useToast";
import { PROVINCES_DISTRICTS, FARMING_EXPERIENCE_OPTIONS } from "../pages/SignupPage";
import CsLogo from "../assets/cs-logo.png";

export default function AuthModal({ isOpen, onClose, initialMode = "login", onLogin }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [mode, setMode] = useState(initialMode); // "login" | "signup"

  // Login state
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup state
  const [signupData, setSignupData] = useState({
    fullName: "",
    mobileNumber: "",
    email: "",
    farmName: "",
    province: "",
    district: "",
    dsDivision: "",
    gnDivision: "",
    farmAddress: "",
    cattleCount: "",
    farmingExperience: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  if (!isOpen) return null;

  const availableDistricts = signupData.province ? PROVINCES_DISTRICTS[signupData.province] || [] : [];

  const handleSignupChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;

    setSignupData((prev) => {
      const updated = { ...prev, [name]: val };
      if (name === "province") {
        updated.district = "";
      }
      return updated;
    });

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      const msg = t("common.fillAllFields") || "Please fill in all fields";
      setError(msg);
      showError(msg);
      return;
    }

    setIsLoading(true);
    try {
      const response = await loginUser({ identifier: loginIdentifier.trim(), password: loginPassword });
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
      const errorMsg = err.response?.data?.error || err.response?.data?.message || t("auth.loginFailed") || "Invalid login credentials";
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const validateSignup = () => {
    const errors = {};

    if (!signupData.fullName.trim()) {
      errors.fullName = "Full Name is required";
    }

    const cleanPhone = signupData.mobileNumber.replace(/[\s\-()]/g, "");
    if (!signupData.mobileNumber.trim()) {
      errors.mobileNumber = "Mobile Number is required";
    } else if (!/^(\+?[0-9]{9,15})$/.test(cleanPhone)) {
      errors.mobileNumber = "Enter a valid mobile number (e.g. 0771234567)";
    }

    if (signupData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupData.email.trim())) {
      errors.email = "Enter a valid email address";
    }

    if (!signupData.province.trim()) {
      errors.province = "Please select province";
    }
    if (!signupData.district.trim()) {
      errors.district = "Please select district";
    }

    const countNum = Number(signupData.cattleCount);
    if (!signupData.cattleCount || isNaN(countNum) || countNum <= 0 || !Number.isInteger(countNum)) {
      errors.cattleCount = "Enter a valid positive number of cattle";
    }

    if (!signupData.password) {
      errors.password = "Password is required";
    } else if (signupData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (!signupData.confirmPassword) {
      errors.confirmPassword = "Confirm Password is required";
    } else if (signupData.password !== signupData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (!signupData.agreeTerms) {
      errors.agreeTerms = "You must agree to the Terms & Privacy Policy";
    }

    return errors;
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    const errors = validateSignup();

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      setError(firstError);
      showError(firstError);
      return;
    }

    setFieldErrors({});
    setError("");
    setIsLoading(true);

    try {
      await signupUser({
        name: signupData.fullName.trim(),
        phone: signupData.mobileNumber.trim(),
        email: signupData.email.trim() || undefined,
        farm_name: signupData.farmName.trim() || undefined,
        province: signupData.province.trim(),
        district: signupData.district.trim(),
        ds_division: signupData.dsDivision.trim() || undefined,
        gn_division: signupData.gnDivision.trim() || undefined,
        farm_address: signupData.farmAddress.trim() || undefined,
        cattle_count: parseInt(signupData.cattleCount, 10),
        farming_experience: signupData.farmingExperience.trim() || undefined,
        password: signupData.password,
      });

      showSuccess("Farmer account registered successfully! You can now log in.");
      setMode("login");
      setLoginIdentifier(signupData.mobileNumber || signupData.email);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || t("common.serverError") || "Registration failed";
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
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
          className="relative w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden z-10 my-auto max-h-[90vh] flex flex-col"
        >
          {/* Top Banner & Close Button */}
          <div className="relative bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 px-6 py-5 text-white text-center flex flex-col items-center justify-center overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white/80 hover:text-white hover:bg-black/40 transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center gap-1.5 mb-3">
              <img src={CsLogo} alt="CattleSense" className="h-9 w-9 object-contain shrink-0" />
              <div>
                <h3 className="text-lg font-extrabold tracking-tight text-white">CattleSense</h3>
                <p className="text-[11px] text-emerald-100/90 font-medium">Smart Cattle Health Platform</p>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-black/20 p-1 rounded-xl w-full max-w-xs">
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setFieldErrors({}); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mode === "login" ? "bg-white text-emerald-800 shadow-md" : "text-emerald-100/80 hover:text-white"
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => { setMode("signup"); setError(""); setFieldErrors({}); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mode === "signup" ? "bg-white text-emerald-800 shadow-md" : "text-emerald-100/80 hover:text-white"
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          {/* Form Content (Scrollable) */}
          <div className="p-6 sm:p-7 overflow-y-auto flex-1">
            {error && (
              <div className="mb-4 p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
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
                      {t("auth.mobileOrEmail") || "Mobile Number or Email"}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder={t("auth.mobileOrEmailPlaceholder") || "07X XXXXXXX or farmer@email.com"}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        {t("auth.password") || "Password"}
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
                        {t("auth.login") || "Sign In"}
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
                    {t("auth.signupTitle") || "Create Farmer Account"}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("auth.signupSubtitle") || "Register once and manage all cow records easily."}
                  </p>
                </div>

                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  {/* Section 1: Personal Details */}
                  <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-slate-200/60 dark:border-slate-700/50">
                      <div className="h-5 w-5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                        1
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {t("auth.personalDetails") || "Personal Details"}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {t("auth.fullName") || "Full Name"} *
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          required
                          value={signupData.fullName}
                          onChange={handleSignupChange}
                          placeholder={t("auth.fullNamePlaceholder") || "e.g. Kamal Perera"}
                          className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border ${
                            fieldErrors.fullName ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                          } rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
                        />
                        {fieldErrors.fullName && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.fullName}</p>}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {t("auth.mobileNumber") || "Mobile Number"} *
                        </label>
                        <input
                          type="tel"
                          name="mobileNumber"
                          required
                          value={signupData.mobileNumber}
                          onChange={handleSignupChange}
                          placeholder="0771234567"
                          className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border ${
                            fieldErrors.mobileNumber ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                          } rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
                        />
                        {fieldErrors.mobileNumber && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.mobileNumber}</p>}
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {t("auth.emailOptional") || "Email"}
                          </label>
                          <span className="text-[9px] text-slate-400">Optional</span>
                        </div>
                        <input
                          type="email"
                          name="email"
                          value={signupData.email}
                          onChange={handleSignupChange}
                          placeholder="farmer@example.com"
                          className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border ${
                            fieldErrors.email ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                          } rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
                        />
                        {fieldErrors.email && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.email}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Farm Details */}
                  <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-slate-200/60 dark:border-slate-700/50">
                      <div className="h-5 w-5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                        2
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {t("auth.farmDetails") || "Farm Details"}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Farm Name (Optional) */}
                      <div className="sm:col-span-2">
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {t("auth.farmName") || "Farm Name"}
                          </label>
                          <span className="text-[9px] text-slate-400">Optional</span>
                        </div>
                        <input
                          type="text"
                          name="farmName"
                          value={signupData.farmName}
                          onChange={handleSignupChange}
                          placeholder={t("auth.farmNamePlaceholder") || "e.g. Green Valley Farm (Optional)"}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      </div>

                      {/* Province (Required) */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {t("auth.province") || "Province"} *
                        </label>
                        <select
                          name="province"
                          required
                          value={signupData.province}
                          onChange={handleSignupChange}
                          className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border ${
                            fieldErrors.province ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                          } rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
                        >
                          <option value="">{t("auth.selectProvince") || "Select Province"}</option>
                          {Object.keys(PROVINCES_DISTRICTS).map((prov) => (
                            <option key={prov} value={prov}>
                              {prov}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.province && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.province}</p>}
                      </div>

                      {/* District (Required) */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {t("auth.district") || "District"} *
                        </label>
                        <select
                          name="district"
                          required
                          disabled={!signupData.province}
                          value={signupData.district}
                          onChange={handleSignupChange}
                          className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border ${
                            fieldErrors.district ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                          } rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50`}
                        >
                          <option value="">
                            {signupData.province ? (t("auth.selectDistrict") || "Select District") : "Select Province First"}
                          </option>
                          {availableDistricts.map((dist) => (
                            <option key={dist} value={dist}>
                              {dist}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.district && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.district}</p>}
                      </div>

                      {/* DS Division (Optional) */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {t("auth.dsDivision") || "DS Division"}
                          </label>
                          <span className="text-[9px] text-slate-400">Optional</span>
                        </div>
                        <input
                          type="text"
                          name="dsDivision"
                          value={signupData.dsDivision}
                          onChange={handleSignupChange}
                          placeholder="e.g. Nuwara Eliya (Optional)"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      </div>

                      {/* GN Division (Optional) */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {t("auth.gnDivision") || "GN Division"}
                          </label>
                          <span className="text-[9px] text-slate-400">Optional</span>
                        </div>
                        <input
                          type="text"
                          name="gnDivision"
                          value={signupData.gnDivision}
                          onChange={handleSignupChange}
                          placeholder="e.g. 450A Ambewela (Optional)"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      </div>

                      {/* Farm Address (Optional) */}
                      <div className="sm:col-span-2">
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {t("auth.farmAddress") || "Farm Address"}
                          </label>
                          <span className="text-[9px] text-slate-400">Optional</span>
                        </div>
                        <input
                          type="text"
                          name="farmAddress"
                          value={signupData.farmAddress}
                          onChange={handleSignupChange}
                          placeholder="e.g. 12, Dairy Farm Road, Ambewela (Optional)"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      </div>

                      {/* Number of Cattle (Required) */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {t("auth.cattleCount") || "Number of Cattle"} *
                        </label>
                        <input
                          type="number"
                          name="cattleCount"
                          min="1"
                          step="1"
                          required
                          value={signupData.cattleCount}
                          onChange={handleSignupChange}
                          placeholder="e.g. 15"
                          className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border ${
                            fieldErrors.cattleCount ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                          } rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
                        />
                        {fieldErrors.cattleCount && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.cattleCount}</p>}
                      </div>

                      {/* Farming Experience (Optional) */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {t("auth.farmingExperience") || "Farming Experience"}
                          </label>
                          <span className="text-[9px] text-slate-400">Optional</span>
                        </div>
                        <select
                          name="farmingExperience"
                          value={signupData.farmingExperience}
                          onChange={handleSignupChange}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        >
                          <option value="">{t("auth.selectExperience") || "Select experience (Optional)"}</option>
                          {FARMING_EXPERIENCE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Account Details */}
                  <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-slate-200/60 dark:border-slate-700/50">
                      <div className="h-5 w-5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                        3
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {t("auth.accountDetails") || "Account Details"}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {t("auth.password") || "Password"} (Min 8 chars) *
                        </label>
                        <div className="relative">
                          <input
                            type={showSignupPassword ? "text" : "password"}
                            name="password"
                            required
                            value={signupData.password}
                            onChange={handleSignupChange}
                            placeholder="••••••••"
                            className={`w-full px-3 py-2 pr-9 bg-white dark:bg-slate-900 border ${
                              fieldErrors.password ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                            } rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignupPassword((prev) => !prev)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showSignupPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        {fieldErrors.password && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.password}</p>}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {t("auth.confirmPassword") || "Confirm Password"} *
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            required
                            value={signupData.confirmPassword}
                            onChange={handleSignupChange}
                            placeholder="••••••••"
                            className={`w-full px-3 py-2 pr-9 bg-white dark:bg-slate-900 border ${
                              fieldErrors.confirmPassword ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                            } rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        {fieldErrors.confirmPassword && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.confirmPassword}</p>}
                      </div>

                      <div className="sm:col-span-2 pt-1">
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            name="agreeTerms"
                            required
                            checked={signupData.agreeTerms}
                            onChange={handleSignupChange}
                            className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                          />
                          <span className="text-[11px] text-slate-600 dark:text-slate-300">
                            {t("auth.agreeTerms") || "I agree to the Terms of Service & Privacy Policy"}
                          </span>
                        </label>
                        {fieldErrors.agreeTerms && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.agreeTerms}</p>}
                      </div>
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
                        {t("auth.signUp") || "Create Farmer Account"}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Footer switcher note */}
            <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
              {mode === "login" ? (
                <p>
                  Don't have an account?{" "}
                  <button
                    onClick={() => { setMode("signup"); setError(""); setFieldErrors({}); }}
                    className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Register as Farmer
                  </button>
                </p>
              ) : (
                <p>
                  {t("auth.alreadyRegistered") || "Already registered?"}{" "}
                  <button
                    onClick={() => { setMode("login"); setError(""); setFieldErrors({}); }}
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
