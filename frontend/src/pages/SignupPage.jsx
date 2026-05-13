import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Activity,
  LineChart,
  Sprout,
  Sparkles,
} from "lucide-react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useI18n } from "../i18n/language-context";
import { signupUser } from "../services/api";
import { useToast } from "../hooks/useToast";
import { Button, Input } from "../components/ui/index.jsx";
import PageWrapper from "../components/PageWrapper";
import CsLogo from "../assets/cs-logo.png";

export default function SignupPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const featureCards = [
    {
      icon: Activity,
      title: "Early detection workflow",
      description: "Move from symptoms to prediction with a simple guided flow.",
    },
    {
      icon: LineChart,
      title: "Milk and herd insights",
      description: "Keep production, health, and treatment history in one place.",
    },
    {
      icon: Sprout,
      title: "Built for daily farm use",
      description: "Designed for fast screening, quick decisions, and practical records.",
    },
  ];

  const overviewItems = [
    {
      icon: CheckCircle2,
      title: "Start with a clear workflow",
      text: "Create an account and move straight into guided health screening.",
    },
    {
      icon: LineChart,
      title: "Keep records in one place",
      text: "Store milk, herd, and disease history alongside each other.",
    },
    {
      icon: Sprout,
      title: "Use it every day",
      text: "Designed for quick access, fast decisions, and practical farm use.",
    },
  ];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) return "Name is required";
    if (!formData.email.trim()) return "Email is required";
    if (!formData.password.trim()) return "Password is required";
    if (formData.password.length < 8) return "Password must be at least 8 characters";
    if (formData.password !== formData.confirmPassword) return "Passwords do not match";
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      showError(validationError);
      return;
    }

    setError("");
    setIsLoading(true);
    try {
      await signupUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      showSuccess("Account created successfully! Redirecting to login...");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || t("common.serverError");
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper className="min-h-screen bg-white dark:bg-slate-900 flex">
      {/* Left Side - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-700 via-teal-600 to-cyan-700 flex-col justify-between p-12 text-white relative overflow-hidden"
      >
        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-[28rem] h-[28rem] bg-white/10 rounded-full blur-3xl -mr-56 -mt-56" />
        <div className="absolute bottom-0 left-0 w-[24rem] h-[24rem] bg-cyan-200/20 rounded-full blur-3xl -ml-44 -mb-44" />
        <div className="absolute left-12 top-16 w-24 h-24 border border-white/20 rounded-3xl rotate-12" />
        <div className="absolute right-14 bottom-24 w-28 h-28 border border-white/20 rounded-full" />

        <div className="relative z-10">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.7, type: "spring" }}
            className="mb-8 flex items-center gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl overflow-hidden">
                <img
                  src={CsLogo}
                  alt="CattleSense"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-white/15 backdrop-blur-sm border border-white/20 text-sm font-medium">
                <Activity className="h-4 w-4" />
                AI-powered Farm Assistant
              </div>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-5xl font-bold mb-4 leading-tight"
          >
            CattleSense
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-lg mb-8 text-white/90 max-w-xl leading-relaxed"
          >
            Machine learning based early detection of Cattle Diseases 
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="grid grid-cols-1 gap-3"
          >
            {featureCards.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + idx * 0.1, duration: 0.4 }}
                  className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{feature.title}</p>
                      <p className="text-sm text-white/85 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5 }}
          className="relative z-10 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-5"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-sm font-semibold">What signup unlocks</p>
              <p className="text-xs text-white/80">Everything you need to start screening and tracking cattle health</p>
            </div>
            <Sparkles className="h-5 w-5 text-amber-200" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {overviewItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-white/20 bg-white/10 p-4">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="font-semibold text-white mb-1">{item.title}</p>
                  <p className="text-sm text-white/85 leading-relaxed">{item.text}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>

      {/* Right Side - Form */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12"
      >
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 flex items-center gap-3 justify-center">
            <div className="h-10 w-10 rounded-lg bg-white shadow-sm ring-1 ring-emerald-100 overflow-hidden flex items-center justify-center">
              <img src={CsLogo} alt="CattleSense" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">CattleSense</h1>
          </div>

          {/* Language Switcher */}
          <div className="mb-8 flex justify-end">
            <LanguageSwitcher />
          </div>

          {/* Form Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {t("auth.signupTitle")}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {t("auth.signupSubtitle")}
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-5"
            onSubmit={handleSubmit}
          >
            <Input
              label={t("auth.fullName")}
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t("auth.fullNamePlaceholder")}
              icon={User}
            />

            <Input
              label={t("auth.email")}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t("auth.emailPlaceholder")}
              icon={Mail}
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("auth.password")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={t("auth.passwordMinPlaceholder") || "At least 8 characters"}
                  className="w-full px-4 py-2.5 pl-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 dark:focus:ring-offset-slate-900 transition-all duration-200"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  className="w-full px-4 py-2.5 pl-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 dark:focus:ring-offset-slate-900 transition-all duration-200"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              >
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  {error}
                </p>
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              isLoading={isLoading}
              className="w-full gap-2"
              size="lg"
            >
              {isLoading ? t("common.pleaseWait") : "Create Account"}
              {!isLoading && <ArrowRight className="h-5 w-5" />}
            </Button>
          </motion.form>

          {/* Login Link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-center text-slate-600 dark:text-slate-400"
          >
            {t("auth.alreadyRegistered")}{" "}
            <Link
              to="/login"
              className="font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              {t("auth.login")}
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </PageWrapper>
  );
}
