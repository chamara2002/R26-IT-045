import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  MapPin,
  Compass,
  Hash,
  Award,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useI18n } from "../i18n/language-context";
import { signupUser } from "../services/api";
import { useToast } from "../hooks/useToast";
import PageWrapper from "../components/PageWrapper";
import CsLogo from "../assets/cs-logo.png";
import HeroCows from "../assets/hero-cows.jpg";

export const PROVINCES_DISTRICTS = {
  "Central": ["Kandy", "Matale", "Nuwara Eliya"],
  "Eastern": ["Ampara", "Batticaloa", "Trincomalee"],
  "Northern": ["Jaffna", "Kilinochchi", "Mannar", "Mullaitivu", "Vavuniya"],
  "North Central": ["Anuradhapura", "Polonnaruwa"],
  "North Western": ["Kurunegala", "Puttalam"],
  "Sabaragamuwa": ["Kegalle", "Ratnapura"],
  "Southern": ["Galle", "Hambantota", "Matara"],
  "Uva": ["Badulla", "Monaragala"],
  "Western": ["Colombo", "Gampaha", "Kalutara"],
};

export const FARMING_EXPERIENCE_OPTIONS = [
  "Less than 1 year",
  "1 - 3 years",
  "3 - 5 years",
  "5 - 10 years",
  "10+ years",
];

export default function SignupPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({
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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  const availableDistricts = formData.province ? PROVINCES_DISTRICTS[formData.province] || [] : [];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;

    setFormData((prev) => {
      const updated = { ...prev, [name]: val };
      if (name === "province") {
        updated.district = ""; // Reset district when province changes
      }
      return updated;
    });

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const errors = {};

    // 1. Personal Details
    if (!formData.fullName.trim()) {
      errors.fullName = "Full Name is required";
    }

    const cleanPhone = formData.mobileNumber.replace(/[\s\-()]/g, "");
    if (!formData.mobileNumber.trim()) {
      errors.mobileNumber = "Mobile Number is required";
    } else if (!/^(\+?[0-9]{9,15})$/.test(cleanPhone)) {
      errors.mobileNumber = "Enter a valid mobile number (e.g. 0771234567)";
    }

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Enter a valid email address";
    }

    // 2. Farm Details (Province, District, Number of Cattle are Required; others Optional)
    if (!formData.province.trim()) {
      errors.province = "Please select your province";
    }
    if (!formData.district.trim()) {
      errors.district = "Please select your district";
    }

    const countNum = Number(formData.cattleCount);
    if (!formData.cattleCount || isNaN(countNum) || countNum <= 0 || !Number.isInteger(countNum)) {
      errors.cattleCount = "Enter a valid positive number of cattle";
    }

    // 3. Account Details
    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = "Confirm Password is required";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (!formData.agreeTerms) {
      errors.agreeTerms = "You must agree to the Terms & Privacy Policy";
    }

    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validate();

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
        name: formData.fullName.trim(),
        phone: formData.mobileNumber.trim(),
        email: formData.email.trim() || undefined,
        farm_name: formData.farmName.trim() || undefined,
        province: formData.province.trim(),
        district: formData.district.trim(),
        ds_division: formData.dsDivision.trim() || undefined,
        gn_division: formData.gnDivision.trim() || undefined,
        farm_address: formData.farmAddress.trim() || undefined,
        cattle_count: parseInt(formData.cattleCount, 10),
        farming_experience: formData.farmingExperience.trim() || undefined,
        password: formData.password,
      });

      showSuccess("Farmer account registered successfully! Redirecting to login...");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || t("common.serverError") || "Registration failed";
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper className="min-h-screen relative flex items-center justify-center p-3 sm:p-6 lg:p-8 overflow-hidden bg-slate-950">
      {/* Landing Page Background Photo with Dark Vignette */}
      <div className="absolute inset-0 z-0">
        <img
          src={HeroCows}
          alt="CattleSense Farm Background"
          className="h-full w-full object-cover object-center scale-105 filter brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/85 to-slate-900/70 backdrop-blur-[2px]" />
      </div>

      {/* Main Glass Card Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 20 }}
        className="relative z-10 w-full max-w-5xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-white/10 overflow-hidden grid grid-cols-1 lg:grid-cols-12 max-h-[92vh] flex flex-col"
      >
        {/* Left Side - Clean & Minimal Branding */}
        <div className="lg:col-span-4 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 sm:p-8 text-white flex flex-col justify-between items-center text-center relative overflow-hidden">
          {/* Ambient lighting */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/15 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center my-auto py-4">
            {/* Logo */}
            <div className="flex flex-col items-center gap-2 mb-6">
              <img src={CsLogo} alt="CattleSense" className="h-9 w-9 object-contain shrink-0" />
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">CattleSense</h1>
                <p className="text-xs text-emerald-100/90 font-medium">Smart Cattle Health Platform</p>
              </div>
            </div>

            {/* Heading & Steps Overview */}
            <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2">
              Farmer Registration
            </h2>
            <p className="text-emerald-100/90 text-xs leading-relaxed mb-6 max-w-xs">
              Register your farm to monitor herd health, access smart AI disease detection, and track milk production records.
            </p>

            {/* Quick checklist */}
            <div className="w-full text-left space-y-2.5 bg-black/15 p-4 rounded-2xl border border-white/10 text-xs text-emerald-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
                <span>1. Personal & Contact Details</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
                <span>2. Farm & Location Profile</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
                <span>3. Secure Account Credentials</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-4 border-t border-white/20 text-[11px] text-emerald-100/80 font-medium w-full text-center">
            CattleSense • Sri Lanka Dairy Health
          </div>
        </div>

        {/* Right Side Form (Scrollable) */}
        <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto max-h-[85vh]">
          <div>
            {/* Top Navigation Row */}
            <div className="flex items-center justify-between mb-4">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
              <LanguageSwitcher />
            </div>

            {/* Header & Mode Switcher */}
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl w-full max-w-xs mb-4">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="flex-1 py-1.5 text-xs font-bold rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Log In
                </button>
                <button
                  type="button"
                  className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                >
                  Create Account
                </button>
              </div>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                {t("auth.signupTitle") || "Create Farmer Account"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("auth.signupSubtitle") || "Register once and manage all cow records easily."}
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-5 p-3.5 text-xs rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* ======================================================== */}
              {/* SECTION 1: PERSONAL DETAILS */}
              {/* ======================================================== */}
              <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/50">
                  <div className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t("auth.personalDetails") || "Personal Details"}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Full Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t("auth.fullName") || "Full Name"} <span className="text-emerald-600 dark:text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        name="fullName"
                        required
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder={t("auth.fullNamePlaceholder") || "e.g. Kamal Perera"}
                        className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border ${
                          fieldErrors.fullName ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                        } rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all`}
                      />
                    </div>
                    {fieldErrors.fullName && (
                      <p className="text-[11px] text-red-500 mt-1">{fieldErrors.fullName}</p>
                    )}
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t("auth.mobileNumber") || "Mobile Number"} <span className="text-emerald-600 dark:text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="tel"
                        name="mobileNumber"
                        required
                        value={formData.mobileNumber}
                        onChange={handleChange}
                        placeholder={t("auth.mobilePlaceholder") || "0771234567"}
                        className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border ${
                          fieldErrors.mobileNumber ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                        } rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all`}
                      />
                    </div>
                    {fieldErrors.mobileNumber && (
                      <p className="text-[11px] text-red-500 mt-1">{fieldErrors.mobileNumber}</p>
                    )}
                  </div>

                  {/* Email Address (Optional) */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {t("auth.emailOptional") || "Email Address"}
                      </label>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        Optional
                      </span>
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder={t("auth.emailPlaceholder") || "farmer@example.com (Optional)"}
                        className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border ${
                          fieldErrors.email ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                        } rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all`}
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className="text-[11px] text-red-500 mt-1">{fieldErrors.email}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* SECTION 2: FARM DETAILS */}
              {/* ======================================================== */}
              <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/50">
                  <div className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t("auth.farmDetails") || "Farm Details"}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Farm Name (Optional) */}
                  <div className="sm:col-span-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {t("auth.farmName") || "Farm Name"}
                      </label>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        Optional
                      </span>
                    </div>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        name="farmName"
                        value={formData.farmName}
                        onChange={handleChange}
                        placeholder={t("auth.farmNamePlaceholder") || "e.g. Green Valley Dairy Farm (Optional)"}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      />
                    </div>
                  </div>

                  {/* Province (Required) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t("auth.province") || "Province"} <span className="text-emerald-600 dark:text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <Compass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <select
                        name="province"
                        required
                        value={formData.province}
                        onChange={handleChange}
                        className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border ${
                          fieldErrors.province ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                        } rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all`}
                      >
                        <option value="">{t("auth.selectProvince") || "Select Province"}</option>
                        {Object.keys(PROVINCES_DISTRICTS).map((prov) => (
                          <option key={prov} value={prov}>
                            {prov} Province
                          </option>
                        ))}
                      </select>
                    </div>
                    {fieldErrors.province && (
                      <p className="text-[11px] text-red-500 mt-1">{fieldErrors.province}</p>
                    )}
                  </div>

                  {/* District (Required) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t("auth.district") || "District"} <span className="text-emerald-600 dark:text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <select
                        name="district"
                        required
                        disabled={!formData.province}
                        value={formData.district}
                        onChange={handleChange}
                        className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border ${
                          fieldErrors.district ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                        } rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <option value="">
                          {formData.province ? (t("auth.selectDistrict") || "Select District") : "Select Province First"}
                        </option>
                        {availableDistricts.map((dist) => (
                          <option key={dist} value={dist}>
                            {dist}
                          </option>
                        ))}
                      </select>
                    </div>
                    {fieldErrors.district && (
                      <p className="text-[11px] text-red-500 mt-1">{fieldErrors.district}</p>
                    )}
                  </div>

                  {/* DS Division (Optional) */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {t("auth.dsDivision") || "DS Division"}
                      </label>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        Optional
                      </span>
                    </div>
                    <input
                      type="text"
                      name="dsDivision"
                      value={formData.dsDivision}
                      onChange={handleChange}
                      placeholder={t("auth.dsDivisionPlaceholder") || "e.g. Nuwara Eliya (Optional)"}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>

                  {/* GN Division (Optional) */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {t("auth.gnDivision") || "GN Division"}
                      </label>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        Optional
                      </span>
                    </div>
                    <input
                      type="text"
                      name="gnDivision"
                      value={formData.gnDivision}
                      onChange={handleChange}
                      placeholder={t("auth.gnDivisionPlaceholder") || "e.g. 450A - Ambewela (Optional)"}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>

                  {/* Farm Address (Optional) */}
                  <div className="sm:col-span-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {t("auth.farmAddress") || "Farm Address"}
                      </label>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        Optional
                      </span>
                    </div>
                    <input
                      type="text"
                      name="farmAddress"
                      value={formData.farmAddress}
                      onChange={handleChange}
                      placeholder={t("auth.farmAddressPlaceholder") || "e.g. 12, Dairy Farm Road, Ambewela (Optional)"}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>

                  {/* Number of Cattle (Required) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t("auth.cattleCount") || "Number of Cattle"} <span className="text-emerald-600 dark:text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="number"
                        name="cattleCount"
                        min="1"
                        step="1"
                        required
                        value={formData.cattleCount}
                        onChange={handleChange}
                        placeholder={t("auth.cattleCountPlaceholder") || "e.g. 15"}
                        className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border ${
                          fieldErrors.cattleCount ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                        } rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all`}
                      />
                    </div>
                    {fieldErrors.cattleCount && (
                      <p className="text-[11px] text-red-500 mt-1">{fieldErrors.cattleCount}</p>
                    )}
                  </div>

                  {/* Farming Experience (Optional) */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {t("auth.farmingExperience") || "Farming Experience"}
                      </label>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        Optional
                      </span>
                    </div>
                    <div className="relative">
                      <Award className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <select
                        name="farmingExperience"
                        value={formData.farmingExperience}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      >
                        <option value="">{t("auth.selectExperience") || "Select experience level (Optional)"}</option>
                        {FARMING_EXPERIENCE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* SECTION 3: ACCOUNT DETAILS */}
              {/* ======================================================== */}
              <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/50">
                  <div className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t("auth.accountDetails") || "Account Details"}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t("auth.password") || "Password"} (Min 8 chars) <span className="text-emerald-600 dark:text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className={`w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border ${
                          fieldErrors.password ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                        } rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-[11px] text-red-500 mt-1">{fieldErrors.password}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t("auth.confirmPassword") || "Confirm Password"} <span className="text-emerald-600 dark:text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className={`w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border ${
                          fieldErrors.confirmPassword ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                        } rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="text-[11px] text-red-500 mt-1">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>

                  {/* Terms & Privacy Checkbox */}
                  <div className="sm:col-span-2 pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        name="agreeTerms"
                        required
                        checked={formData.agreeTerms}
                        onChange={handleChange}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        I agree to the{" "}
                        <button
                          type="button"
                          onClick={() => setTermsModalOpen(true)}
                          className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline"
                        >
                          Terms of Service & Privacy Policy
                        </button>{" "}
                        and consent to registering my farm records on CattleSense.
                      </span>
                    </label>
                    {fieldErrors.agreeTerms && (
                      <p className="text-[11px] text-red-500 mt-1">{fieldErrors.agreeTerms}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Registering Farmer Account...</span>
                  </>
                ) : (
                  <>
                    {t("auth.signUp") || "Create Farmer Account"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            {t("auth.alreadyRegistered") || "Already registered?"}{" "}
            <Link to="/login" className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
              Log in to your account
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Simple Terms Modal */}
      {termsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-4 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Terms of Service & Privacy Policy
              </h3>
            </div>
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 max-h-60 overflow-y-auto pr-2">
              <p>
                <strong>1. Data Confidentiality:</strong> CattleSense respects your privacy. Your farm location, cattle counts, and milk yields are stored securely and used solely for providing health monitoring and productivity insights.
              </p>
              <p>
                <strong>2. Health Assistance:</strong> AI health checks and mastitis assistance are decision-support tools. Please consult a qualified veterinary surgeon for acute cattle medical conditions.
              </p>
              <p>
                <strong>3. Account Responsibility:</strong> Keep your mobile login and credentials confidential.
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setTermsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Close & Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
