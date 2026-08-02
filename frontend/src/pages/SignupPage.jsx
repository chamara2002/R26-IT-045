import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowLeft,
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
      {/* Left Side - Clean Minimal Branding */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-700 via-teal-600 to-cyan-700 flex-col justify-center p-14 text-white relative overflow-hidden"
      >
        {/* Subtle background blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-200/10 rounded-full blur-3xl -ml-40 -mb-40 pointer-events-none" />

        <div className="relative z-10 max-w-sm">
          {/* Logo + App name */}
          <div className="flex items-center gap-4 mb-10">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center overflow-hidden shadow-lg">
              <img src={CsLogo} alt="CattleSense" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">CattleSense</h1>
              <p className="text-sm text-white/70">Cattle Health Platform</p>
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-4xl font-bold leading-snug mb-4">
            Join farmers who act early.
          </h2>
          <p className="text-white/75 text-base leading-relaxed mb-10">
            Create your free account and start checking your cattle's health, tracking milk, and getting clear advice — all in one place.
          </p>

          {/* 3 simple benefits */}
          <ul className="space-y-4">
            {[
              { icon: ShieldCheck,  text: 'Check for mastitis, FMD, lumpy skin & milk fever' },
              { icon: LineChart,    text: 'Track milk production and cow records easily' },
              { icon: CheckCircle2, text: 'Get clear steps on what to do next' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm text-white/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* Right Side - Form */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12"
      >
        <div className="w-full max-w-md">
          {/* Back to Home */}
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>

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
